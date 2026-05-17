/**
 * Text utilities shared by all PDF generators.
 *
 * - sanitizePdfText: strip non-Latin-1 (Helvetica only supports Latin-1) and normalize bullets / dashes
 * - splitDescriptionLines / measureDescriptionHeight / renderDescriptionLines: render multi-line description
 *   cells preserving dashes, numbering, and blank-line spacing.
 * - formatDate, numberToWords: invoice / receipt / quotation formatting helpers.
 */
import type jsPDF from "jspdf"
import { DESC_BLANK_LINE_GAP, DESC_LINE_HEIGHT } from "./constants"

export function sanitizePdfText(text: string): string {
  return text
    // Zero-width / invisible characters -> remove entirely
    .replace(/[​‌‍﻿]/g, "")
    .replace(/[⁠⁡⁢⁣]/g, "")
    .replace(/[­]/g, "")
    // Unicode spaces -> normal ASCII space
    .replace(/[ - ]/g, " ")
    .replace(/ /g, " ")
    .replace(/ /g, " ")
    .replace(/　/g, " ")
    .replace(/ /g, " ")
    // Bullet-like characters -> ASCII bullet
    .replace(/[•‣⁃⦁●◦∙]/g, "·")
    // Cross / check marks
    .replace(/[✖✗✘]/g, "x")
    .replace(/[✓✔]/g, "v")
    .replace(/✅/g, "[OK]")
    .replace(/❌/g, "[X]")
    // Arrows
    .replace(/[←]/g, "<-")
    .replace(/[→]/g, "->")
    .replace(/[↔]/g, "<->")
    // Typographic marks
    .replace(/—/g, "--")
    .replace(/–/g, "-")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, "...")
    .replace(/‑/g, "-")
    // Misc symbols
    .replace(/®/g, "(R)")
    .replace(/™/g, "(TM)")
    .replace(/©/g, "(C)")
    .replace(/[^\x00-\xFF]/g, "")
}

export function splitDescriptionLines(description: string): string[] {
  return sanitizePdfText(description).split("\n").map((line) => line.trimEnd())
}

export function measureDescriptionHeight(
  doc: jsPDF,
  lines: string[],
  cellWidth: number,
): number {
  let height = 0
  for (const line of lines) {
    if (line.length === 0) {
      height += DESC_BLANK_LINE_GAP
    } else {
      const wrapped = doc.splitTextToSize(line, cellWidth)
      height += wrapped.length * DESC_LINE_HEIGHT
    }
  }
  return height
}

export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function numberToWords(num: number): string {
  const ones = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
    "SEVENTEEN", "EIGHTEEN", "NINETEEN",
  ]
  const tens = [
    "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY",
  ]

  function convertHundreds(n: number): string {
    let result = ""
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " HUNDRED"
      n %= 100
      if (n > 0) result += " "
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)]
      if (n % 10 > 0) result += " " + ones[n % 10]
    } else if (n > 0) {
      result += ones[n]
    }
    return result
  }

  if (num === 0) return "ZERO"
  const wholePart = Math.floor(num)
  const decimalPart = Math.round((num - wholePart) * 100)
  let words = ""

  if (wholePart >= 1_000_000) {
    const millions = Math.floor(wholePart / 1_000_000)
    words += convertHundreds(millions) + " MILLION"
    const remainder = wholePart % 1_000_000
    if (remainder > 0) words += " "
    if (remainder >= 1000) {
      const thousands = Math.floor(remainder / 1000)
      words += convertHundreds(thousands) + " THOUSAND"
      const hundreds = remainder % 1000
      if (hundreds > 0) words += " " + convertHundreds(hundreds)
    } else {
      words += convertHundreds(remainder)
    }
  } else if (wholePart >= 1000) {
    const thousands = Math.floor(wholePart / 1000)
    words += convertHundreds(thousands) + " THOUSAND"
    const hundreds = wholePart % 1000
    if (hundreds > 0) words += " " + convertHundreds(hundreds)
  } else {
    words = convertHundreds(wholePart)
  }

  if (decimalPart > 0) {
    words += " AND " + convertHundreds(decimalPart) + " CENTS"
  }
  return words
}

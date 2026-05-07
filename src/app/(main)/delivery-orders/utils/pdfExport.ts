import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatNumber } from "@/lib/format-number"
import { getDeliveryOrderFullById, type FullDeliveryOrder } from "../action"

const LOGO_PATH = "public/images/mainlogo.png"
const LOGO_PDF_PATH = "public/images/mainlogo-pdf.png"
const LOGO_PDF_MAX_WIDTH = 250

async function getLogoBase64(): Promise<string | null> {
  if (typeof window === "undefined") {
    try {
      const path = await import("path")
      const fs = await import("fs")
      const cwd = process.cwd()
      const pdfPath = path.join(cwd, LOGO_PDF_PATH)
      const mainPath = path.join(cwd, LOGO_PATH)
      const pathToRead = fs.existsSync(pdfPath) ? pdfPath : mainPath
      const buf = fs.readFileSync(pathToRead)
      return `data:image/png;base64,${buf.toString("base64")}`
    } catch {
      return null
    }
  }
  try {
    const res = await fetch("/images/mainlogo.png")
    const blob = await res.blob()
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
    if (!dataUrl) return null
    return await resizeImageDataUrlForPdf(dataUrl, LOGO_PDF_MAX_WIDTH)
  } catch {
    return null
  }
}

function resizeImageDataUrlForPdf(dataUrl: string, maxWidth: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w <= maxWidth) return resolve(dataUrl)
      const canvas = document.createElement("canvas")
      const scale = maxWidth / w
      canvas.width = maxWidth
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      try {
        resolve(canvas.toDataURL("image/png"))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

const TERMS_AND_CONDITIONS: Array<{ heading: string; body: string }> = [
  {
    heading: "1. Ownership, Usage Rights, and Creator's Rights",
    body: "All photographs captured by ASPIAL PRODUCTION SDN BHD remain the sole property of the company. Clients are strictly prohibited from selling or utilizing the photographs in contests without prior written consent from ASPIAL PRODUCTION SDN BHD. ASPIAL PRODUCTION SDN BHD reserves the right to employ the photographs/video for advertising, display, website and internet promotion, photographic contests, and any other marketing endeavours deemed appropriate by the company. ASPIAL PRODUCTION SDN BHD retains the rights to the intellectual property created during the provision of services, subject to the terms agreed upon in this agreement.",
  },
  {
    heading: "2. Liability, Payment, and Confidentiality",
    body: "ASPIAL PRODUCTION SDN BHD shall not be held liable for any form of loss, damage, or expenses incurred during the photography process or the entirety of the project, including but not limited to indirect or consequential loss, hardware malfunctions, manpower, equipment, scheduling, etc. The initial payment is required to secure the reservation of services and must be remitted upon booking. Confirmed packages are non-refundable, non-exchangeable, and non-transferable. Both parties commit to maintaining the confidentiality of proprietary or sensitive information exchanged during the project. Confidentiality obligations extend beyond the project duration and remain in effect indefinitely, except as required by law or with the express written consent of both parties.",
  },
  {
    heading: "3. Cancellation, Refunds, and Acceptance",
    body: "Clients acknowledge that once the project plan/solution is confirmed, significant resources, including manpower, equipment, and scheduling, are allocated accordingly, rendering cancellation impossible. Payments made are non-refundable. By initiating the first payment, the Client confirms understanding and agreement to comply with these terms and conditions.",
  },
]

const PAYMENT_INFO = {
  heading: "4. Payment Information",
  lines: [
    "Bank: Public Bank Berhad",
    "Account No: 321-9794-528",
    "Account Name: ASPIAL PRODUCTION SDN BHD",
  ],
}

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: { finalY: number }
  }
}

function numberToWords(num: number): string {
  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
    "SEVENTEEN", "EIGHTEEN", "NINETEEN"]
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"]

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
  if (decimalPart > 0) words += " AND " + convertHundreds(decimalPart) + " CENTS"
  return words
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}/${date.getFullYear()}`
}

const PRIMARY_COLOR: [number, number, number] = [32, 47, 33]
const WHITE: [number, number, number] = [255, 255, 255]
const BLACK: [number, number, number] = [0, 0, 0]
const HEADER_HEIGHT = 24
const LOGO_HEADER_WIDTH = 38
const LOGO_HEADER_HEIGHT = 16
const CONTENT_START_Y = 30
const INFO_BOX_HEIGHT = 40
const INFO_BOX_START_Y = CONTENT_START_Y
const CONTENT_AFTER_INFO_BOX_Y = CONTENT_START_Y + INFO_BOX_HEIGHT + 8
const DESC_LINE_HEIGHT = 4
const DESC_BLANK_LINE_GAP = 3

function sanitizePdfText(text: string): string {
  return text
    .replace(/[​‌‍﻿]/g, "")
    .replace(/[⁠⁡⁢⁣]/g, "")
    .replace(/[­]/g, "")
    .replace(/[ - ]/g, " ")
    .replace(/[  　 ]/g, " ")
    .replace(/[•‣⁃⦁●◦∙]/g, "·")
    .replace(/[✖✗✘]/g, "x")
    .replace(/[✓✔]/g, "v")
    .replace(/—/g, "--")
    .replace(/–/g, "-")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, "...")
    .replace(/‑/g, "-")
    .replace(/[^\x00-\xFF]/g, "")
}

function splitDescriptionLines(description: string): string[] {
  return sanitizePdfText(description).split("\n").map((line) => line.trimEnd())
}

function measureDescriptionHeight(doc: jsPDF, lines: string[], cellWidth: number): number {
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

type ClientInfoPdf = {
  name: string
  company: string
  phone: string
  email: string
  address: string
  companyRegistrationNumber?: string
  ic?: string
}

type HeaderInfo = {
  deliveryOrderNumber: string
  deliveryOrderDate: string
  advisorName: string
  clientInfo: ClientInfoPdf
}

function addPageHeader(doc: jsPDF, logoBase64: string | null) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  doc.setFillColor(...PRIMARY_COLOR)
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F")
  doc.setTextColor(...WHITE)

  const logoStartX = margin
  const logoY = 4
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", logoStartX, logoY, LOGO_HEADER_WIDTH, LOGO_HEADER_HEIGHT, "logo")
    } catch {
      // ignore
    }
  }

  const textStartX = logoStartX + LOGO_HEADER_WIDTH + 6
  const textWidth = pageWidth - textStartX - margin
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  let headerY = 7
  const companyLines = [
    "ASPIAL PRODUCTION SDN BHD (202001019933 (1376253-A))",
    "2A, JALAN DATO' ABU BAKAR, JALAN 16/1, SECTION 16, 46350 PETALING JAYA, SELANGOR",
    "Phone: 016-5323453   Fax: 03-78770323   Email: aspialproduction@gmail.com",
  ]
  for (const text of companyLines) {
    const wrapped = doc.splitTextToSize(text, textWidth)
    for (const line of wrapped) {
      if (headerY > HEADER_HEIGHT - 3) break
      doc.text(line, textStartX, headerY)
      headerY += 5
    }
  }
  doc.setTextColor(...BLACK)
}

function addInfoBox(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  info: HeaderInfo,
) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const { deliveryOrderNumber, deliveryOrderDate, advisorName, clientInfo } = info

  doc.setFillColor(255, 255, 255)
  doc.rect(margin, INFO_BOX_START_Y, pageWidth - 2 * margin, INFO_BOX_HEIGHT, "F")

  let leftY = INFO_BOX_START_Y + 6

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(...BLACK)
  doc.text("DELIVERY ORDER", margin + 3, leftY)

  // Right-side header — left-aligned block in the right half
  const rightLineHeight = 5
  let rightY = leftY
  const labelX = pageWidth / 2 + 25
  const colonX = labelX + 22
  const valueX = colonX + 4
  const maxValueWidth = pageWidth - margin - valueX

  doc.setFontSize(9)
  const rightRows: [string, string][] = [
    ["NO", deliveryOrderNumber],
    ["DATE", deliveryOrderDate],
    ["ADVISOR", advisorName],
    ["PAGE NO", `${pageNumber} of ${totalPages}`],
  ]
  for (const [label, value] of rightRows) {
    doc.setFont("helvetica", "normal")
    doc.text(label, labelX, rightY)
    doc.text(":", colonX, rightY)
    const wrapped = doc.splitTextToSize(value, maxValueWidth) as string[]
    for (const line of wrapped) {
      doc.text(line, valueX, rightY)
      rightY += rightLineHeight
    }
  }

  leftY += 6
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("Bill To :", margin + 3, leftY)
  doc.setFont("helvetica", "normal")
  leftY += 4

  if (clientInfo.company) {
    doc.setFont("helvetica", "bold")
    doc.text(clientInfo.company, margin + 3, leftY)
    doc.setFont("helvetica", "normal")
    leftY += 4
  }
  if (clientInfo.companyRegistrationNumber) {
    doc.text(clientInfo.companyRegistrationNumber, margin + 3, leftY)
    leftY += 4
  }
  if (clientInfo.address) {
    const addrLines = doc.splitTextToSize(clientInfo.address, (pageWidth / 2) - margin)
    for (const line of addrLines) {
      doc.text(line, margin + 3, leftY)
      leftY += 4
    }
  }
  if (clientInfo.name) {
    doc.text(`ATTN TO : ${clientInfo.name}`, margin + 3, leftY)
    leftY += 4
  }
  if (clientInfo.phone) {
    doc.text(`TEL NO : ${clientInfo.phone}`, margin + 3, leftY)
    leftY += 4
  }
  if (clientInfo.email) {
    doc.text(`EMAIL : ${clientInfo.email}`, margin + 3, leftY)
  }

  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.5)
  doc.line(margin, INFO_BOX_START_Y + INFO_BOX_HEIGHT, pageWidth - margin, INFO_BOX_START_Y + INFO_BOX_HEIGHT)
}

function addTermsAndConditions(
  doc: jsPDF,
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  logoBase64: string | null,
  info: HeaderInfo,
): number {
  const contentWidth = pageWidth - 2 * margin
  let currentY = startY
  currentY += 6

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...BLACK)
  doc.text("Terms And Conditions :", margin, currentY)
  currentY += 5

  const addNewPage = () => {
    doc.addPage()
    const total = doc.getNumberOfPages()
    addPageHeader(doc, logoBase64)
    addInfoBox(doc, total, total, info)
    return CONTENT_AFTER_INFO_BOX_Y
  }

  const HEADING_FONT = 9
  const BODY_FONT = 8

  for (const tc of TERMS_AND_CONDITIONS) {
    if (currentY > pageHeight - 30) currentY = addNewPage()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(HEADING_FONT)
    doc.text(tc.heading, margin, currentY)
    currentY += 4

    doc.setFont("helvetica", "normal")
    doc.setFontSize(BODY_FONT)
    const lines = doc.splitTextToSize(tc.body, contentWidth)
    for (const line of lines) {
      if (currentY > pageHeight - 25) {
        currentY = addNewPage()
        doc.setFont("helvetica", "normal")
        doc.setFontSize(BODY_FONT)
      }
      doc.text(line, margin, currentY)
      currentY += 4
    }
    currentY += 2
  }

  if (currentY > pageHeight - 30) currentY = addNewPage()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(HEADING_FONT)
  doc.text(PAYMENT_INFO.heading, margin, currentY)
  currentY += 4
  doc.setFont("helvetica", "normal")
  doc.setFontSize(BODY_FONT)
  for (const line of PAYMENT_INFO.lines) {
    if (currentY > pageHeight - 25) currentY = addNewPage()
    doc.text(line, margin, currentY)
    currentY += 4
  }

  // Authorised signature on the right of last page
  const lastPage = doc.getNumberOfPages()
  doc.setPage(lastPage)
  const sigY = pageHeight - 15
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Authorised Signature", pageWidth - margin, sigY, { align: "right" })
  doc.setFontSize(9)
  doc.text("ASPIAL PRODUCTION SDN BHD", pageWidth - margin, sigY + 5, { align: "right" })

  return currentY
}

async function buildDeliveryOrderPdf(order: FullDeliveryOrder): Promise<jsPDF> {
  const doc = new jsPDF()
  const logoBase64 = await getLogoBase64()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  const subtotal = order.totalAmount
  const final = order.finalAmount
  const discountAmount = Math.max(0, subtotal - final)

  const advisorName =
    order.advisors.length > 0
      ? order.advisors
          .map((a) => `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim())
          .join(", ")
      : `${order.createdBy?.firstName ?? ""} ${order.createdBy?.lastName ?? ""}`.trim() || "ADMIN"
  const clientInfo: ClientInfoPdf = {
    name: order.client?.name ?? "",
    company: order.client?.company ?? "",
    phone: order.client?.phone ?? "",
    email: order.client?.email ?? "",
    address: order.client?.address ?? "",
    companyRegistrationNumber: order.client?.companyRegistrationNumber ?? undefined,
    ic: order.client?.ic ?? undefined,
  }

  const info: HeaderInfo = {
    deliveryOrderNumber: order.deliveryOrderNumber,
    deliveryOrderDate: formatDate(new Date(order.deliveryOrderDate)),
    advisorName,
    clientInfo,
  }

  addPageHeader(doc, logoBase64)
  addInfoBox(doc, 1, 1, info)

  let currentY = CONTENT_AFTER_INFO_BOX_Y

  // Build table data
  const allServices = order.services.map((s) => ({
    name: sanitizePdfText(s.service.name),
    description: sanitizePdfText(s.descriptionOverride || ""),
    price: s.price,
    quantity: s.quantity,
  }))

  // Column widths (15 units total): No 1, Description 6, Package 2, Price/Package 2, Discount 2, Total 2
  const cw = (n: number) => ((pageWidth - 2 * margin) / 15) * n
  const descCellWidth = cw(6) - 6

  const tableData: string[][] = []
  const rowHeights: number[] = []
  allServices.forEach((service, index) => {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    const nameLines = doc.splitTextToSize(service.name, descCellWidth)
    let contentHeight = nameLines.length * DESC_LINE_HEIGHT
    if (service.description) {
      contentHeight += 2
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      const descLines = splitDescriptionLines(service.description)
      contentHeight += measureDescriptionHeight(doc, descLines, descCellWidth)
    }
    const rowHeight = Math.max(20, contentHeight + 10)
    rowHeights.push(rowHeight)
    const cellText = service.description ? `${service.name}\n${service.description}` : service.name
    tableData.push([
      String(index + 1),
      cellText,
      formatNumber(service.quantity),
      formatNumber(service.price),
      formatNumber(0),
      formatNumber(service.price * service.quantity),
    ])
  })

  if (tableData.length === 0) {
    tableData.push(["1", "", "0.00", formatNumber(0), formatNumber(0), formatNumber(0)])
    rowHeights.push(15)
  }

  const rowPageOffsets = new Map<number, number>()

  autoTable(doc, {
    startY: currentY,
    head: [["No", "Description", "Package", "Price/Package", "Discount", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: WHITE,
      fontSize: 9,
      fontStyle: "bold",
      lineWidth: 0.1,
    },
    bodyStyles: { fontSize: 9, textColor: BLACK, lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: cw(1), halign: "center" },
      1: { cellWidth: cw(6), cellPadding: { top: 5, right: 3, bottom: 5, left: 3 }, valign: "top" },
      2: { cellWidth: cw(2), halign: "right" },
      3: { cellWidth: cw(2), halign: "right" },
      4: { cellWidth: cw(2), halign: "right" },
      5: { cellWidth: cw(2), halign: "right" },
    },
    margin: { left: margin, right: margin, top: CONTENT_AFTER_INFO_BOX_Y, bottom: 25 },
    styles: { cellPadding: 3, lineWidth: 0.1, lineColor: [0, 0, 0], overflow: "linebreak" },
    didParseCell: (data: any) => {
      if (data.row.index >= 0 && data.row.section === "body" && rowHeights[data.row.index]) {
        data.cell.minHeight = rowHeights[data.row.index]
      }
    },
    willDrawCell: (data: any) => {
      if (data.column.index === 1 && data.row.index >= 0 && data.row.section === "body") {
        data.cell.text = []
      }
    },
    didDrawCell: (data: any) => {
      if (data.column.index === 1 && data.row.index >= 0 && data.row.section === "body") {
        const idx = data.row.index
        const service = allServices[idx]
        if (!service) return
        const cellWidth = data.cell.width - 6
        const x = data.cell.x + 3
        const topPad = 5
        const botPad = 2
        let renderY = data.cell.y + topPad
        const maxRenderY = data.cell.y + data.cell.height - botPad
        const contentOffset = rowPageOffsets.get(idx) || 0
        let virtualY = 0
        let lastRenderedBottom = contentOffset

        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(...BLACK)
        const nameLines = doc.splitTextToSize(service.name, cellWidth)
        for (const line of nameLines) {
          const lineBottom = virtualY + DESC_LINE_HEIGHT
          if (virtualY >= contentOffset && renderY <= maxRenderY) {
            doc.text(line, x, renderY)
            renderY += DESC_LINE_HEIGHT
            lastRenderedBottom = lineBottom
          }
          virtualY = lineBottom
        }

        if (service.description) {
          const gapBottom = virtualY + 2
          if (virtualY >= contentOffset && renderY <= maxRenderY) {
            renderY += 2
            lastRenderedBottom = gapBottom
          } else if (virtualY < contentOffset && gapBottom > contentOffset && renderY <= maxRenderY) {
            renderY += gapBottom - contentOffset
            lastRenderedBottom = gapBottom
          }
          virtualY = gapBottom

          doc.setFont("helvetica", "normal")
          doc.setFontSize(9)
          const descLines = splitDescriptionLines(service.description)
          for (const dLine of descLines) {
            if (dLine.length === 0) {
              const blankBottom = virtualY + DESC_BLANK_LINE_GAP
              if (virtualY >= contentOffset && renderY <= maxRenderY) {
                renderY += DESC_BLANK_LINE_GAP
                lastRenderedBottom = blankBottom
              } else if (virtualY < contentOffset && blankBottom > contentOffset && renderY <= maxRenderY) {
                renderY += blankBottom - contentOffset
                lastRenderedBottom = blankBottom
              }
              virtualY = blankBottom
              continue
            }
            const wrapped = doc.splitTextToSize(dLine, cellWidth)
            for (const wl of wrapped) {
              const lineBottom = virtualY + DESC_LINE_HEIGHT
              if (virtualY >= contentOffset && renderY <= maxRenderY) {
                doc.text(wl, x, renderY)
                renderY += DESC_LINE_HEIGHT
                lastRenderedBottom = lineBottom
              }
              virtualY = lineBottom
            }
          }
        }

        rowPageOffsets.set(idx, lastRenderedBottom)
      }
    },
    didDrawPage: (data: any) => {
      const total = doc.getNumberOfPages()
      addPageHeader(doc, logoBase64)
      addInfoBox(doc, data.pageNumber, total, info)
    },
  })

  currentY = (doc.lastAutoTable?.finalY ?? currentY) + 4

  // Horizontal line + amount-in-words / total
  if (currentY > pageHeight - 60) {
    doc.addPage()
    addPageHeader(doc, logoBase64)
    addInfoBox(doc, doc.getNumberOfPages(), doc.getNumberOfPages(), info)
    currentY = CONTENT_AFTER_INFO_BOX_Y
  }
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.4)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 5

  // Total label + amount on the right
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("Total", pageWidth - margin - 25, currentY, { align: "right" })
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text(formatNumber(final), pageWidth - margin, currentY, { align: "right" })
  currentY += 5

  // Amount in words on the left
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  const wordsText = `RINGGIT MALAYSIA : ${numberToWords(final)} ONLY`
  const wordsLines = doc.splitTextToSize(wordsText, pageWidth - 2 * margin - 60)
  for (const wLine of wordsLines) {
    doc.text(wLine, margin, currentY)
    currentY += 4
  }
  currentY += 1

  if (discountAmount > 0) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Discount applied: RM${formatNumber(discountAmount)}`, margin, currentY)
    currentY += 5
  }

  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 4

  currentY = addTermsAndConditions(doc, currentY, margin, pageWidth, pageHeight, logoBase64, info)

  // Final pass: rewrite header + page numbers on every page
  const finalTotalPages = doc.getNumberOfPages()
  for (let i = 1; i <= finalTotalPages; i++) {
    doc.setPage(i)
    addPageHeader(doc, logoBase64)
    addInfoBox(doc, i, finalTotalPages, info)
  }

  return doc
}

export async function generateDeliveryOrderPDFWithFetch(deliveryOrderId: string): Promise<void> {
  const order = await getDeliveryOrderFullById(deliveryOrderId)
  if (!order) throw new Error("Delivery order not found")
  const doc = await buildDeliveryOrderPdf(order)
  const fileName = `delivery-order-${order.deliveryOrderNumber}-${
    order.client?.company?.replace(/\s+/g, "-") || "client"
  }.pdf`
  doc.save(fileName)
}

export async function generateDeliveryOrderPDFBase64FromFull(
  full: FullDeliveryOrder,
): Promise<string> {
  const doc = await buildDeliveryOrderPdf(full)
  return doc.output("datauristring").split(",")[1]
}

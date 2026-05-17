/**
 * Standalone preview script — renders a sample PDF using the shared page chrome
 * + table so the new design can be eyeballed without a running app / DB.
 *
 * Run: npx tsx scripts/preview-pdf-design.ts <out-dir>
 *      (writes quotation.pdf, invoice.pdf, receipt.pdf, delivery-order.pdf)
 */
import fs from "node:fs"
import path from "node:path"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import {
  addPageChrome,
  BLACK,
  CONTENT_AFTER_INFO_BOX_Y,
  FOOTER_HEIGHT,
  formatDate,
  getContentMaxY,
  getLogoBase64,
  MARGIN,
  numberToWords,
  PRIMARY_DARK_GREEN,
  TERMS_AND_CONDITIONS,
  WHITE,
  type ClientInfoPdf,
  type InfoBoxOpts,
} from "../src/lib/pdf"

const outDir = process.argv[2] || "/tmp"
fs.mkdirSync(outDir, { recursive: true })

const clientInfo: ClientInfoPdf = {
  name: "Kinnix Chan",
  company: "Efix Digital Sdn Bhd",
  phone: "013-3023333",
  email: "kinnix.chan@efix.my",
  companyRegistrationNumber: "N/A",
  ic: undefined,
}

const sampleRows = [
  ["1", "Extra Photo\n- Additional Photo\n- Includes Professional Retouching", "4.00", "200.00", "800.00"],
  ["2", "Branding Page\n- 1 Branding Page Design", "1.00", "500.00", "500.00"],
]

async function renderDoc(title: string, docNumberLabel: string, docNumber: string, extras?: { label: string; value: string }[]) {
  const doc = new jsPDF()
  const logoBase64 = await getLogoBase64()
  const pageWidth = doc.internal.pageSize.getWidth()

  const buildInfoOpts = (pageNumber: number, totalPages: number): InfoBoxOpts => ({
    title,
    docNumberLabel,
    docNumber,
    date: formatDate(new Date("2026-04-30")),
    advisorName: "Kelsey Seow",
    pageNumber,
    totalPages,
    clientInfo,
    extras,
  })

  addPageChrome(doc, logoBase64, buildInfoOpts(1, 1))

  autoTable(doc, {
    startY: CONTENT_AFTER_INFO_BOX_Y,
    head: [["No", "Description", "Package", "Price/Package", "Total"]],
    body: sampleRows,
    theme: "grid",
    headStyles: {
      fillColor: PRIMARY_DARK_GREEN,
      textColor: WHITE,
      fontSize: 9,
      fontStyle: "bold",
      lineWidth: 0.1,
    },
    bodyStyles: { fontSize: 9, textColor: BLACK, lineWidth: 0.1, minCellHeight: 15 },
    columnStyles: {
      0: { cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 1, halign: "center" },
      1: { cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 7 },
      2: { cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 2, halign: "right" },
      3: { cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 3, halign: "right" },
      4: { cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 2, halign: "right" },
    },
    margin: { left: MARGIN, right: MARGIN, top: CONTENT_AFTER_INFO_BOX_Y, bottom: FOOTER_HEIGHT + 4 },
    styles: { cellPadding: 3, lineWidth: 0.1, lineColor: [0, 0, 0], overflow: "linebreak" },
    didDrawPage: (data: any) => {
      addPageChrome(doc, logoBase64, buildInfoOpts(data.pageNumber, doc.getNumberOfPages()))
    },
  })

  let currentY = (doc.lastAutoTable?.finalY ?? CONTENT_AFTER_INFO_BOX_Y) + 10
  const contentMaxY = getContentMaxY(doc)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("TOTAL ORIGINAL PRICE:", MARGIN, currentY)
  doc.text("RM1,300.00", pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 7
  doc.text("TOTAL DISCOUNT:", MARGIN, currentY)
  doc.text("RM500.00", pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 7
  doc.text("AFTER DISCOUNT PRICE:", MARGIN, currentY)
  doc.text("RM800.00", pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 7
  doc.text(`RINGGIT MALAYSIA : ${numberToWords(800)} ONLY`, MARGIN, currentY)
  currentY += 10

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Terms And Conditions", MARGIN, currentY)
  currentY += 4
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  for (const paragraph of TERMS_AND_CONDITIONS) {
    if (currentY > contentMaxY) break
    const lines = doc.splitTextToSize(paragraph, pageWidth - 2 * MARGIN)
    for (const line of lines) {
      if (currentY > contentMaxY) break
      doc.text(line, MARGIN, currentY)
      currentY += 3.5
    }
    currentY += 2
  }

  // Final pass: refresh chrome with total page count
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    addPageChrome(doc, logoBase64, buildInfoOpts(i, total))
  }

  const arrayBuf = doc.output("arraybuffer") as ArrayBuffer
  const outPath = path.join(outDir, `${title.toLowerCase().replace(/\s+/g, "-")}.pdf`)
  fs.writeFileSync(outPath, Buffer.from(arrayBuf))
  console.log(`wrote ${outPath}`)
}

;(async () => {
  await renderDoc("QUOTATION", "QUOTATION NO", "QUO-202605001")
  await renderDoc("INVOICE", "INVOICE NO", "INV-202605001", [
    { label: "PHOTOGRAPHER", value: "Jane Doe" },
  ])
  await renderDoc("RECEIPT", "RECEIPT NO", "REC-202605001", [
    { label: "PAYMENT METHOD", value: "BANK TRANSFER" },
  ])
  await renderDoc("DELIVERY ORDER", "DELIVERY ORDER NO", "DO-202605001")
})()

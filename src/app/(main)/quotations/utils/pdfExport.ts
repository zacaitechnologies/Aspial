import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatNumber } from "@/lib/format-number"
import {
  addPageChrome,
  BLACK,
  DESC_BLANK_LINE_GAP,
  DESC_LINE_HEIGHT,
  FOOTER_HEIGHT,
  formatDate,
  getContentMaxY,
  getInfoBoxContentStartY,
  getLogoBase64,
  MARGIN,
  measureDescriptionHeight,
  numberToWords,
  PRIMARY_DARK_GREEN,
  sanitizePdfText,
  splitDescriptionLines,
  TERMS_AND_CONDITIONS,
  WHITE,
  type ClientInfoPdf,
  type InfoBoxOpts,
} from "@/lib/pdf"
import type { QuotationWithServices } from "../types"
import { getQuotationFullById } from "../action"

/** Build the InfoBoxOpts callback used by didDrawPage + final-pass loop. */
function buildInfoOptsBuilder(
  quotation: QuotationWithServices,
  quotationDate: string,
  advisorName: string,
  clientInfo: ClientInfoPdf,
): (pageNumber: number, totalPages: number) => InfoBoxOpts {
  return (pageNumber, totalPages) => ({
    title: "QUOTATION",
    docNumberLabel: "QUOTATION NO",
    docNumber: quotation.name,
    date: quotationDate,
    advisorName,
    pageNumber,
    totalPages,
    clientInfo,
  })
}

async function generateQuotationPdfDoc(quotation: QuotationWithServices): Promise<jsPDF> {
  const doc = new jsPDF()
  const logoBase64 = await getLogoBase64()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Approved custom services only
  const customServices = (quotation.customServices ?? []).filter((cs) => cs.status === "APPROVED")

  // Totals
  const regularServices = quotation.services.filter((qs) => !qs.customServiceId)
  const servicesTotal = regularServices.reduce(
    (sum, serviceItem) => sum + serviceItem.price * serviceItem.quantity,
    0,
  )
  const customServicesTotal = customServices.reduce((sum, cs) => sum + cs.price, 0)
  const subtotal = servicesTotal + customServicesTotal

  let discountAmount = 0
  if (quotation.discountValue && quotation.discountValue > 0) {
    discountAmount =
      quotation.discountType === "percentage"
        ? (subtotal * quotation.discountValue) / 100
        : quotation.discountValue
  }
  const grandTotal = subtotal - discountAmount
  const originalPrice = subtotal

  const advisorName = (quotation as any).advisors && (quotation as any).advisors.length > 0
    ? (quotation as any).advisors
        .map((a: any) => `${a.firstName || ""} ${a.lastName || ""}`.trim())
        .join(", ")
    : quotation.createdBy
      ? `${quotation.createdBy.firstName || ""} ${quotation.createdBy.lastName || ""}`.trim()
      : "ADMIN"

  const clientInfo: ClientInfoPdf = {
    name: quotation.Client?.name || "",
    company: quotation.Client?.company || "",
    phone: quotation.Client?.phone || "",
    email: quotation.Client?.email || "",
    address: quotation.Client?.address || undefined,
    companyRegistrationNumber: quotation.Client?.companyRegistrationNumber || undefined,
    ic: quotation.Client?.ic || undefined,
  }

  const quotationDate = formatDate(new Date(quotation.quotationDate ?? quotation.created_at))
  const buildInfoOpts = buildInfoOptsBuilder(quotation, quotationDate, advisorName, clientInfo)

  addPageChrome(doc, logoBase64, buildInfoOpts(1, 1))

  const contentStartY = getInfoBoxContentStartY(doc, buildInfoOpts(1, 1))
  let currentY = contentStartY

  // Combined service list (sanitized)
  const allServices = [
    ...regularServices.map((s) => ({
      name: sanitizePdfText(s.service?.name ?? ""),
      description: sanitizePdfText(s.descriptionOverride ?? s.service?.description ?? ""),
      price: s.price,
      quantity: s.quantity,
    })),
    ...customServices.map((cs) => ({
      name: sanitizePdfText(cs.name),
      description: sanitizePdfText(cs.description || ""),
      price: cs.price,
      quantity: 1,
    })),
  ]

  // Table rows
  const tableData: (string | number)[][] = []
  const rowHeights: number[] = []
  const descColWidth = ((pageWidth - 2 * MARGIN) / 15) * 7
  const descCellWidth = descColWidth - 6

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
    const qty = service.quantity ?? 1
    tableData.push([
      String(index + 1),
      cellText,
      formatNumber(qty),
      formatNumber(service.price),
      formatNumber(service.price * qty),
    ])
  })

  const rowPageOffsets = new Map<number, number>()

  if (allServices.length === 0) {
    tableData.push([
      "1",
      "",
      formatNumber(1),
      formatNumber(originalPrice),
      formatNumber(grandTotal),
    ])
    rowHeights.push(15)
  }

  if (tableData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [["No", "Description", "Package", "Price/Package", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: PRIMARY_DARK_GREEN,
        textColor: WHITE,
        fontSize: 9,
        fontStyle: "bold",
        lineWidth: 0.1,
      },
      bodyStyles: { fontSize: 9, textColor: BLACK, lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 1, halign: "center" },
        1: {
          cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 7,
          cellPadding: { top: 5, right: 3, bottom: 5, left: 3 },
          valign: "top",
        },
        2: { cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 2, halign: "right" },
        3: { cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 3, halign: "right" },
        4: { cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 2, halign: "right" },
      },
      margin: {
        left: MARGIN,
        right: MARGIN,
        top: contentStartY,
        bottom: FOOTER_HEIGHT + 4,
      },
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
          const serviceIndex = data.row.index
          const service = allServices[serviceIndex]
          if (!service) return

          const cellWidth = data.cell.width - 6
          const x = data.cell.x + 3
          const topPad = 5
          const botPad = 2
          let renderY = data.cell.y + topPad
          const maxRenderY = data.cell.y + data.cell.height - botPad

          const contentOffset = rowPageOffsets.get(serviceIndex) || 0
          let virtualY = 0
          let lastRenderedBottom = contentOffset

          doc.setFont("helvetica", "bold")
          doc.setFontSize(9)
          doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
          const nameLines = doc.splitTextToSize(service.name, cellWidth)
          for (const nameLine of nameLines) {
            const lineBottom = virtualY + DESC_LINE_HEIGHT
            if (virtualY >= contentOffset && renderY <= maxRenderY) {
              doc.text(nameLine, x, renderY)
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
            doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
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

          rowPageOffsets.set(serviceIndex, lastRenderedBottom)
          return false
        }
      },
      didDrawPage: (data: any) => {
        addPageChrome(doc, logoBase64, buildInfoOpts(data.pageNumber, doc.getNumberOfPages()))
      },
    })

    currentY = (doc.lastAutoTable?.finalY ?? currentY) + 10
  }

  // Move to the last page for totals + terms
  let totalPages = doc.getNumberOfPages()
  doc.setPage(totalPages)

  const addNewPage = () => {
    doc.addPage()
    totalPages = doc.getNumberOfPages()
    addPageChrome(doc, logoBase64, buildInfoOpts(totalPages, totalPages))
    return contentStartY
  }

  const contentMaxY = getContentMaxY(doc)
  if (currentY > contentMaxY - 35) currentY = addNewPage()

  // Totals
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("TOTAL ORIGINAL PRICE:", MARGIN, currentY)
  doc.text(`RM${formatNumber(originalPrice)}`, pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 7

  doc.text("TOTAL DISCOUNT:", MARGIN, currentY)
  doc.text(`RM${formatNumber(discountAmount)}`, pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 7

  doc.text("AFTER DISCOUNT PRICE:", MARGIN, currentY)
  doc.text(`RM${formatNumber(grandTotal)}`, pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 7

  // Amount-in-words line
  const wordsText = `RINGGIT MALAYSIA : ${numberToWords(grandTotal)} ONLY`
  const wordsLines = doc.splitTextToSize(wordsText, pageWidth - 2 * MARGIN - 12)
  for (const line of wordsLines) {
    if (currentY > contentMaxY) currentY = addNewPage()
    doc.text(line, MARGIN, currentY)
    currentY += 5
  }
  currentY += 5

  // Olive divider before terms
  doc.setDrawColor(PRIMARY_DARK_GREEN[0], PRIMARY_DARK_GREEN[1], PRIMARY_DARK_GREEN[2])
  doc.setLineWidth(0.4)
  doc.line(MARGIN, currentY, pageWidth - MARGIN, currentY)
  currentY += 4

  // Terms & Conditions
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Terms And Conditions", MARGIN, currentY)
  currentY += 4

  const TC_FONT_SIZE = 7.5
  for (const paragraph of TERMS_AND_CONDITIONS) {
    if (currentY > contentMaxY) currentY = addNewPage()
    doc.setFont("helvetica", "normal")
    doc.setFontSize(TC_FONT_SIZE)
    const lines = doc.splitTextToSize(paragraph, pageWidth - 2 * MARGIN)
    for (const line of lines) {
      if (currentY > contentMaxY) {
        currentY = addNewPage()
        doc.setFont("helvetica", "normal")
        doc.setFontSize(TC_FONT_SIZE)
      }
      doc.text(line, MARGIN, currentY)
      currentY += 3.5
    }
    currentY += 2
  }

  // Final pass: rewrite page chrome on every page now that total page count is known.
  const finalTotalPages = doc.getNumberOfPages()
  for (let i = 1; i <= finalTotalPages; i++) {
    doc.setPage(i)
    addPageChrome(doc, logoBase64, buildInfoOpts(i, finalTotalPages))
  }

  return doc
}

export async function generateQuotationPDFWithFetch(quotationId: number): Promise<void> {
  const fullQuotation = await getQuotationFullById(quotationId.toString())
  if (!fullQuotation) throw new Error("Quotation not found")
  const doc = await generateQuotationPdfDoc(fullQuotation)
  const fileName = `quotation-${fullQuotation.name}-${
    fullQuotation.Client?.company?.replace(/\s+/g, "-") || "client"
  }.pdf`
  doc.save(fileName)
}

export async function generateQuotationPDF(quotation: QuotationWithServices): Promise<void> {
  const fullQuotation = await getQuotationFullById(quotation.id.toString())
  if (!fullQuotation) throw new Error("Quotation not found")
  const doc = await generateQuotationPdfDoc(fullQuotation)
  const fileName = `quotation-${fullQuotation.name}-${
    fullQuotation.Client?.company?.replace(/\s+/g, "-") || "client"
  }.pdf`
  doc.save(fileName)
}

export async function generateQuotationPDFBase64(quotation: QuotationWithServices): Promise<string> {
  const fullQuotation = await getQuotationFullById(quotation.id.toString())
  if (!fullQuotation) throw new Error("Quotation not found")
  const doc = await generateQuotationPdfDoc(fullQuotation)
  return doc.output("datauristring").split(",")[1]
}

export async function generateQuotationPDFBase64FromFull(quotation: QuotationWithServices): Promise<string> {
  const doc = await generateQuotationPdfDoc(quotation)
  return doc.output("datauristring").split(",")[1]
}

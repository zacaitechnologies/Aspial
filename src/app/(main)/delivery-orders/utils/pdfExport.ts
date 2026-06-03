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
import { getDeliveryOrderFullById, type FullDeliveryOrder } from "../action"

async function buildDeliveryOrderPdf(order: FullDeliveryOrder): Promise<jsPDF> {
  const doc = new jsPDF()
  const logoBase64 = await getLogoBase64()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

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
    address: order.client?.address ?? undefined,
    companyRegistrationNumber: order.client?.companyRegistrationNumber ?? undefined,
    ic: order.client?.ic ?? undefined,
  }

  const buildInfoOpts = (pageNumber: number, totalPages: number): InfoBoxOpts => ({
    title: "DELIVERY ORDER",
    docNumberLabel: "DELIVERY ORDER NO",
    docNumber: order.deliveryOrderNumber,
    date: formatDate(new Date(order.deliveryOrderDate)),
    advisorName,
    pageNumber,
    totalPages,
    clientInfo,
  })

  addPageChrome(doc, logoBase64, buildInfoOpts(1, 1))

  const contentStartY = getInfoBoxContentStartY(doc, buildInfoOpts(1, 1))
  let currentY = contentStartY

  const allServices = order.services.map((s) => ({
    name: sanitizePdfText(s.service.name),
    description: sanitizePdfText(s.descriptionOverride || ""),
    price: s.price,
    quantity: s.quantity,
  }))

  // Column widths (15 units total): No 1, Description 6, Package 2, Price/Package 2, Discount 2, Total 2
  const cw = (n: number) => ((pageWidth - 2 * MARGIN) / 15) * n
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
      fillColor: PRIMARY_DARK_GREEN,
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
    margin: { left: MARGIN, right: MARGIN, top: contentStartY, bottom: FOOTER_HEIGHT + 4 },
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
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
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
    didDrawPage: (data: { pageNumber: number }) => {
      addPageChrome(doc, logoBase64, buildInfoOpts(data.pageNumber, doc.getNumberOfPages()))
    },
  })

  currentY = (doc.lastAutoTable?.finalY ?? currentY) + 4

  const addNewPage = () => {
    doc.addPage()
    const total = doc.getNumberOfPages()
    addPageChrome(doc, logoBase64, buildInfoOpts(total, total))
    return contentStartY
  }

  const contentMaxY = getContentMaxY(doc)
  if (currentY > contentMaxY - 30) currentY = addNewPage()

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2])
  doc.setLineWidth(0.4)
  doc.line(MARGIN, currentY, pageWidth - MARGIN, currentY)
  currentY += 5

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("Total", pageWidth - MARGIN - 25, currentY, { align: "right" })
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text(formatNumber(final), pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 5

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  const wordsText = `RINGGIT MALAYSIA : ${numberToWords(final)} ONLY`
  const wordsLines = doc.splitTextToSize(wordsText, pageWidth - 2 * MARGIN - 60)
  for (const wLine of wordsLines) {
    doc.text(wLine, MARGIN, currentY)
    currentY += 4
  }
  currentY += 1

  if (discountAmount > 0) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Discount applied: RM${formatNumber(discountAmount)}`, MARGIN, currentY)
    currentY += 5
  }

  doc.line(MARGIN, currentY, pageWidth - MARGIN, currentY)
  currentY += 4

  // Terms and conditions
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

  // Authorised signature on the last content page (above footer)
  const lastPage = doc.getNumberOfPages()
  doc.setPage(lastPage)
  const sigY = pageHeight - FOOTER_HEIGHT - 10
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Authorised Signature", pageWidth - MARGIN, sigY, { align: "right" })
  doc.setFontSize(8)
  doc.text("ASPIAL PRODUCTION SDN BHD", pageWidth - MARGIN, sigY + 4, { align: "right" })

  // Final pass: re-stamp page chrome with the correct total page count on every page
  const finalTotalPages = doc.getNumberOfPages()
  for (let i = 1; i <= finalTotalPages; i++) {
    doc.setPage(i)
    addPageChrome(doc, logoBase64, buildInfoOpts(i, finalTotalPages))
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

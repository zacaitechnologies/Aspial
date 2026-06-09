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
  WHITE,
  type ClientInfoPdf,
  type InfoBoxOpts,
} from "@/lib/pdf"
import type { PaymentMethodType } from "../types"
import { PAYMENT_METHOD_LABELS } from "../types"
import {
  getReceiptFullById,
  getReceiptsForInvoice,
  getQuotationInvoicesTotalAsOf,
  getPreviousInvoiceAmount,
} from "../action"

type ReceiptFull = NonNullable<Awaited<ReturnType<typeof getReceiptFullById>>>

interface QuotationWithServices {
  id: number
  services: Array<{
    customServiceId?: string | null
    descriptionOverride?: string | null
    price?: number
    quantity?: number
    service: { basePrice: number; name: string; description?: string | null }
  }>
  customServices?: Array<{ status: string; price: number; name: string; description?: string | null }>
  discountValue?: number | null
  discountType?: string | null
  Client?: {
    name?: string
    company?: string
    phone?: string
    email?: string
    address?: string | null
    companyRegistrationNumber?: string | null
    ic?: string | null
  } | null
  createdBy?: { firstName?: string; lastName?: string } | null
}

function buildInfoOptsBuilder(
  receiptNumber: string,
  receiptDate: string,
  advisorName: string,
  clientInfo: ClientInfoPdf,
  paymentMethodLabel: string | undefined,
): (pageNumber: number, totalPages: number) => InfoBoxOpts {
  const extras = paymentMethodLabel
    ? [{ label: "PAYMENT METHOD", value: paymentMethodLabel }]
    : undefined
  return (pageNumber, totalPages) => ({
    title: "RECEIPT",
    docNumberLabel: "RECEIPT NO",
    docNumber: receiptNumber,
    date: receiptDate,
    advisorName,
    pageNumber,
    totalPages,
    clientInfo,
    extras,
  })
}

function getReceiptAdvisorName(receipt: ReceiptFull): string {
  if (receipt.advisors.length > 0) {
    return receipt.advisors
      .map((advisor) => `${advisor.firstName || ""} ${advisor.lastName || ""}`.trim())
      .filter(Boolean)
      .join(", ")
  }

  if (receipt.createdBy) {
    return `${receipt.createdBy.firstName || ""} ${receipt.createdBy.lastName || ""}`.trim()
  }

  return "ADMIN"
}

function getReceiptPaymentMethodLabel(receipt: ReceiptFull): string | undefined {
  const paymentMethod = receipt.paymentMethod as PaymentMethodType | null | undefined
  return PAYMENT_METHOD_LABELS[paymentMethod as PaymentMethodType] || paymentMethod || undefined
}

function getReceiptPdfFileName(receipt: ReceiptFull): string {
  const companyName =
    receipt.invoice?.quotation?.Client?.company?.replace(/\s+/g, "-") ||
    receipt.client?.company?.replace(/\s+/g, "-") ||
    receipt.client?.name?.replace(/\s+/g, "-") ||
    "client"

  return `receipt-${receipt.receiptNumber}-${companyName}.pdf`
}

async function buildStandaloneReceiptPdf(receipt: ReceiptFull): Promise<jsPDF> {
  const client = receipt.client
  if (!client) {
    throw new Error("Standalone receipt is missing client information")
  }

  const doc = new jsPDF()
  const logoBase64 = await getLogoBase64()
  const pageWidth = doc.internal.pageSize.getWidth()
  const receiptAmount = receipt.amount
  const receiptDate = formatDate(new Date(receipt.receiptDate))
  const advisorName = getReceiptAdvisorName(receipt)
  const paymentMethodLabel = getReceiptPaymentMethodLabel(receipt)

  const clientInfo: ClientInfoPdf = {
    name: client.name || "",
    company: client.company || "",
    phone: client.phone || "",
    email: client.email || "",
    address: client.address ?? undefined,
    companyRegistrationNumber: client.companyRegistrationNumber ?? undefined,
    ic: client.ic ?? undefined,
  }

  const buildInfoOpts = buildInfoOptsBuilder(
    receipt.receiptNumber,
    receiptDate,
    advisorName,
    clientInfo,
    paymentMethodLabel,
  )

  addPageChrome(doc, logoBase64, buildInfoOpts(1, 1))

  const contentStartY = getInfoBoxContentStartY(doc, buildInfoOpts(1, 1))
  let currentY = contentStartY

  const hasServices = receipt.services && receipt.services.length > 0
  const tableBody: (string | number)[][] = hasServices
    ? receipt.services!.map((svc, idx) => [
        String(idx + 1),
        sanitizePdfText(svc.descriptionOverride || svc.service.description || svc.service.name),
        String(svc.quantity),
        formatNumber(svc.price),
        formatNumber(svc.price * svc.quantity),
      ])
    : [["1", "Payment Received", "1.00", formatNumber(receiptAmount), formatNumber(receiptAmount)]]

  autoTable(doc, {
    startY: currentY,
    head: [["No", "Description", "Package", "Price/Package", "Total"]],
    body: tableBody,
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
      1: { cellWidth: ((pageWidth - 2 * MARGIN) / 15) * 7 },
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
    didDrawPage: (data: { pageNumber: number }) => {
      addPageChrome(doc, logoBase64, buildInfoOpts(data.pageNumber, doc.getNumberOfPages()))
    },
  })

  currentY = (doc.lastAutoTable?.finalY ?? currentY) + 10

  const contentMaxY = getContentMaxY(doc)
  if (currentY > contentMaxY - 45) {
    doc.addPage()
    addPageChrome(doc, logoBase64, buildInfoOpts(doc.getNumberOfPages(), doc.getNumberOfPages()))
    currentY = contentStartY
  }

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("TOTAL ORIGINAL PRICE:", MARGIN, currentY)
  doc.text(`RM${formatNumber(receiptAmount)}`, pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 7

  doc.text("AFTER DISCOUNT PRICE:", MARGIN, currentY)
  doc.text(`RM${formatNumber(receiptAmount)}`, pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 7

  const wordsLines = doc.splitTextToSize(
    `RINGGIT MALAYSIA : ${numberToWords(receiptAmount)} ONLY`,
    pageWidth - 2 * MARGIN - 12,
  )
  for (const line of wordsLines) {
    if (currentY > contentMaxY) {
      doc.addPage()
      addPageChrome(doc, logoBase64, buildInfoOpts(doc.getNumberOfPages(), doc.getNumberOfPages()))
      currentY = contentStartY
    }
    doc.text(line, MARGIN, currentY)
    currentY += 5
  }
  currentY += 5

  if (currentY > contentMaxY - 25) {
    doc.addPage()
    addPageChrome(doc, logoBase64, buildInfoOpts(doc.getNumberOfPages(), doc.getNumberOfPages()))
    currentY = contentStartY
  }

  autoTable(doc, {
    startY: currentY,
    head: [["Amount Received"]],
    body: [[`RM${formatNumber(receiptAmount)}`]],
    theme: "grid",
    headStyles: {
      fillColor: PRIMARY_DARK_GREEN,
      textColor: WHITE,
      fontSize: 9,
      fontStyle: "bold",
      lineWidth: 0.1,
    },
    bodyStyles: { fontSize: 9, textColor: BLACK, lineWidth: 0.1, halign: "center" },
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_HEIGHT + 4 },
    styles: { cellPadding: 5, lineWidth: 0.1, lineColor: [0, 0, 0] },
    didDrawPage: (data: { pageNumber: number }) => {
      addPageChrome(doc, logoBase64, buildInfoOpts(data.pageNumber, doc.getNumberOfPages()))
    },
  })

  const finalTotalPages = doc.getNumberOfPages()
  for (let i = 1; i <= finalTotalPages; i++) {
    doc.setPage(i)
    addPageChrome(doc, logoBase64, buildInfoOpts(i, finalTotalPages))
  }

  return doc
}

async function buildInvoiceLinkedReceiptPdf(receipt: ReceiptFull): Promise<jsPDF> {
  const doc = new jsPDF()
  const logoBase64 = await getLogoBase64()
  const invoice = receipt.invoice
  if (!invoice) {
    throw new Error("PDF export is only supported for invoice-linked receipts")
  }
  const quotationRaw = invoice.quotation
  if (!quotationRaw || !(quotationRaw as unknown as QuotationWithServices).services) {
    throw new Error("Quotation data not available")
  }
  const quotation = quotationRaw as unknown as QuotationWithServices

  const pageWidth = doc.internal.pageSize.getWidth()

  // Totals
  const regularServices = quotation.services.filter((qs) => !qs.customServiceId)
  const servicesTotal = regularServices.reduce((sum, serviceItem) => {
    return sum + (serviceItem.price != null ? serviceItem.price * (serviceItem.quantity ?? 1) : serviceItem.service.basePrice)
  }, 0)
  const approvedCustomServicesTotal = (quotation.customServices || [])
    .filter((cs) => cs.status === "APPROVED")
    .reduce((sum, cs) => sum + cs.price, 0)
  const subtotal = servicesTotal + approvedCustomServicesTotal

  let discountAmount = 0
  if (quotation.discountValue && quotation.discountValue > 0) {
    discountAmount =
      quotation.discountType === "percentage"
        ? (subtotal * quotation.discountValue) / 100
        : quotation.discountValue
  }
  const quotationGrandTotal = subtotal - discountAmount
  const receiptAmount = receipt.amount
  const invoiceAmount = invoice.amount

  // Balances
  const receiptDocumentDate = new Date(receipt.receiptDate)
  const allReceipts = await getReceiptsForInvoice(invoice.id, receiptDocumentDate)
  const totalReceived = allReceipts.reduce((sum, r) => sum + r.amount, 0)
  const invoiceBalance = Math.max(0, invoiceAmount - totalReceived)

  const quotationId = quotation.id
  const invoiceForDoc = invoice as { invoiceDate?: Date | null; created_at?: Date | null }
  const invoiceDocumentDate = invoiceForDoc.invoiceDate ? new Date(invoiceForDoc.invoiceDate) : receiptDocumentDate
  const [totalInvoicedAsOf, previousInvoiceAmount] = await Promise.all([
    getQuotationInvoicesTotalAsOf(quotationId, invoiceDocumentDate),
    getPreviousInvoiceAmount(quotationId, invoiceDocumentDate),
  ])
  const projectBalance = Math.max(0, quotationGrandTotal - totalInvoicedAsOf)

  const quotationAdvisors = (quotation as any).advisors as Array<{ firstName?: string; lastName?: string }> | undefined
  const advisorName = quotationAdvisors && quotationAdvisors.length > 0
    ? quotationAdvisors
        .map((a) => `${a.firstName || ""} ${a.lastName || ""}`.trim())
        .filter(Boolean)
        .join(", ")
    : quotation.createdBy
      ? `${quotation.createdBy.firstName || ""} ${quotation.createdBy.lastName || ""}`.trim()
      : "ADMIN"

  const clientInfo: ClientInfoPdf = {
    name: quotation.Client?.name || "",
    company: quotation.Client?.company || "",
    phone: quotation.Client?.phone || "",
    email: quotation.Client?.email || "",
    address: quotation.Client?.address ?? undefined,
    companyRegistrationNumber: quotation.Client?.companyRegistrationNumber ?? undefined,
    ic: quotation.Client?.ic ?? undefined,
  }

  const receiptDate = formatDate(new Date(receipt.receiptDate))
  const paymentMethodLabel =
    PAYMENT_METHOD_LABELS[(receipt as any).paymentMethod as PaymentMethodType] ||
    (receipt as any).paymentMethod ||
    undefined

  const buildInfoOpts = buildInfoOptsBuilder(
    receipt.receiptNumber,
    receiptDate,
    advisorName,
    clientInfo,
    paymentMethodLabel,
  )

  addPageChrome(doc, logoBase64, buildInfoOpts(1, 1))

  const contentStartY = getInfoBoxContentStartY(doc, buildInfoOpts(1, 1))
  let currentY = contentStartY

  const allServices = [
    ...regularServices.map((s) => {
      const price = s.price != null ? s.price : s.service.basePrice
      const quantity = s.quantity ?? 1
      return {
        name: sanitizePdfText(s.service.name),
        description: sanitizePdfText(s.descriptionOverride ?? s.service.description ?? ""),
        price,
        quantity,
      }
    }),
    ...(quotation.customServices || [])
      .filter((cs) => cs.status === "APPROVED")
      .map((cs) => ({
        name: sanitizePdfText(cs.name),
        description: sanitizePdfText(cs.description ?? ""),
        price: cs.price,
        quantity: 1,
      })),
  ]

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
    tableData.push(["1", "", "1.00", formatNumber(subtotal), formatNumber(quotationGrandTotal)])
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
      didDrawPage: (data: { pageNumber: number }) => {
        addPageChrome(doc, logoBase64, buildInfoOpts(data.pageNumber, doc.getNumberOfPages()))
      },
    })

    currentY = (doc.lastAutoTable?.finalY ?? currentY) + 10
  }

  // Totals section (move to last page)
  let totalPages = doc.getNumberOfPages()
  doc.setPage(totalPages)

  const addNewPage = () => {
    doc.addPage()
    totalPages = doc.getNumberOfPages()
    addPageChrome(doc, logoBase64, buildInfoOpts(totalPages, totalPages))
    return contentStartY
  }

  const contentMaxY = getContentMaxY(doc)
  if (currentY > contentMaxY - 70) currentY = addNewPage()

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("TOTAL ORIGINAL PRICE:", MARGIN, currentY)
  doc.text(`RM${formatNumber(subtotal)}`, pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 7

  if (discountAmount > 0) {
    doc.text("TOTAL DISCOUNT:", MARGIN, currentY)
    doc.text(`RM${formatNumber(discountAmount)}`, pageWidth - MARGIN, currentY, { align: "right" })
    currentY += 7
  }

  doc.text("AFTER DISCOUNT PRICE:", MARGIN, currentY)
  doc.text(`RM${formatNumber(quotationGrandTotal)}`, pageWidth - MARGIN, currentY, { align: "right" })
  currentY += 7

  const wordsLines = doc.splitTextToSize(`RINGGIT MALAYSIA : ${numberToWords(receiptAmount)} ONLY`, pageWidth - 2 * MARGIN - 12)
  for (const line of wordsLines) {
    if (currentY > contentMaxY) currentY = addNewPage()
    doc.text(line, MARGIN, currentY)
    currentY += 5
  }
  currentY += 5

  if (currentY > contentMaxY - 25) currentY = addNewPage()

  autoTable(doc, {
    startY: currentY,
    head: [["Previous Invoice Amount", "Amount Received", "Invoice Balance", "Project Balance"]],
    body: [[
      `RM${formatNumber(previousInvoiceAmount)}`,
      `RM${formatNumber(receiptAmount)}`,
      `RM${formatNumber(invoiceBalance)}`,
      `RM${formatNumber(projectBalance)}`,
    ]],
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
      0: { cellWidth: (pageWidth - 2 * MARGIN) / 4, halign: "center" },
      1: { cellWidth: (pageWidth - 2 * MARGIN) / 4, halign: "center" },
      2: { cellWidth: (pageWidth - 2 * MARGIN) / 4, halign: "center" },
      3: { cellWidth: (pageWidth - 2 * MARGIN) / 4, halign: "center" },
    },
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_HEIGHT + 4 },
    styles: { cellPadding: 5, lineWidth: 0.1, lineColor: [0, 0, 0] },
    didDrawPage: (data: { pageNumber: number }) => {
      addPageChrome(doc, logoBase64, buildInfoOpts(data.pageNumber, doc.getNumberOfPages()))
    },
  })

  // Final pass to fix page numbers (no T&C for receipts)
  const finalTotalPages = doc.getNumberOfPages()
  for (let i = 1; i <= finalTotalPages; i++) {
    doc.setPage(i)
    addPageChrome(doc, logoBase64, buildInfoOpts(i, finalTotalPages))
  }

  return doc
}

async function buildReceiptPdf(receipt: ReceiptFull): Promise<jsPDF> {
  if (!receipt.invoice) {
    return buildStandaloneReceiptPdf(receipt)
  }

  return buildInvoiceLinkedReceiptPdf(receipt)
}

export async function generateReceiptPDFWithFetch(receiptId: string): Promise<void> {
  const fullReceipt = await getReceiptFullById(receiptId)
  if (!fullReceipt) throw new Error("Receipt not found")
  const doc = await buildReceiptPdf(fullReceipt)
  doc.save(getReceiptPdfFileName(fullReceipt))
}

export async function generateReceiptPDF(receipt: { id: string }): Promise<void> {
  const fullReceipt = await getReceiptFullById(receipt.id)
  if (!fullReceipt) throw new Error("Receipt not found")
  const doc = await buildReceiptPdf(fullReceipt)
  doc.save(getReceiptPdfFileName(fullReceipt))
}

export async function generateReceiptPDFBase64(receipt: { id: string }): Promise<string> {
  const fullReceipt = await getReceiptFullById(receipt.id)
  if (!fullReceipt) throw new Error("Receipt not found")
  const doc = await buildReceiptPdf(fullReceipt)
  return doc.output("datauristring").split(",")[1]
}

export async function generateReceiptPDFBase64FromFull(fullReceipt: ReceiptFull): Promise<string> {
  const doc = await buildReceiptPdf(fullReceipt)
  return doc.output("datauristring").split(",")[1]
}

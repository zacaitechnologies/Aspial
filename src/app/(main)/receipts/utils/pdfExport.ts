import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatNumber } from "@/lib/format-number"
import type { ReceiptWithInvoice } from "../types"
import { getReceiptFullById, getReceiptsForInvoice } from "../action"

/** Quotation shape returned by getReceiptFullById (includes services). Used only for PDF generation. */
interface QuotationWithServices {
	services: Array<{
		customServiceId?: string | null
		service: { basePrice: number; name: string; description?: string | null }
	}>
	customServices?: Array<{ status: string; price: number; name: string; description?: string | null }>
	discountValue?: number | null
	discountType?: string | null
	Client?: { name?: string; company?: string; phone?: string; email?: string } | null
	createdBy?: { firstName?: string; lastName?: string } | null
}

/** Logo path relative to project root (public folder). */
const LOGO_PATH = "public/images/mainlogo.png"
/** Small logo for PDF (avoids ~17MB PDFs from 3858×1199 full-res embed). Prefer when present. */
const LOGO_PDF_PATH = "public/images/mainlogo-pdf.png"
/** Max logo width in pixels when resizing in browser; keeps PDF size small. */
const LOGO_PDF_MAX_WIDTH = 250

/**
 * Load ASPIAL logo as base64 data URL for use in jsPDF.
 * Resizes in browser to avoid embedding full-resolution image (~17MB).
 * Prefers mainlogo-pdf.png on server when present for smaller server-generated PDFs.
 */
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

/**
 * Resize a data URL image to max width for PDF to avoid huge file sizes.
 * Used in browser only; logo is displayed at ~38×16mm so 250px is sufficient.
 */
function resizeImageDataUrlForPdf(dataUrl: string, maxWidth: number): Promise<string | null> {
	return new Promise((resolve) => {
		const img = new Image()
		img.crossOrigin = "anonymous"
		img.onload = () => {
			const w = img.naturalWidth
			const h = img.naturalHeight
			if (w <= maxWidth) {
				resolve(dataUrl)
				return
			}
			const canvas = document.createElement("canvas")
			const scale = maxWidth / w
			canvas.width = maxWidth
			canvas.height = Math.round(h * scale)
			const ctx = canvas.getContext("2d")
			if (!ctx) {
				resolve(dataUrl)
				return
			}
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

// Type definitions for jsPDF autoTable and extension
declare module "jspdf" {
	interface jsPDF {
		lastAutoTable?: {
			finalY: number
		}
	}
}

// Convert number to Malaysian Ringgit words
function numberToWords(num: number): string {
	const ones = [
		"", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
		"TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
		"SEVENTEEN", "EIGHTEEN", "NINETEEN"
	]
	
	const tens = [
		"", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"
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
	
	if (wholePart >= 1000000) {
		const millions = Math.floor(wholePart / 1000000)
		words += convertHundreds(millions) + " MILLION"
		const remainder = wholePart % 1000000
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

// Format date as DD/MM/YYYY
function formatDate(date: Date): string {
	const day = String(date.getDate()).padStart(2, '0')
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const year = date.getFullYear()
	return `${day}/${month}/${year}`
}

// Primary color from CSS: #202F21 (dark green)
const PRIMARY_COLOR: [number, number, number] = [32, 47, 33]
const WHITE: [number, number, number] = [255, 255, 255]
const BLACK: [number, number, number] = [0, 0, 0]

// Logo and header dimensions
const LOGO_HEADER_WIDTH = 38
const LOGO_HEADER_HEIGHT = 16
const HEADER_HEIGHT = 24
const CONTENT_START_Y = 30
const TEXT_SAFETY = 12

// Info box dimensions
const INFO_BOX_HEIGHT = 28
const INFO_BOX_START_Y = CONTENT_START_Y
const CONTENT_AFTER_INFO_BOX_Y = CONTENT_START_Y + INFO_BOX_HEIGHT + 8

// Add header to every page (logo on left, company info to the right)
function addReceiptHeader(
	doc: jsPDF,
	logoBase64: string | null
) {
	const pageWidth = doc.internal.pageSize.getWidth()
	const margin = 20

	// Dark green header background
	doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2])
	doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F")

	doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])

	// Logo on left side
	const logoStartX = margin
	const logoY = 4
	if (logoBase64) {
		try {
			doc.addImage(logoBase64, "PNG", logoStartX, logoY, LOGO_HEADER_WIDTH, LOGO_HEADER_HEIGHT, "logo")
		} catch {
			// If image fails, fall back to text-only
		}
	}

	// Company info to the right of the logo
	const textStartX = logoStartX + LOGO_HEADER_WIDTH + 6
	const textWidth = pageWidth - textStartX - margin
	doc.setFontSize(8)
	doc.setFont("helvetica", "normal")
	let headerY = 7
	const companyLines = [
		"ASPIAL PRODUCTION SDN BHD (202001019933 (1376253-A))",
		"2A, JALAN DATO' ABU BAKAR, JALAN 16/1, SECTION 16, 46350 PETALING JAYA, SELANGOR",
		"Phone: 016-5323453 Fax: 03-78770323 Email: aspialproduction@gmail.com",
	]
	for (const text of companyLines) {
		const wrapped = doc.splitTextToSize(text, textWidth)
		for (const line of wrapped) {
			if (headerY > HEADER_HEIGHT - 3) break
			doc.text(line, textStartX, headerY)
			headerY += 5
		}
	}

	doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
}

// Add receipt info box to every page (RECEIPT label, Bill To, RECEIPT NO, DATE, ADVISOR, PAGE NO)
function addReceiptInfoBox(
	doc: jsPDF,
	pageNumber: number,
	totalPages: number,
	receiptNumber: string,
	receiptDate: string,
	advisorName: string,
	clientInfo: { name: string; company: string; phone: string; email: string }
) {
	const pageWidth = doc.internal.pageSize.getWidth()
	const margin = 20
	const rightCol = pageWidth - margin
	
	// Clear the area first (white background)
	doc.setFillColor(255, 255, 255)
	doc.rect(margin, INFO_BOX_START_Y, pageWidth - 2 * margin, INFO_BOX_HEIGHT, "F")
	
	let leftY = INFO_BOX_START_Y + 6
	let rightY = INFO_BOX_START_Y + 6
	
	// Left side - Big bolded RECEIPT label
	doc.setFont("helvetica", "bold")
	doc.setFontSize(16)
	doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
	doc.text("RECEIPT", margin + 3, leftY)
	leftY += 6
	
	// Left side - Bill To section (smaller font)
	doc.setFontSize(9)
	if (clientInfo.company) {
		doc.setFont("helvetica", "bold")
		doc.text(`Bill To: ${clientInfo.company}`, margin + 3, leftY)
		doc.setFont("helvetica", "normal")
	} else {
		doc.setFont("helvetica", "bold")
		doc.text(`Bill To:`, margin + 3, leftY)
		doc.setFont("helvetica", "normal")
	}
	leftY += 4
	
	if (clientInfo.name) {
		doc.text(`ATTN TO: ${clientInfo.name}`, margin + 3, leftY)
	}
	leftY += 4
	
	if (clientInfo.phone) {
		doc.text(`TEL NO: ${clientInfo.phone}`, margin + 3, leftY)
	}
	leftY += 4
	
	if (clientInfo.email) {
		doc.text(`EMAIL: ${clientInfo.email}`, margin + 3, leftY)
	}
	
	// Right side - Receipt details (right-aligned)
	doc.setFontSize(9)
	doc.setFont("helvetica", "normal")
	doc.text(`RECEIPT NO : ${receiptNumber}`, rightCol - 3, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`DATE : ${receiptDate}`, rightCol - 3, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`ADVISOR : ${advisorName}`, rightCol - 3, rightY, { align: "right" })
	rightY += 5
	
	// Page number
	doc.text(`PAGE NO : ${pageNumber} of ${totalPages}`, rightCol - 3, rightY, { align: "right" })
	
	// Draw horizontal line at the bottom of info section
	doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2])
	doc.setLineWidth(0.5)
	doc.line(margin, INFO_BOX_START_Y + INFO_BOX_HEIGHT, pageWidth - margin, INFO_BOX_START_Y + INFO_BOX_HEIGHT)
}

/**
 * Generate receipt PDF with full data fetching
 */
export async function generateReceiptPDFWithFetch(receiptId: string) {
	const fullReceipt = await getReceiptFullById(receiptId)
	
	if (!fullReceipt) {
		throw new Error("Receipt not found")
	}
	
	return await generateReceiptPDFInternal(fullReceipt as ReceiptWithInvoice)
}

/**
 * Internal PDF generation function
 */
async function generateReceiptPDFInternal(receipt: ReceiptWithInvoice) {
	const doc = new jsPDF()
	const logoBase64 = await getLogoBase64()
	const invoice = receipt.invoice
	const quotationRaw = invoice?.quotation
	
	if (!quotationRaw || !(quotationRaw as unknown as QuotationWithServices).services) {
		throw new Error("Quotation data not available")
	}
	const quotation = quotationRaw as unknown as QuotationWithServices

	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 20
	const contentWidth = pageWidth - 2 * margin - TEXT_SAFETY
	
	// Calculate quotation totals
	const regularServices = quotation.services.filter((qs) => !qs.customServiceId)
	const servicesTotal = regularServices.reduce(
		(sum: number, serviceItem: { service: { basePrice: number } }) => sum + serviceItem.service.basePrice,
		0
	)
	const approvedCustomServicesTotal = (quotation.customServices || [])
		.filter((cs: { status: string }) => cs.status === "APPROVED")
		.reduce((sum: number, cs: { price: number }) => sum + cs.price, 0)
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
	
	// Get receipts to calculate remaining
	const receiptCreatedAt = new Date(receipt.created_at)
	const allReceipts = await getReceiptsForInvoice(invoice.id, receiptCreatedAt)
	const totalReceived = allReceipts.reduce((sum: number, r: { amount: number }) => sum + r.amount, 0)
	const remainingAmount = invoiceAmount - totalReceived
	
	// Get advisor name
	const advisorName = quotation.createdBy
		? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
		: 'ADMIN'
	
	// Get client info
	const clientInfo = {
		name: quotation.Client?.name || '',
		company: quotation.Client?.company || '',
		phone: quotation.Client?.phone || '',
		email: quotation.Client?.email || '',
	}
	
	const receiptDate = formatDate(new Date(receipt.created_at))
	
	// Add header and info box to first page
	addReceiptHeader(doc, logoBase64)
	addReceiptInfoBox(doc, 1, 1, receipt.receiptNumber, receiptDate, advisorName, clientInfo)
	
	// Start content after the info box
	let currentY = CONTENT_AFTER_INFO_BOX_Y
	
	// Combine all services
	const allServices = [
		...regularServices.map((s) => ({
			name: s.service.name,
			description: s.service.description ?? "",
			price: s.service.basePrice,
		})),
		...(quotation.customServices || []).filter((cs) => cs.status === "APPROVED").map((cs) => ({
			name: cs.name,
			description: cs.description ?? "",
			price: cs.price,
		})),
	]
	
	// Services table
	const tableData: (string | number)[][] = []
	const rowHeights: number[] = []
	const descCellWidth = 110 - 6
	
	allServices.forEach((service: { name: string; description: string; price: number }, index: number) => {
		const nameLines = doc.splitTextToSize(service.name, descCellWidth)
		let totalLines = nameLines.length
		
		if (service.description) {
			const processedDesc = service.description
				.split('\n')
				.map(line => line.trim().replace(/^[-•*]\s*/, ''))
				.filter(line => line.length > 0)
				.join('\n')
			const descLines = doc.splitTextToSize(processedDesc, descCellWidth)
			totalLines += descLines.length
			totalLines += 0.5
		}
		
		const rowHeight = Math.max(20, totalLines * 5 + 12)
		rowHeights.push(rowHeight)
		
		tableData.push([
			String(index + 1),
			"",
			"1.00",
			formatNumber(service.price),
			formatNumber(service.price)
		])
	})
	
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
				fillColor: PRIMARY_COLOR,
				textColor: WHITE,
				fontSize: 9,
				fontStyle: "bold",
				lineWidth: 0.1,
			},
			bodyStyles: {
				fontSize: 9,
				textColor: BLACK,
				lineWidth: 0.1,
			},
			columnStyles: {
				0: { cellWidth: (pageWidth - 2 * margin) / 15 * 1, halign: "center" },
				1: { 
					cellWidth: (pageWidth - 2 * margin) / 15 * 7, 
					cellPadding: { top: 5, right: 3, bottom: 5, left: 3 },
					valign: 'top'
				},
				2: { cellWidth: (pageWidth - 2 * margin) / 15 * 2, halign: "right" },
				3: { cellWidth: (pageWidth - 2 * margin) / 15 * 3, halign: "right" },
				4: { cellWidth: (pageWidth - 2 * margin) / 15 * 2, halign: "right" },
			},
			margin: { left: margin, right: margin },
			styles: {
				cellPadding: 3,
				lineWidth: 0.1,
				lineColor: [0, 0, 0],
				overflow: 'linebreak',
			},
			didParseCell: (data: any) => {
				if (data.row.index >= 0 && rowHeights[data.row.index]) {
					data.cell.minHeight = rowHeights[data.row.index]
					if (data.table.body[data.row.index]) {
						data.table.body[data.row.index].height = rowHeights[data.row.index]
					}
				}
			},
			willDrawCell: (data: { row: { index: number }; cell: { height: number } }) => {
				if (data.row.index >= 0 && rowHeights[data.row.index]) {
					data.cell.height = rowHeights[data.row.index]
				}
			},
			didDrawCell: (data: { column: { index: number }; row: { index: number; section: string }; cell: { width: number; x: number; y: number; height: number } }) => {
				if (data.column.index === 1 && data.row.index >= 0 && data.row.section === 'body') {
					const serviceIndex = data.row.index
					const service = allServices[serviceIndex]
					
					if (service) {
						const cellWidth = data.cell.width - 6
						const x = data.cell.x + 3
						let y = data.cell.y + 5
						const cellHeight = rowHeights[serviceIndex] || data.cell.height || 20
						const maxY = data.cell.y + cellHeight - 5
						
						doc.setFont("helvetica", "bold")
						doc.setFontSize(9)
						doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
						const nameLines = doc.splitTextToSize(service.name, cellWidth)
						nameLines.forEach((line: string) => {
							if (y >= maxY) return
							doc.text(line, x, y)
							y += 4
						})
						
						if (service.description) {
							y += 2
							doc.setFont("helvetica", "normal")
							doc.setFontSize(9)
							let processedDesc = service.description
								.split('\n')
								.map(line => line.trim().replace(/^[-•*]\s*/, ''))
								.filter(line => line.length > 0)
								.join('\n')
							
							if (!processedDesc || processedDesc.trim().length === 0) {
								processedDesc = service.description.trim()
							}
							
							if (processedDesc && processedDesc.length > 0) {
								const descLines = doc.splitTextToSize(processedDesc, cellWidth)
								descLines.forEach((line: string) => {
									if (y >= maxY) return
									doc.text(line, x, y)
									y += 4
								})
							}
						}
						
						return false
					}
				}
			},
		didDrawPage: (data: { pageNumber: number }) => {
			const totalPages = doc.getNumberOfPages()
			addReceiptHeader(doc, logoBase64)
			addReceiptInfoBox(doc, data.pageNumber, totalPages, receipt.receiptNumber, receiptDate, advisorName, clientInfo)
		},
	})
	
	currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY
	currentY += 10
}

// Go to last page for totals
let totalPages = doc.getNumberOfPages()
doc.setPage(totalPages)

// Helper to add new page with header and info box
const addNewPage = () => {
	doc.addPage()
	totalPages = doc.getNumberOfPages()
	addReceiptHeader(doc, logoBase64)
	addReceiptInfoBox(doc, totalPages, totalPages, receipt.receiptNumber, receiptDate, advisorName, clientInfo)
	return CONTENT_AFTER_INFO_BOX_Y
}

if (currentY > pageHeight - 80) {
	currentY = addNewPage()
}
	
	// Totals section
	doc.setFontSize(10)
	doc.setFont("helvetica", "normal")
	
	doc.text("TOTAL ORIGINAL PRICE:", margin, currentY)
	doc.text(`RM${formatNumber(subtotal)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
	if (discountAmount > 0) {
		doc.text("TOTAL DISCOUNT:", margin, currentY)
		doc.text(`RM${formatNumber(discountAmount)}`, pageWidth - margin, currentY, { align: "right" })
		currentY += 7
	}
	
	doc.text("AFTER DISCOUNT PRICE:", margin, currentY)
	doc.text(`RM${formatNumber(quotationGrandTotal)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
const amountInWords = numberToWords(receiptAmount)
const wordsText = `RINGGIT MALAYSIA : ${amountInWords} ONLY`
const wordsLines = doc.splitTextToSize(wordsText, contentWidth)
wordsLines.forEach((line: string) => {
	if (currentY > pageHeight - 30) {
		currentY = addNewPage()
	}
	doc.text(line, margin, currentY)
	currentY += 5
})
currentY += 5

// Payment table
if (currentY > pageHeight - 40) {
	currentY = addNewPage()
}

autoTable(doc, {
	startY: currentY,
	head: [["Amount Received", "Balance"]],
	body: [[`RM${formatNumber(receiptAmount)}`, `RM${formatNumber(Math.max(0, remainingAmount))}`]],
	theme: "grid",
	headStyles: {
		fillColor: PRIMARY_COLOR,
		textColor: WHITE,
		fontSize: 9,
		fontStyle: "bold",
		lineWidth: 0.1,
	},
	bodyStyles: {
		fontSize: 9,
		textColor: BLACK,
		lineWidth: 0.1,
	},
	columnStyles: {
		0: { cellWidth: (pageWidth - 2 * margin) / 2, halign: "center" },
		1: { cellWidth: (pageWidth - 2 * margin) / 2, halign: "center" },
	},
	margin: { left: margin, right: margin },
	styles: {
		cellPadding: 5,
		lineWidth: 0.1,
		lineColor: [0, 0, 0],
	},
	didDrawPage: (data: { pageNumber: number }) => {
		addReceiptHeader(doc, logoBase64)
		addReceiptInfoBox(doc, data.pageNumber, doc.getNumberOfPages(), receipt.receiptNumber, receiptDate, advisorName, clientInfo)
	},
})

// Final update of page numbers on all pages (header + info box) - NO T&C for receipts
const finalTotalPages = doc.getNumberOfPages()
for (let i = 1; i <= finalTotalPages; i++) {
	doc.setPage(i)
	addReceiptHeader(doc, logoBase64)
	addReceiptInfoBox(doc, i, finalTotalPages, receipt.receiptNumber, receiptDate, advisorName, clientInfo)
}
	
	const fileName = `receipt-${receipt.receiptNumber}-${
		quotation.Client?.company?.replace(/\s+/g, "-") || "client"
	}.pdf`
	doc.save(fileName)
}

/**
 * Generate receipt PDF (public export)
 */
export async function generateReceiptPDF(receipt: ReceiptWithInvoice) {
	// Always fetch full data to ensure services are loaded
	const fullReceipt = await getReceiptFullById(receipt.id)
	if (!fullReceipt) {
		throw new Error("Receipt not found")
	}
	
	return await generateReceiptPDFInternal(fullReceipt as ReceiptWithInvoice)
}

/**
 * Generate receipt PDF as base64 string for email attachment
 */
export async function generateReceiptPDFBase64(receipt: ReceiptWithInvoice): Promise<string> {
	const fullReceipt = await getReceiptFullById(receipt.id)
	if (!fullReceipt) {
		throw new Error("Receipt not found")
	}
	return _generateReceiptPDFBase64Internal(fullReceipt)
}

/**
 * Generate receipt PDF from already-fetched full receipt (no refetch).
 * Use from send-email flow to avoid duplicate DB round-trip.
 */
export async function generateReceiptPDFBase64FromFull(fullReceipt: ReceiptWithInvoice): Promise<string> {
	return _generateReceiptPDFBase64Internal(fullReceipt)
}

async function _generateReceiptPDFBase64Internal(fullReceipt: ReceiptWithInvoice): Promise<string> {
	const doc = new jsPDF()
	const logoBase64 = await getLogoBase64()
	const invoice = fullReceipt.invoice
	const quotationRaw = invoice?.quotation

	if (!quotationRaw || !(quotationRaw as unknown as QuotationWithServices).services) {
		throw new Error("Quotation data not available")
	}
	const quotation = quotationRaw as unknown as QuotationWithServices

	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 20
	const contentWidth = pageWidth - 2 * margin - TEXT_SAFETY
	
	// Calculate totals
	const regularServices = quotation.services.filter((qs) => !qs.customServiceId)
	const servicesTotal = regularServices.reduce(
		(sum: number, serviceItem: { service: { basePrice: number } }) => sum + serviceItem.service.basePrice,
		0
	)
	const approvedCustomServicesTotal = (quotation.customServices || [])
		.filter((cs: { status: string }) => cs.status === "APPROVED")
		.reduce((sum: number, cs: { price: number }) => sum + cs.price, 0)
	const subtotal = servicesTotal + approvedCustomServicesTotal
	
	let discountAmount = 0
	if (quotation.discountValue && quotation.discountValue > 0) {
		discountAmount =
			quotation.discountType === "percentage"
				? (subtotal * quotation.discountValue) / 100
				: quotation.discountValue
	}
	
	const quotationGrandTotal = subtotal - discountAmount
	const receiptAmount = fullReceipt.amount
	const invoiceAmount = invoice.amount
	
	const receiptCreatedAt = new Date(fullReceipt.created_at)
	const allReceipts = await getReceiptsForInvoice(invoice.id, receiptCreatedAt)
	const totalReceived = allReceipts.reduce((sum: number, r: { amount: number }) => sum + r.amount, 0)
	const remainingAmount = invoiceAmount - totalReceived
	
	const advisorName = quotation.createdBy
		? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
		: 'ADMIN'
	
	const clientInfo = {
		name: quotation.Client?.name || '',
		company: quotation.Client?.company || '',
		phone: quotation.Client?.phone || '',
		email: quotation.Client?.email || '',
	}
	
	const receiptDate = formatDate(new Date(fullReceipt.created_at))
	
	// Add header and info box to first page
	addReceiptHeader(doc, logoBase64)
	addReceiptInfoBox(doc, 1, 1, fullReceipt.receiptNumber, receiptDate, advisorName, clientInfo)
	
	// Start content after the info box
	let currentY = CONTENT_AFTER_INFO_BOX_Y
	
	const allServices = [
		...regularServices.map((s) => ({
			name: s.service.name,
			description: (s.service.description ?? "") as string,
			price: s.service.basePrice,
		})),
		...(quotation.customServices || []).filter((cs) => cs.status === "APPROVED").map((cs) => ({
			name: cs.name,
			description: (cs.description ?? "") as string,
			price: cs.price,
		})),
	]
	
	const tableData: (string | number)[][] = []
	const rowHeights: number[] = []
	const descCellWidth = 110 - 6
	
	allServices.forEach((service: { name: string; description: string; price: number }, index: number) => {
		const nameLines = doc.splitTextToSize(service.name, descCellWidth)
		let totalLines = nameLines.length
		if (service.description) {
			const processedDesc = service.description.split('\n').map(line => line.trim().replace(/^[-•*]\s*/, '')).filter(line => line.length > 0).join('\n')
			totalLines += doc.splitTextToSize(processedDesc, descCellWidth).length + 0.5
		}
		rowHeights.push(Math.max(20, totalLines * 5 + 12))
		tableData.push([String(index + 1), "", "1.00", formatNumber(service.price), formatNumber(service.price)])
	})
	
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
			headStyles: { fillColor: PRIMARY_COLOR, textColor: WHITE, fontSize: 9, fontStyle: "bold", lineWidth: 0.1 },
			bodyStyles: { fontSize: 9, textColor: BLACK, lineWidth: 0.1 },
			columnStyles: {
				0: { cellWidth: (pageWidth - 2 * margin) / 15 * 1, halign: "center" },
				1: { cellWidth: (pageWidth - 2 * margin) / 15 * 7, cellPadding: { top: 5, right: 3, bottom: 5, left: 3 }, valign: 'top' },
				2: { cellWidth: (pageWidth - 2 * margin) / 15 * 2, halign: "right" },
				3: { cellWidth: (pageWidth - 2 * margin) / 15 * 3, halign: "right" },
				4: { cellWidth: (pageWidth - 2 * margin) / 15 * 2, halign: "right" },
			},
			margin: { left: margin, right: margin },
			styles: { cellPadding: 3, lineWidth: 0.1, lineColor: [0, 0, 0], overflow: 'linebreak' },
			didParseCell: (data: any) => {
				if (data.row.index >= 0 && rowHeights[data.row.index]) {
					data.cell.minHeight = rowHeights[data.row.index]
					if (data.table.body[data.row.index]) data.table.body[data.row.index].height = rowHeights[data.row.index]
				}
			},
			willDrawCell: (data: { row: { index: number }; cell: { height: number } }) => {
				if (data.row.index >= 0 && rowHeights[data.row.index]) data.cell.height = rowHeights[data.row.index]
			},
			didDrawCell: (data: { column: { index: number }; row: { index: number; section: string }; cell: { width: number; x: number; y: number; height: number } }) => {
				if (data.column.index === 1 && data.row.index >= 0 && data.row.section === 'body') {
					const service = allServices[data.row.index]
					if (service) {
						const cellWidth = data.cell.width - 6
						const x = data.cell.x + 3
						let y = data.cell.y + 5
						const maxY = data.cell.y + (rowHeights[data.row.index] || data.cell.height || 20) - 5
						
						doc.setFont("helvetica", "bold")
						doc.setFontSize(9)
						doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
						doc.splitTextToSize(service.name, cellWidth).forEach((line: string) => { if (y < maxY) { doc.text(line, x, y); y += 4 } })
						
						if (service.description) {
							y += 2
							doc.setFont("helvetica", "normal")
							const desc = service.description.split('\n').map(l => l.trim().replace(/^[-•*]\s*/, '')).filter(l => l.length > 0).join('\n') || service.description.trim()
							if (desc) doc.splitTextToSize(desc, cellWidth).forEach((line: string) => { if (y < maxY) { doc.text(line, x, y); y += 4 } })
						}
						return false
					}
				}
			},
		didDrawPage: (data: { pageNumber: number }) => {
			addReceiptHeader(doc, logoBase64)
			addReceiptInfoBox(doc, data.pageNumber, doc.getNumberOfPages(), fullReceipt.receiptNumber, receiptDate, advisorName, clientInfo)
		},
	})
	currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY
	currentY += 10
}

// Go to last page for totals
let totalPages = doc.getNumberOfPages()
doc.setPage(totalPages)

// Helper to add new page with header and info box
const addNewPage = () => {
	doc.addPage()
	totalPages = doc.getNumberOfPages()
	addReceiptHeader(doc, logoBase64)
	addReceiptInfoBox(doc, totalPages, totalPages, fullReceipt.receiptNumber, receiptDate, advisorName, clientInfo)
	return CONTENT_AFTER_INFO_BOX_Y
}

if (currentY > pageHeight - 80) {
	currentY = addNewPage()
}
	
	doc.setFontSize(10)
	doc.setFont("helvetica", "normal")
	doc.text("TOTAL ORIGINAL PRICE:", margin, currentY)
	doc.text(`RM${formatNumber(subtotal)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
	if (discountAmount > 0) {
		doc.text("TOTAL DISCOUNT:", margin, currentY)
		doc.text(`RM${formatNumber(discountAmount)}`, pageWidth - margin, currentY, { align: "right" })
		currentY += 7
	}
	
	doc.text("AFTER DISCOUNT PRICE:", margin, currentY)
	doc.text(`RM${formatNumber(quotationGrandTotal)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
const wordsLines = doc.splitTextToSize(`RINGGIT MALAYSIA : ${numberToWords(receiptAmount)} ONLY`, contentWidth)
wordsLines.forEach((line: string) => {
	if (currentY > pageHeight - 30) {
		currentY = addNewPage()
	}
	doc.text(line, margin, currentY)
	currentY += 5
})
currentY += 5

if (currentY > pageHeight - 40) {
	currentY = addNewPage()
}

autoTable(doc, {
	startY: currentY,
	head: [["Amount Received", "Balance"]],
	body: [[`RM${formatNumber(receiptAmount)}`, `RM${formatNumber(Math.max(0, remainingAmount))}`]],
	theme: "grid",
	headStyles: { fillColor: PRIMARY_COLOR, textColor: WHITE, fontSize: 9, fontStyle: "bold", lineWidth: 0.1 },
	bodyStyles: { fontSize: 9, textColor: BLACK, lineWidth: 0.1 },
	columnStyles: { 0: { cellWidth: (pageWidth - 2 * margin) / 2, halign: "center" }, 1: { cellWidth: (pageWidth - 2 * margin) / 2, halign: "center" } },
	margin: { left: margin, right: margin },
	styles: { cellPadding: 5, lineWidth: 0.1, lineColor: [0, 0, 0] },
	didDrawPage: (data: { pageNumber: number }) => {
		addReceiptHeader(doc, logoBase64)
		addReceiptInfoBox(doc, data.pageNumber, doc.getNumberOfPages(), fullReceipt.receiptNumber, receiptDate, advisorName, clientInfo)
	},
})

// NO T&C for receipts - final page number update only (header + info box)
const finalTotalPages = doc.getNumberOfPages()
for (let i = 1; i <= finalTotalPages; i++) {
	doc.setPage(i)
	addReceiptHeader(doc, logoBase64)
	addReceiptInfoBox(doc, i, finalTotalPages, fullReceipt.receiptNumber, receiptDate, advisorName, clientInfo)
}
	
	return doc.output('datauristring').split(',')[1]
}

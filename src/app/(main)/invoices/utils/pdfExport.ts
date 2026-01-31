import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { InvoiceWithQuotation } from "../types"
import { getInvoiceFullById } from "../action"

/** Logo path relative to project root (public folder). */
const LOGO_PATH = "public/images/mainlogo.png"

/**
 * Load ASPIAL logo as base64 data URL for use in jsPDF.
 * Works in Node (server) and browser (client export).
 */
async function getLogoBase64(): Promise<string | null> {
	if (typeof window === "undefined") {
		try {
			const path = await import("path")
			const fs = await import("fs")
			const logoPath = path.join(process.cwd(), LOGO_PATH)
			const buf = fs.readFileSync(logoPath)
			return `data:image/png;base64,${buf.toString("base64")}`
		} catch {
			return null
		}
	}
	try {
		const res = await fetch("/images/mainlogo.png")
		const blob = await res.blob()
		return new Promise<string | null>((resolve) => {
			const reader = new FileReader()
			reader.onloadend = () => resolve(reader.result as string)
			reader.onerror = () => resolve(null)
			reader.readAsDataURL(blob)
		})
	} catch {
		return null
	}
}

/** Terms and conditions text (points 1-3). */
const TERMS_AND_CONDITIONS = [
	"1. Ownership, Usage Rights, and Creator's Rights. All photographs captured by ASPIAL PRODUCTION SDN BHD remain the sole property of the company. Clients are strictly prohibited from selling or utilizing the photographs in contests without prior written consent from ASPIAL PRODUCTION SDN BHD. ASPIAL PRODUCTION SDN BHD reserves the right to employ the photographs/video for advertising, display, website and internet promotion, photographic contests, and any other marketing endeavours deemed appropriate by the company. ASPIAL PRODUCTION SDN BHD retains the rights to the intellectual property created during the provision of services, subject to the terms agreed upon in this agreement.",
	"2. Liability, Payment, and Confidentiality. ASPIAL PRODUCTION SDN BHD shall not be held liable for any form of loss, damage, or expenses incurred during the photography process or the entirety of the project, including but not limited to indirect or consequential loss, hardware malfunctions, manpower, equipment, scheduling, etc. The initial payment is required to secure the reservation of services and must be remitted upon booking. Confirmed packages are non-refundable, non-exchangeable, and non-transferable. Both parties commit to maintaining the confidentiality of proprietary or sensitive information exchanged during the project. Confidentiality obligations extend beyond the project duration and remain in effect indefinitely, except as required by law or with the express written consent of both parties.",
	"3. Cancellation, Refunds, and Acceptance. Clients acknowledge that once the project plan/solution is confirmed, significant resources, including manpower, equipment, and scheduling, are allocated accordingly, rendering cancellation impossible. Payments made are non-refundable. By initiating the first payment, the Client confirms understanding and agreement to comply with these terms and conditions.",
]

/** Payment information (rendered larger for visibility). */
const PAYMENT_INFO = "4. Payment Information: Bank: Public Bank Berhad | Account No: 321-9794-528 | Account Name: ASPIAL PRODUCTION SDN BHD"

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

// Add header to every page (logo on left, company info to the right)
function addInvoiceHeader(
	doc: jsPDF,
	_pageNumber: number,
	_totalPages: number,
	_invoiceNumber: string,
	_invoiceDate: string,
	_advisorName: string,
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
			doc.addImage(logoBase64, "PNG", logoStartX, logoY, LOGO_HEADER_WIDTH, LOGO_HEADER_HEIGHT)
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

// Add Terms and Conditions section; returns new currentY
function addTermsAndConditions(
	doc: jsPDF,
	startY: number,
	margin: number,
	pageWidth: number,
	pageHeight: number,
	invoiceNumber: string,
	invoiceDate: string,
	advisorName: string,
	logoBase64: string | null
): number {
	const contentWidth = pageWidth - 2 * margin - TEXT_SAFETY
	let currentY = startY
	currentY += 8
	doc.setFont("helvetica", "bold")
	doc.setFontSize(10)
	doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
	doc.text("Terms And Conditions", margin, currentY)
	currentY += 6

	// T&C points 1-3 (font 9pt)
	for (const paragraph of TERMS_AND_CONDITIONS) {
		if (currentY > pageHeight - 25) {
			doc.addPage()
			const newTotalPages = doc.getNumberOfPages()
			addInvoiceHeader(doc, newTotalPages, newTotalPages, invoiceNumber, invoiceDate, advisorName, logoBase64)
			currentY = CONTENT_START_Y
		}
		// Re-set font after page break
		doc.setFont("helvetica", "normal")
		doc.setFontSize(9)
		doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
		const lines = doc.splitTextToSize(paragraph, contentWidth)
		for (const line of lines) {
			if (currentY > pageHeight - 25) {
				doc.addPage()
				const newTotalPages = doc.getNumberOfPages()
				addInvoiceHeader(doc, newTotalPages, newTotalPages, invoiceNumber, invoiceDate, advisorName, logoBase64)
				currentY = CONTENT_START_Y
				doc.setFont("helvetica", "normal")
				doc.setFontSize(9)
				doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
			}
			doc.text(line, margin, currentY)
			currentY += 4.5
		}
		currentY += 3
	}

	// Payment Information (larger font for visibility)
	currentY += 5
	if (currentY > pageHeight - 30) {
		doc.addPage()
		const newTotalPages = doc.getNumberOfPages()
		addInvoiceHeader(doc, newTotalPages, newTotalPages, invoiceNumber, invoiceDate, advisorName, logoBase64)
		currentY = CONTENT_START_Y
	}
	doc.setFont("helvetica", "bold")
	doc.setFontSize(10)
	doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
	const paymentLines = doc.splitTextToSize(PAYMENT_INFO, contentWidth)
	for (const line of paymentLines) {
		if (currentY > pageHeight - 25) {
			doc.addPage()
			const newTotalPages = doc.getNumberOfPages()
			addInvoiceHeader(doc, newTotalPages, newTotalPages, invoiceNumber, invoiceDate, advisorName, logoBase64)
			currentY = CONTENT_START_Y
			doc.setFont("helvetica", "bold")
			doc.setFontSize(10)
			doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
		}
		doc.text(line, margin, currentY)
		currentY += 5
	}

	return currentY
}

/**
 * Generate invoice PDF with full data fetching
 */
export async function generateInvoicePDFWithFetch(invoiceId: string) {
	const fullInvoice = await getInvoiceFullById(invoiceId)
	
	if (!fullInvoice) {
		throw new Error("Invoice not found")
	}
	
	return await generateInvoicePDFInternal(fullInvoice as unknown as InvoiceWithQuotation)
}

/**
 * Internal PDF generation function
 */
async function generateInvoicePDFInternal(invoice: InvoiceWithQuotation) {
	const doc = new jsPDF()
	const logoBase64 = await getLogoBase64()
	const quotation = invoice.quotation
	
	if (!quotation || !quotation.services) {
		throw new Error("Quotation data not available")
	}
	
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 20
	const contentWidth = pageWidth - 2 * margin - TEXT_SAFETY
	let currentY = CONTENT_START_Y
	
	// Calculate quotation totals
	const regularServices = quotation.services.filter((qs) => !qs.customServiceId)
	const servicesTotal = regularServices.reduce(
		(sum, serviceItem) => sum + serviceItem.service.basePrice,
		0
	)
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
	const invoiceAmount = invoice.amount
	
	// Get advisor name
	const advisorName = quotation.createdBy
		? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
		: 'ADMIN'
	
	// Get client info
	const clientName = quotation.Client?.name || ''
	const clientCompany = quotation.Client?.company || ''
	const clientPhone = quotation.Client?.phone || ''
	const clientEmail = quotation.Client?.email || ''
	
	const invoiceDate = formatDate(new Date(invoice.created_at))
	
	// Add header to first page
	addInvoiceHeader(doc, 1, 1, invoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
	
	// Invoice details section - two columns layout
	doc.setFontSize(10)
	doc.setFont("helvetica", "normal")
	
	const leftCol = margin
	const rightCol = pageWidth - margin
	let leftY = currentY + 3 // Offset to align with right column
	let rightY = currentY
	
	// Left side - Big bolded INVOICE label
	doc.setFont("helvetica", "bold")
	doc.setFontSize(20)
	doc.text("INVOICE", leftCol, leftY)
	leftY += 8
	
	// Left side - Bill To section
	if (clientCompany) {
		doc.setFont("helvetica", "bold")
		doc.setFontSize(11)
		doc.text(`Bill To: ${clientCompany}`, leftCol, leftY)
		doc.setFontSize(10)
		doc.setFont("helvetica", "normal")
	} else {
		doc.setFont("helvetica", "bold")
		doc.text(`Bill To :`, leftCol, leftY)
		doc.setFont("helvetica", "normal")
	}
	leftY += 5
	
	if (clientName) {
		doc.text(`ATTN TO: ${clientName}`, leftCol, leftY)
	} else {
		doc.text(`ATTN TO :`, leftCol, leftY)
	}
	leftY += 5
	
	if (clientPhone) {
		doc.text(`TEL NO: ${clientPhone}`, leftCol, leftY)
	} else {
		doc.text(`TEL NO :`, leftCol, leftY)
	}
	leftY += 5
	
	if (clientEmail) {
		doc.text(`EMAIL: ${clientEmail}`, leftCol, leftY)
	} else {
		doc.text(`EMAIL :`, leftCol, leftY)
	}
	
	// Right side - Invoice details (right-aligned)
	doc.text(`INVOICE NO : ${invoice.invoiceNumber}`, rightCol, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`DATE : ${invoiceDate}`, rightCol, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`ADVISOR : ${advisorName}`, rightCol, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`PAGE NO : 1 of 1`, rightCol, rightY, { align: "right" })
	
	currentY = Math.max(leftY, rightY) + 8
	
	// Combine all services
	const allServices = [
		...regularServices.map((s) => ({
			name: s.service.name,
			description: s.service.description || "",
			price: s.service.basePrice,
			type: "service",
		})),
		...(quotation.customServices || []).filter(cs => cs.status === "APPROVED").map((cs) => ({
			name: cs.name,
			description: cs.description || "",
			price: cs.price,
			type: "custom",
		})),
	]
	
	// Services table
	const tableData: (string | number)[][] = []
	const rowHeights: number[] = []
	const descCellWidth = 110 - 6
	
	allServices.forEach((service, index) => {
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
			service.price.toFixed(2),
			service.price.toFixed(2)
		])
	})
	
	if (allServices.length === 0) {
		tableData.push(["1", "", "1.00", subtotal.toFixed(2), quotationGrandTotal.toFixed(2)])
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
			willDrawCell: (data: any) => {
				if (data.row.index >= 0 && rowHeights[data.row.index]) {
					data.cell.height = rowHeights[data.row.index]
				}
			},
			didDrawCell: (data: any) => {
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
				addInvoiceHeader(doc, data.pageNumber, totalPages, invoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
			},
		})
		
		currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY
		currentY += 10
	}
	
	// Get final total pages and update headers
	const totalPages = doc.getNumberOfPages()
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i)
		addInvoiceHeader(doc, i, totalPages, invoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
		
		if (i === 1) {
			doc.setFontSize(10)
			doc.setFont("helvetica", "normal")
			doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
			let rightY = CONTENT_START_Y
			rightY += 5
			rightY += 5
			rightY += 5
			doc.text(`PAGE NO : ${i} of ${totalPages}`, rightCol, rightY, { align: "right" })
		}
	}
	
	doc.setPage(totalPages)
	
	if (currentY > pageHeight - 80) {
		doc.addPage()
		const newTotalPages = doc.getNumberOfPages()
		addInvoiceHeader(doc, newTotalPages, newTotalPages, invoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
		currentY = CONTENT_START_Y
	}
	
	// Totals section
	doc.setFontSize(10)
	doc.setFont("helvetica", "normal")
	
	doc.text("TOTAL ORIGINAL PRICE:", margin, currentY)
	doc.text(`RM${subtotal.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
	if (discountAmount > 0) {
		doc.text("TOTAL DISCOUNT:", margin, currentY)
		doc.text(`RM${discountAmount.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
		currentY += 7
	}
	
	doc.text("AFTER DISCOUNT PRICE:", margin, currentY)
	doc.text(`RM${quotationGrandTotal.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
	const amountInWords = numberToWords(invoiceAmount)
	const wordsText = `RINGGIT MALAYSIA : ${amountInWords} ONLY`
	const wordsLines = doc.splitTextToSize(wordsText, contentWidth)
	wordsLines.forEach((line: string) => {
		if (currentY > pageHeight - 30) {
			doc.addPage()
			const newTotalPages = doc.getNumberOfPages()
			addInvoiceHeader(doc, newTotalPages, newTotalPages, invoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
			currentY = CONTENT_START_Y
		}
		doc.text(line, margin, currentY)
		currentY += 5
	})
	currentY += 5
	
	// Payment table
	if (currentY > pageHeight - 40) {
		doc.addPage()
		const newTotalPages = doc.getNumberOfPages()
		addInvoiceHeader(doc, newTotalPages, newTotalPages, invoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
		currentY = CONTENT_START_Y
	}
	
	autoTable(doc, {
		startY: currentY,
		head: [["First Payment", "Total Payable"]],
		body: [[invoiceAmount.toFixed(2), invoiceAmount.toFixed(2)]],
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
			const totalPages = doc.getNumberOfPages()
			addInvoiceHeader(doc, data.pageNumber, totalPages, invoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
		},
	})

	currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY
	currentY += 5

	// Horizontal line between totals and Terms & Conditions
	doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2])
	doc.setLineWidth(0.5)
	doc.line(margin, currentY, pageWidth - margin, currentY)
	currentY += 4

	// Terms and Conditions
	currentY = addTermsAndConditions(
		doc,
		currentY,
		margin,
		pageWidth,
		pageHeight,
		invoice.invoiceNumber,
		invoiceDate,
		advisorName,
		logoBase64
	)
	
	// Final update of page numbers
	const finalTotalPages = doc.getNumberOfPages()
	for (let i = 1; i <= finalTotalPages; i++) {
		doc.setPage(i)
		addInvoiceHeader(doc, i, finalTotalPages, invoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
	}
	
	const fileName = `invoice-${invoice.invoiceNumber}-${
		quotation.Client?.company?.replace(/\s+/g, "-") || "client"
	}.pdf`
	doc.save(fileName)
}

/**
 * Generate invoice PDF (public export)
 */
export async function generateInvoicePDF(invoice: InvoiceWithQuotation) {
	// Always fetch full data to ensure services are loaded
	const fullInvoice = await getInvoiceFullById(invoice.id)
	if (!fullInvoice) {
		throw new Error("Invoice not found")
	}
	
	return await generateInvoicePDFInternal(fullInvoice as unknown as InvoiceWithQuotation)
}

/**
 * Generate invoice PDF as base64 string for email attachment
 */
export async function generateInvoicePDFBase64(invoice: InvoiceWithQuotation): Promise<string> {
	// Always fetch full data
	const fullInvoice = await getInvoiceFullById(invoice.id)
	if (!fullInvoice) {
		throw new Error("Invoice not found")
	}

	const doc = new jsPDF()
	const logoBase64 = await getLogoBase64()
	const quotation = fullInvoice.quotation
	
	if (!quotation || !quotation.services) {
		throw new Error("Quotation data not available")
	}
	
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 20
	const contentWidth = pageWidth - 2 * margin - TEXT_SAFETY
	let currentY = CONTENT_START_Y
	
	// Calculate quotation totals
	const regularServices = quotation.services.filter((qs) => !qs.customServiceId)
	const servicesTotal = regularServices.reduce(
		(sum, serviceItem) => sum + serviceItem.service.basePrice,
		0
	)
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
	const invoiceAmount = fullInvoice.amount
	
	const advisorName = quotation.createdBy
		? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
		: 'ADMIN'
	
	const clientName = quotation.Client?.name || ''
	const clientCompany = quotation.Client?.company || ''
	const clientPhone = quotation.Client?.phone || ''
	const clientEmail = quotation.Client?.email || ''
	
	const invoiceDate = formatDate(new Date(fullInvoice.created_at))
	
	addInvoiceHeader(doc, 1, 1, fullInvoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
	
	doc.setFontSize(10)
	doc.setFont("helvetica", "normal")
	
	const leftCol = margin
	const rightCol = pageWidth - margin
	let leftY = currentY + 4
	let rightY = currentY
	
	doc.setFont("helvetica", "bold")
	doc.setFontSize(20)
	doc.text("INVOICE", leftCol, leftY)
	leftY += 8
	
	if (clientCompany) {
		doc.setFont("helvetica", "bold")
		doc.setFontSize(11)
		doc.text(`Bill To: ${clientCompany}`, leftCol, leftY)
		doc.setFontSize(10)
		doc.setFont("helvetica", "normal")
	} else {
		doc.setFont("helvetica", "bold")
		doc.text(`Bill To :`, leftCol, leftY)
		doc.setFont("helvetica", "normal")
	}
	leftY += 5
	
	doc.text(clientName ? `ATTN TO: ${clientName}` : `ATTN TO :`, leftCol, leftY)
	leftY += 5
	doc.text(clientPhone ? `TEL NO: ${clientPhone}` : `TEL NO :`, leftCol, leftY)
	leftY += 5
	doc.text(clientEmail ? `EMAIL: ${clientEmail}` : `EMAIL :`, leftCol, leftY)
	
	doc.text(`INVOICE NO : ${fullInvoice.invoiceNumber}`, rightCol, rightY, { align: "right" })
	rightY += 5
	doc.text(`DATE : ${invoiceDate}`, rightCol, rightY, { align: "right" })
	rightY += 5
	doc.text(`ADVISOR : ${advisorName}`, rightCol, rightY, { align: "right" })
	rightY += 5
	doc.text(`PAGE NO : 1 of 1`, rightCol, rightY, { align: "right" })
	
	currentY = Math.max(leftY, rightY) + 8
	
	const allServices = [
		...regularServices.map((s) => ({
			name: s.service.name,
			description: s.service.description || "",
			price: s.service.basePrice,
		})),
		...(quotation.customServices || []).filter(cs => cs.status === "APPROVED").map((cs) => ({
			name: cs.name,
			description: cs.description || "",
			price: cs.price,
		})),
	]
	
	const tableData: string[][] = []
	const rowHeights: number[] = []
	const descCellWidth = 110 - 6
	
	allServices.forEach((service, index) => {
		const nameLines = doc.splitTextToSize(service.name, descCellWidth)
		let totalLines = nameLines.length
		
		if (service.description) {
			const processedDesc = service.description.split('\n').map(line => line.trim().replace(/^[-•*]\s*/, '')).filter(line => line.length > 0).join('\n')
			const descLines = doc.splitTextToSize(processedDesc, descCellWidth)
			totalLines += descLines.length + 0.5
		}
		
		rowHeights.push(Math.max(20, totalLines * 5 + 12))
		tableData.push([String(index + 1), "", "1.00", service.price.toFixed(2), service.price.toFixed(2)])
	})
	
	if (allServices.length === 0) {
		tableData.push(["1", "", "1.00", subtotal.toFixed(2), quotationGrandTotal.toFixed(2)])
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
			willDrawCell: (data: any) => {
				if (data.row.index >= 0 && rowHeights[data.row.index]) data.cell.height = rowHeights[data.row.index]
			},
			didDrawCell: (data: any) => {
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
			didDrawPage: (data: any) => {
				addInvoiceHeader(doc, data.pageNumber, doc.getNumberOfPages(), fullInvoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
			},
		})
		currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY
		currentY += 10
	}
	
	const totalPages = doc.getNumberOfPages()
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i)
		addInvoiceHeader(doc, i, totalPages, fullInvoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
		if (i === 1) {
			doc.setFontSize(10)
			doc.setFont("helvetica", "normal")
			doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
			doc.text(`PAGE NO : ${i} of ${totalPages}`, rightCol, CONTENT_START_Y + 15, { align: "right" })
		}
	}
	
	doc.setPage(totalPages)
	
	if (currentY > pageHeight - 80) {
		doc.addPage()
		addInvoiceHeader(doc, doc.getNumberOfPages(), doc.getNumberOfPages(), fullInvoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
		currentY = CONTENT_START_Y
	}
	
	doc.setFontSize(10)
	doc.setFont("helvetica", "normal")
	doc.text("TOTAL ORIGINAL PRICE:", margin, currentY)
	doc.text(`RM${subtotal.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
	if (discountAmount > 0) {
		doc.text("TOTAL DISCOUNT:", margin, currentY)
		doc.text(`RM${discountAmount.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
		currentY += 7
	}
	
	doc.text("AFTER DISCOUNT PRICE:", margin, currentY)
	doc.text(`RM${quotationGrandTotal.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
	const wordsLines = doc.splitTextToSize(`RINGGIT MALAYSIA : ${numberToWords(invoiceAmount)} ONLY`, contentWidth)
	wordsLines.forEach((line: string) => {
		if (currentY > pageHeight - 30) {
			doc.addPage()
			addInvoiceHeader(doc, doc.getNumberOfPages(), doc.getNumberOfPages(), fullInvoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
			currentY = CONTENT_START_Y
		}
		doc.text(line, margin, currentY)
		currentY += 5
	})
	currentY += 5
	
	if (currentY > pageHeight - 40) {
		doc.addPage()
		addInvoiceHeader(doc, doc.getNumberOfPages(), doc.getNumberOfPages(), fullInvoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
		currentY = CONTENT_START_Y
	}
	
	autoTable(doc, {
		startY: currentY,
		head: [["First Payment", "Total Payable"]],
		body: [[invoiceAmount.toFixed(2), invoiceAmount.toFixed(2)]],
		theme: "grid",
		headStyles: { fillColor: PRIMARY_COLOR, textColor: WHITE, fontSize: 9, fontStyle: "bold", lineWidth: 0.1 },
		bodyStyles: { fontSize: 9, textColor: BLACK, lineWidth: 0.1 },
		columnStyles: { 0: { cellWidth: (pageWidth - 2 * margin) / 2, halign: "center" }, 1: { cellWidth: (pageWidth - 2 * margin) / 2, halign: "center" } },
		margin: { left: margin, right: margin },
		styles: { cellPadding: 5, lineWidth: 0.1, lineColor: [0, 0, 0] },
		didDrawPage: (data: { pageNumber: number }) => {
			addInvoiceHeader(doc, data.pageNumber, doc.getNumberOfPages(), fullInvoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
		},
	})

	currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY
	currentY += 5

	// Horizontal line
	doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2])
	doc.setLineWidth(0.5)
	doc.line(margin, currentY, pageWidth - margin, currentY)
	currentY += 4

	// Terms and Conditions
	currentY = addTermsAndConditions(doc, currentY, margin, pageWidth, pageHeight, fullInvoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
	
	const finalTotalPages = doc.getNumberOfPages()
	for (let i = 1; i <= finalTotalPages; i++) {
		doc.setPage(i)
		addInvoiceHeader(doc, i, finalTotalPages, fullInvoice.invoiceNumber, invoiceDate, advisorName, logoBase64)
	}
	
	return doc.output('datauristring').split(',')[1]
}

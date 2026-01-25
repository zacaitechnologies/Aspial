import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { InvoiceWithQuotation } from "../types"
import { getInvoiceFullById } from "../action"

// Type definitions for jsPDF autoTable and extension
declare module "jspdf" {
	interface jsPDF {
		lastAutoTable?: {
			finalY: number
		}
	}
}

// Convert number to Malaysian Ringgit words (reuse from quotation)
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
// RGB: 32, 47, 33
const PRIMARY_COLOR: [number, number, number] = [32, 47, 33]
const WHITE: [number, number, number] = [255, 255, 255]
const BLACK: [number, number, number] = [0, 0, 0]

// Add header to every page (adapted for invoice)
function addInvoiceHeader(doc: jsPDF, pageNumber: number, totalPages: number, invoiceNumber: string, invoiceDate: string, advisorName: string) {
	const pageWidth = doc.internal.pageSize.getWidth()
	const margin = 20
	
	// Dark green header background
	doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2])
	doc.rect(0, 0, pageWidth, 45, "F")
	
	// Left side - Company header - white text on dark green background
	doc.setFontSize(12)
	doc.setFont("helvetica", "bold")
	doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
	doc.text("ASPIAL", margin, 15)
	
	doc.setFontSize(9)
	doc.setFont("helvetica", "normal")
	doc.text("ASPIAL PRODUCTION SDN BHD (202001019933 (1376253-A))", margin, 22)
	doc.text("2A, JALAN DATO' ABU BAKAR, JALAN 16/1, SECTION 16,", margin, 28)
	doc.text("46350 PETALING JAYA, SELANGOR,", margin, 34)
	doc.text("Phone: 016-5323453 Fax: 03-78770323 Email: aspialproduction@gmail.com", margin, 40)
	
	// Title - white text, left side
	doc.setFontSize(16)
	doc.setFont("helvetica", "bold")
	doc.text("# INVOICE", margin, 50)
	
	// Page number in header - white text, right-aligned
	doc.setFontSize(9)
	doc.setFont("helvetica", "normal")
	doc.text(`PAGE NO : ${pageNumber} of ${totalPages}`, pageWidth - margin, 50, { align: "right" })
	
	// Reset text color to black for content below
	doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
}

/**
 * Generate invoice PDF with full data fetching
 * This is a wrapper that ensures all required data is loaded before generating the PDF
 */
export async function generateInvoicePDFWithFetch(invoiceId: string) {
	// Fetch full invoice data
	const fullInvoice = await getInvoiceFullById(invoiceId)
	
	if (!fullInvoice) {
		throw new Error("Invoice not found")
	}
	
	// Generate PDF using the internal function
	return await generateInvoicePDFInternal(fullInvoice as any)
}

/**
 * Internal PDF generation function
 * Assumes invoice has full quotation data with services loaded
 */
async function generateInvoicePDFInternal(invoice: InvoiceWithQuotation) {
	const doc = new jsPDF()
	const quotation = invoice.quotation
	
	if (!quotation || !quotation.services) {
		throw new Error("Quotation data not available")
	}
	
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 20
	let currentY = 60 // Start after header
	
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
	const remainingAmount = quotationGrandTotal - invoiceAmount
	
	// Get advisor name (createdBy)
	const advisorName = quotation.createdBy
		? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
		: 'ADMIN'
	
	// Get client info
	const clientName = quotation.Client?.name || ''
	const clientCompany = quotation.Client?.company || ''
	const clientPhone = quotation.Client?.phone || ''
	const clientEmail = quotation.Client?.email || ''
	const clientCompanyRegistrationNumber = quotation.Client?.companyRegistrationNumber || ''
	
	// Prepare header data
	const invoiceDate = formatDate(new Date(invoice.created_at))
	
	// Add header to first page
	addInvoiceHeader(doc, 1, 1, invoice.invoiceNumber, invoiceDate, advisorName)
	
	// Invoice details section - two columns layout
	doc.setFontSize(10)
	doc.setFont("helvetica", "normal")
	
	const leftCol = margin
	const rightCol = pageWidth - margin
	let leftY = currentY
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
	leftY += 5
	
	if (clientCompanyRegistrationNumber) {
		doc.text(`REG NO: ${clientCompanyRegistrationNumber}`, leftCol, leftY)
	} else {
		doc.text(`REG NO :`, leftCol, leftY)
	}
	
	// Right side - Invoice details (right-aligned)
	doc.text(`INVOICE NO : ${invoice.invoiceNumber}`, rightCol, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`DATE : ${invoiceDate}`, rightCol, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`ADVISOR : ${advisorName}`, rightCol, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`PAGE NO : 1 of 1`, rightCol, rightY, { align: "right" })
	
	// Use the maximum Y position from both columns
	currentY = Math.max(leftY, rightY) + 8
	
	// Combine all services (from quotation)
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
	
	// Services table - create a row for each service
	const tableData: any[] = []
	const rowHeights: number[] = []
	const descCellWidth = 110 - 6
	
	// Calculate row height for each service and create table rows
	allServices.forEach((service, index) => {
		const nameLines = doc.splitTextToSize(service.name, descCellWidth)
		let totalLines = nameLines.length
		
		if (service.description) {
			// Process description - split by newlines and remove bullets
			const processedDesc = service.description
				.split('\n')
				.map(line => line.trim().replace(/^[-•*]\s*/, ''))
				.filter(line => line.length > 0)
				.join('\n')
			const descLines = doc.splitTextToSize(processedDesc, descCellWidth)
			totalLines += descLines.length
			// Add 2px for gap between name and description
			totalLines += 0.5 // 2px gap = 0.5 line spacing
		}
		
		// Calculate row height - use 5px per line for better spacing, add extra padding
		const rowHeight = Math.max(20, totalLines * 5 + 12) // 5px per line + extra padding
		rowHeights.push(rowHeight)
		
		// Add row data - empty string in description column will be rendered by didDrawCell
		tableData.push([
			String(index + 1),
			"", // Empty - will be rendered by didDrawCell
			"1.00", // Package quantity
			service.price.toFixed(2), // Price per package
			service.price.toFixed(2) // Total
		])
	})
	
	// If no individual services, show combined total
	if (allServices.length === 0) {
		const packageQty = 1.00
		const pricePerPackage = subtotal
		const total = quotationGrandTotal
		tableData.push([
			"1",
			"",
			packageQty.toFixed(2),
			pricePerPackage.toFixed(2),
			total.toFixed(2)
		])
		rowHeights.push(15)
	}
	
	// Add table
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
				// Set row height based on calculated height for each row
				if (data.row.index >= 0 && rowHeights[data.row.index]) {
					// Set minHeight for all cells in the row to ensure consistent row height
					data.cell.minHeight = rowHeights[data.row.index]
					// Also set the row height directly
					if (data.table.body[data.row.index]) {
						data.table.body[data.row.index].height = rowHeights[data.row.index]
					}
				}
			},
			willDrawCell: (data: any) => {
				// Ensure row height is applied before drawing
				if (data.row.index >= 0 && rowHeights[data.row.index]) {
					data.cell.height = rowHeights[data.row.index]
				}
			},
			didDrawCell: (data: any) => {
				// Only render for body rows, not header rows
				if (data.column.index === 1 && data.row.index >= 0 && data.row.section === 'body') {
					const serviceIndex = data.row.index
					const service = allServices[serviceIndex]
					
					if (service) {
						const cellWidth = data.cell.width - 6
						const x = data.cell.x + 3
						let y = data.cell.y + 5
						// Use calculated row height or cell height, whichever is larger
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
						
						// Add small gap between name and description
						if (service.description) {
							y += 2
						}
						
						// Draw description in normal font (always show if it exists)
						if (service.description) {
							doc.setFont("helvetica", "normal")
							doc.setFontSize(9)
							doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
							// Process description - split by newlines and remove bullets
							let processedDesc = service.description
								.split('\n')
								.map(line => line.trim().replace(/^[-•*]\s*/, ''))
								.filter(line => line.length > 0)
								.join('\n')
							
							// If processing removed everything, use original description
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
			didDrawPage: (data: any) => {
				const totalPages = doc.getNumberOfPages()
				addInvoiceHeader(doc, data.pageNumber, totalPages, invoice.invoiceNumber, invoiceDate, advisorName)
			},
		})
		
		currentY = (doc as any).lastAutoTable.finalY + 10
	}
	
	// Get final total pages
	const totalPages = doc.getNumberOfPages()
	
	// Update page numbers on all pages
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i)
		addInvoiceHeader(doc, i, totalPages, invoice.invoiceNumber, invoiceDate, advisorName)
		
		if (i === 1) {
			doc.setFontSize(10)
			doc.setFont("helvetica", "normal")
			doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
			const rightCol = pageWidth - margin
			let rightY = 60
			rightY += 5 // After INVOICE NO
			rightY += 5 // After DATE
			rightY += 5 // After ADVISOR
			doc.text(`PAGE NO : ${i} of ${totalPages}`, rightCol, rightY, { align: "right" })
		}
	}
	
	// Go back to last page for totals
	doc.setPage(totalPages)
	
	// Check if we need a new page for totals
	if (currentY > pageHeight - 80) {
		doc.addPage()
		const newTotalPages = doc.getNumberOfPages()
		addInvoiceHeader(doc, newTotalPages, newTotalPages, invoice.invoiceNumber, invoiceDate, advisorName)
		currentY = 60
	}
	
	// Totals section
	doc.setFontSize(10)
	doc.setFont("helvetica", "normal")
	
	// Total original price
	doc.text("TOTAL ORIGINAL PRICE:", margin, currentY)
	doc.text(`RM${subtotal.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
	// Discount (if applicable)
	if (discountAmount > 0) {
		doc.text("TOTAL DISCOUNT:", margin, currentY)
		doc.text(`RM${discountAmount.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
		currentY += 7
	}
	
	// After discount price
	doc.text("AFTER DISCOUNT PRICE:", margin, currentY)
	doc.text(`RM${quotationGrandTotal.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
	// Amount in words (for invoice amount)
	doc.setFont("helvetica", "normal")
	doc.setFontSize(10)
	const amountInWords = numberToWords(invoiceAmount)
	const wordsText = `RINGGIT MALAYSIA : ${amountInWords} ONLY`
	const wordsLines = doc.splitTextToSize(wordsText, pageWidth - 2 * margin)
	wordsLines.forEach((line: string) => {
		if (currentY > pageHeight - 30) {
			doc.addPage()
			const newTotalPages = doc.getNumberOfPages()
			addInvoiceHeader(doc, newTotalPages, newTotalPages, invoice.invoiceNumber, invoiceDate, advisorName)
			currentY = 60
		}
		doc.text(line, margin, currentY)
		currentY += 5
	})
	currentY += 5
	
	// Payment table
	if (currentY > pageHeight - 40) {
		doc.addPage()
		const newTotalPages = doc.getNumberOfPages()
		addInvoiceHeader(doc, newTotalPages, newTotalPages, invoice.invoiceNumber, invoiceDate, advisorName)
		currentY = 60
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
		didDrawPage: (data: any) => {
			const totalPages = doc.getNumberOfPages()
			addInvoiceHeader(doc, data.pageNumber, totalPages, invoice.invoiceNumber, invoiceDate, advisorName)
		},
	})
	
	// Final update of page numbers
	const finalTotalPages = doc.getNumberOfPages()
	for (let i = 1; i <= finalTotalPages; i++) {
		doc.setPage(i)
		addInvoiceHeader(doc, i, finalTotalPages, invoice.invoiceNumber, invoiceDate, advisorName)
	}
	
	// Save the PDF
	const fileName = `invoice-${invoice.invoiceNumber}-${
		quotation.Client?.company?.replace(/\s+/g, "-") || "client"
	}.pdf`
	doc.save(fileName)
}

/**
 * Generate invoice PDF (public export)
 * This is the public interface that accepts an invoice object
 * It will use existing data if available, or fetch full data if needed
 */
export async function generateInvoicePDF(invoice: InvoiceWithQuotation) {
	// Check if quotation has services loaded with full service data
	if (
		invoice.quotation &&
		invoice.quotation.services &&
		invoice.quotation.services.length > 0
	) {
		// Check if services have the service object loaded (full data)
		const hasFullServiceData = invoice.quotation.services.every(
			(qs) => qs.service && qs.service.basePrice !== undefined
		)
		
		if (hasFullServiceData) {
			return await generateInvoicePDFInternal(invoice)
		}
	}
	
	// Fetch full invoice data if quotation/services not fully loaded
	const fullInvoice = await getInvoiceFullById(invoice.id)
	if (!fullInvoice) {
		throw new Error("Invoice not found")
	}
	
	return await generateInvoicePDFInternal(fullInvoice as any)
}

/**
 * Generate invoice PDF as base64 string for email attachment
 * This expects a full invoice object with all related data already loaded
 */
export async function generateInvoicePDFBase64(invoice: InvoiceWithQuotation): Promise<string> {
	const doc = new jsPDF()
	const quotation = invoice.quotation
	
	if (!quotation || !quotation.services) {
		throw new Error("Quotation data not available")
	}
	
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const margin = 20
	let currentY = 60
	
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
	const remainingAmount = quotationGrandTotal - invoiceAmount
	
	// Get advisor name
	const advisorName = quotation.createdBy
		? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
		: 'ADMIN'
	
	// Get client info
	const clientName = quotation.Client?.name || ''
	const clientCompany = quotation.Client?.company || ''
	const clientPhone = quotation.Client?.phone || ''
	const clientEmail = quotation.Client?.email || ''
	const clientCompanyRegistrationNumber = quotation.Client?.companyRegistrationNumber || ''
	
	const invoiceDate = formatDate(new Date(invoice.created_at))
	
	addInvoiceHeader(doc, 1, 1, invoice.invoiceNumber, invoiceDate, advisorName)
	
	// Invoice details section
	doc.setFontSize(10)
	doc.setFont("helvetica", "normal")
	
	const leftCol = margin
	const rightCol = pageWidth - margin
	let leftY = currentY
	let rightY = currentY
	
	// Left side - Big bolded INVOICE label
	doc.setFont("helvetica", "bold")
	doc.setFontSize(20)
	doc.text("INVOICE", leftCol, leftY)
	leftY += 8
	
	// Left side - Bill To
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
	leftY += 5
	
	if (clientCompanyRegistrationNumber) {
		doc.text(`REG NO: ${clientCompanyRegistrationNumber}`, leftCol, leftY)
	} else {
		doc.text(`REG NO :`, leftCol, leftY)
	}
	
	// Right side - Invoice details
	doc.text(`INVOICE NO : ${invoice.invoiceNumber}`, rightCol, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`DATE : ${invoiceDate}`, rightCol, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`ADVISOR : ${advisorName}`, rightCol, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`PAGE NO : 1 of 1`, rightCol, rightY, { align: "right" })
	
	currentY = Math.max(leftY, rightY) + 8
	
	// Services table - create a row for each service
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
	
	const tableData: any[] = []
	const rowHeights: number[] = []
	const descCellWidth = 110 - 6
	
	// Calculate row height for each service and create table rows
	allServices.forEach((service, index) => {
		const nameLines = doc.splitTextToSize(service.name, descCellWidth)
		let totalLines = nameLines.length
		
		if (service.description) {
			// Process description - split by newlines and remove bullets
			const processedDesc = service.description
				.split('\n')
				.map(line => line.trim().replace(/^[-•*]\s*/, ''))
				.filter(line => line.length > 0)
				.join('\n')
			const descLines = doc.splitTextToSize(processedDesc, descCellWidth)
			totalLines += descLines.length
			// Add 2px for gap between name and description
			totalLines += 0.5 // 2px gap = 0.5 line spacing
		}
		
		// Calculate row height - use 5px per line for better spacing, add extra padding
		const rowHeight = Math.max(20, totalLines * 5 + 12) // 5px per line + extra padding
		rowHeights.push(rowHeight)
		
		// Add row data - empty string in description column will be rendered by didDrawCell
		tableData.push([
			String(index + 1),
			"", // Empty - will be rendered by didDrawCell
			"1.00", // Package quantity
			service.price.toFixed(2), // Price per package
			service.price.toFixed(2) // Total
		])
	})
	
	// If no individual services, show combined total
	if (allServices.length === 0) {
		const packageQty = 1.00
		const pricePerPackage = subtotal
		const total = quotationGrandTotal
		tableData.push([
			"1",
			"",
			packageQty.toFixed(2),
			pricePerPackage.toFixed(2),
			total.toFixed(2)
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
				// Set row height based on calculated height for each row
				if (data.row.index >= 0 && rowHeights[data.row.index]) {
					// Set minHeight for all cells in the row to ensure consistent row height
					data.cell.minHeight = rowHeights[data.row.index]
					// Also set the row height directly
					if (data.table.body[data.row.index]) {
						data.table.body[data.row.index].height = rowHeights[data.row.index]
					}
				}
			},
			willDrawCell: (data: any) => {
				// Ensure row height is applied before drawing
				if (data.row.index >= 0 && rowHeights[data.row.index]) {
					data.cell.height = rowHeights[data.row.index]
				}
			},
			didDrawCell: (data: any) => {
				// Only render for body rows, not header rows
				if (data.column.index === 1 && data.row.index >= 0 && data.row.section === 'body') {
					const serviceIndex = data.row.index
					const service = allServices[serviceIndex]
					
					if (service) {
						const cellWidth = data.cell.width - 6
						const x = data.cell.x + 3
						let y = data.cell.y + 5
						// Use calculated row height or cell height, whichever is larger
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
						
						// Add small gap between name and description
						if (service.description) {
							y += 2
						}
						
						// Draw description in normal font (always show if it exists)
						if (service.description) {
							doc.setFont("helvetica", "normal")
							doc.setFontSize(9)
							doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
							// Process description - split by newlines and remove bullets
							let processedDesc = service.description
								.split('\n')
								.map(line => line.trim().replace(/^[-•*]\s*/, ''))
								.filter(line => line.length > 0)
								.join('\n')
							
							// If processing removed everything, use original description
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
			didDrawPage: (data: any) => {
				const totalPages = doc.getNumberOfPages()
				addInvoiceHeader(doc, data.pageNumber, totalPages, invoice.invoiceNumber, invoiceDate, advisorName)
			},
		})
		
		currentY = (doc as any).lastAutoTable.finalY + 10
	}
	
	const totalPages = doc.getNumberOfPages()
	
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i)
		addInvoiceHeader(doc, i, totalPages, invoice.invoiceNumber, invoiceDate, advisorName)
		
		if (i === 1) {
			doc.setFontSize(10)
			doc.setFont("helvetica", "normal")
			doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
			const rightCol = pageWidth - margin
			let rightY = 60
			rightY += 5 // After INVOICE NO
			rightY += 5 // After DATE
			rightY += 5 // After ADVISOR
			doc.text(`PAGE NO : ${i} of ${totalPages}`, rightCol, rightY, { align: "right" })
		}
	}
	
	doc.setPage(totalPages)
	
	if (currentY > pageHeight - 80) {
		doc.addPage()
		const newTotalPages = doc.getNumberOfPages()
		addInvoiceHeader(doc, newTotalPages, newTotalPages, invoice.invoiceNumber, invoiceDate, advisorName)
		currentY = 60
	}
	
	// Totals
	doc.setFontSize(10)
	doc.setFont("helvetica", "normal")
	
	// Total original price
	doc.text("TOTAL ORIGINAL PRICE:", margin, currentY)
	doc.text(`RM${subtotal.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
	// Discount (if applicable)
	if (discountAmount > 0) {
		doc.text("TOTAL DISCOUNT:", margin, currentY)
		doc.text(`RM${discountAmount.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
		currentY += 7
	}
	
	// After discount price
	doc.text("AFTER DISCOUNT PRICE:", margin, currentY)
	doc.text(`RM${quotationGrandTotal.toFixed(2)}`, pageWidth - margin, currentY, { align: "right" })
	currentY += 7
	
	const amountInWords = numberToWords(invoiceAmount)
	const wordsText = `RINGGIT MALAYSIA : ${amountInWords} ONLY`
	const wordsLines = doc.splitTextToSize(wordsText, pageWidth - 2 * margin)
	wordsLines.forEach((line: string) => {
		if (currentY > pageHeight - 30) {
			doc.addPage()
			const newTotalPages = doc.getNumberOfPages()
			addInvoiceHeader(doc, newTotalPages, newTotalPages, invoice.invoiceNumber, invoiceDate, advisorName)
			currentY = 60
		}
		doc.text(line, margin, currentY)
		currentY += 5
	})
	currentY += 5
	
	// Payment table
	if (currentY > pageHeight - 40) {
		doc.addPage()
		const newTotalPages = doc.getNumberOfPages()
		addInvoiceHeader(doc, newTotalPages, newTotalPages, invoice.invoiceNumber, invoiceDate, advisorName)
		currentY = 60
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
		didDrawPage: (data: any) => {
			const totalPages = doc.getNumberOfPages()
			addInvoiceHeader(doc, data.pageNumber, totalPages, invoice.invoiceNumber, invoiceDate, advisorName)
		},
	})
	
	const finalTotalPages = doc.getNumberOfPages()
	for (let i = 1; i <= finalTotalPages; i++) {
		doc.setPage(i)
		addInvoiceHeader(doc, i, finalTotalPages, invoice.invoiceNumber, invoiceDate, advisorName)
	}
	
	// Return as base64 string
	return doc.output('datauristring').split(',')[1]
}


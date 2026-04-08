import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatNumber } from "@/lib/format-number"
import type { InvoiceWithQuotation } from "../types"
import { getInvoiceFullById } from "../action"

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

// Line height used when rendering service description text (mm)
const DESC_LINE_HEIGHT = 4
// Vertical gap rendered for blank lines in descriptions (mm)
const DESC_BLANK_LINE_GAP = 3

/**
 * Sanitize user-entered text for jsPDF (Helvetica/built-in fonts only support Latin-1).
 * Replaces common Unicode bullet/symbol characters with ASCII equivalents so they
 * render correctly instead of appearing as boxes or being silently dropped.
 */
function sanitizePdfText(text: string): string {
  return text
    // Zero-width / invisible characters -> remove entirely
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")   // ZWSP, ZWNJ, ZWJ, BOM
    .replace(/[\u2060\u2061\u2062\u2063]/g, "")     // Word Joiner, invisible operators
    .replace(/[\u00AD]/g, "")                        // Soft Hyphen
    // Unicode spaces -> normal ASCII space
    .replace(/[\u2000-\u200A]/g, " ")  // EN QUAD through HAIR SPACE
    .replace(/\u202F/g, " ")           // NARROW NO-BREAK SPACE
    .replace(/\u205F/g, " ")           // MEDIUM MATHEMATICAL SPACE
    .replace(/\u3000/g, " ")           // IDEOGRAPHIC SPACE
    .replace(/\u00A0/g, " ")           // NO-BREAK SPACE
    // Bullet-like characters -> ASCII bullet (U+00B7, within Latin-1)
    .replace(/[\u2022\u2023\u2043\u2981\u25CF\u25E6\u2219\u2981]/g, "\u00B7")
    // Cross / check marks -> ASCII equivalents
    .replace(/[\u2716\u2717\u2718]/g, "x")
    .replace(/[\u2713\u2714]/g, "v")
    .replace(/\u2705/g, "[OK]")
    .replace(/\u274C/g, "[X]")
    // Arrows
    .replace(/[\u2190]/g, "<-")  // ←
    .replace(/[\u2192]/g, "->")  // →
    .replace(/[\u2194]/g, "<->") // ↔
    // Common typographic marks
    .replace(/\u2014/g, "--")     // — EM DASH
    .replace(/\u2013/g, "-")      // – EN DASH
    .replace(/[\u2018\u2019\u201A]/g, "'")  // Curly single quotes
    .replace(/[\u201C\u201D\u201E]/g, '"')  // Curly double quotes
    .replace(/\u2026/g, "...")    // … HORIZONTAL ELLIPSIS
    .replace(/\u2011/g, "-")      // NON-BREAKING HYPHEN
    // Misc symbols
    .replace(/\u00AE/g, "(R)")    // ® REGISTERED SIGN
    .replace(/\u2122/g, "(TM)")   // ™ TRADE MARK
    .replace(/\u00A9/g, "(C)")    // © COPYRIGHT
    // Strip any remaining non-Latin-1 characters (silently remove instead of inserting ?)
    .replace(/[^\x00-\xFF]/g, "");
}

/** Split service description into individual lines preserving dashes, numbering, and blank lines. */
function splitDescriptionLines(description: string): string[] {
  return sanitizePdfText(description).split('\n').map(line => line.trimEnd())
}

/**
 * Measure the height (mm) needed to render pre-split description lines
 * when each line is wrapped to fit within cellWidth.
 * Blank lines are treated as spacing gaps.
 */
function measureDescriptionHeight(
  doc: jsPDF,
  lines: string[],
  cellWidth: number
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

/**
 * Render description lines into PDF preserving dashes, numbering, and blank-line spacing.
 * Returns the final y position after rendering.
 */
function renderDescriptionLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  startY: number,
  cellWidth: number,
  maxY: number
): number {
  let y = startY
  for (const line of lines) {
    if (y > maxY) break
    if (line.length === 0) {
      y += DESC_BLANK_LINE_GAP
      continue
    }
    const wrapped = doc.splitTextToSize(line, cellWidth)
    for (const wl of wrapped) {
      if (y > maxY) break
      doc.text(wl, x, y)
      y += DESC_LINE_HEIGHT
    }
  }
  return y
}

// Client info type for Bill To section (includes Company Reg No and IC for PDF output)
type ClientInfoPdf = { name: string; company: string; phone: string; email: string; companyRegistrationNumber?: string; ic?: string }

// Info box dimensions
const INFO_BOX_HEIGHT = 36
const INFO_BOX_START_Y = CONTENT_START_Y
const CONTENT_AFTER_INFO_BOX_Y = CONTENT_START_Y + INFO_BOX_HEIGHT + 8

// Add header to every page (logo on left, company info to the right)
function addInvoiceHeader(
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

// Add invoice info box to every page (INVOICE label, Bill To, INVOICE NO, DATE, ADVISOR, PAGE NO)
function addInvoiceInfoBox(
	doc: jsPDF,
	pageNumber: number,
	totalPages: number,
	invoiceNumber: string,
	invoiceDate: string,
	advisorName: string,
	clientInfo: ClientInfoPdf
) {
	const pageWidth = doc.internal.pageSize.getWidth()
	const margin = 20
	const rightCol = pageWidth - margin

	// Clear the area first (white background)
	doc.setFillColor(255, 255, 255)
	doc.rect(margin, INFO_BOX_START_Y, pageWidth - 2 * margin, INFO_BOX_HEIGHT, "F")
	
	let leftY = INFO_BOX_START_Y + 6
	let rightY = INFO_BOX_START_Y + 6
	
	// Left side - Big bolded INVOICE label
	doc.setFont("helvetica", "bold")
	doc.setFontSize(16)
	doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
	doc.text("INVOICE", margin + 3, leftY)
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
	leftY += 4

	doc.text(`COMPANY REG. NO: ${clientInfo.companyRegistrationNumber || 'N/A'}`, margin + 3, leftY)
	leftY += 4

	doc.text(`IC: ${clientInfo.ic || 'N/A'}`, margin + 3, leftY)

	// Right side - Invoice details (right-aligned)
	doc.setFontSize(9)
	doc.setFont("helvetica", "normal")
	doc.text(`INVOICE NO : ${invoiceNumber}`, rightCol - 3, rightY, { align: "right" })
	rightY += 5
	
	doc.text(`DATE : ${invoiceDate}`, rightCol - 3, rightY, { align: "right" })
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

// Add Terms and Conditions section; returns new currentY
function addTermsAndConditions(
	doc: jsPDF,
	startY: number,
	margin: number,
	pageWidth: number,
	pageHeight: number,
	logoBase64: string | null,
	invoiceNumber: string,
	invoiceDate: string,
	advisorName: string,
	clientInfo: ClientInfoPdf
): number {
	const contentWidth = pageWidth - 2 * margin
	let currentY = startY
	currentY += 8
	doc.setFont("helvetica", "bold")
	doc.setFontSize(10)
	doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
	doc.text("Terms And Conditions", margin, currentY)
	currentY += 6

	// Helper to add new page with header and info box
	const addNewPage = () => {
		doc.addPage()
		const newTotalPages = doc.getNumberOfPages()
		addInvoiceHeader(doc, logoBase64)
		addInvoiceInfoBox(doc, newTotalPages, newTotalPages, invoiceNumber, invoiceDate, advisorName, clientInfo)
		return CONTENT_AFTER_INFO_BOX_Y
	}

	// T&C body: single font size so splitTextToSize and render match (avoids overflow after page break)
	const TC_FONT_SIZE = 8
	for (const paragraph of TERMS_AND_CONDITIONS) {
		if (currentY > pageHeight - 25) {
			currentY = addNewPage()
		}
		doc.setFont("helvetica", "normal")
		doc.setFontSize(TC_FONT_SIZE)
		doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
		const lines = doc.splitTextToSize(paragraph, contentWidth)
		for (const line of lines) {
			if (currentY > pageHeight - 25) {
				currentY = addNewPage()
				doc.setFont("helvetica", "normal")
				doc.setFontSize(TC_FONT_SIZE)
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
		currentY = addNewPage()
	}
	doc.setFont("helvetica", "bold")
	doc.setFontSize(10)
	doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
	const paymentLines = doc.splitTextToSize(PAYMENT_INFO, contentWidth)
	for (const line of paymentLines) {
		if (currentY > pageHeight - 25) {
			currentY = addNewPage()
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
	
	// Calculate quotation totals
	const regularServices = quotation.services.filter((qs) => !qs.customServiceId)
	const servicesTotal = regularServices.reduce(
		(sum, serviceItem) => {
			const qs = serviceItem as { price?: number; quantity?: number; service: { basePrice: number } };
			return sum + (qs.price != null ? qs.price * (qs.quantity ?? 1) : qs.service.basePrice);
		},
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
	
	// Balance as of this invoice: only subtract invoices with document date on or before this invoice's invoiceDate
	const allQuotationInvoices = (quotation.invoices || []) as { id: string; amount: number; invoiceDate?: Date }[]
	const thisInvoiceDocTime = new Date(invoice.invoiceDate).getTime()
	const invoicesUpToThis = allQuotationInvoices.filter(
		(inv) => !inv.invoiceDate || new Date(inv.invoiceDate).getTime() <= thisInvoiceDocTime
	)
	const totalPaid = invoicesUpToThis.reduce((sum, inv) => sum + inv.amount, 0)
	const balance = Math.max(0, quotationGrandTotal - totalPaid)
	// Paid (Previous Invoice): sum of invoices created before this one (exclude this invoice by id)
	const paidPreviousInvoice = invoicesUpToThis
		.filter((inv) => inv.id !== invoice.id)
		.reduce((sum, inv) => sum + inv.amount, 0)
	
	// Get advisor name (advisors join table with fallback to createdBy)
	const quotationAdvisors = (quotation as any).advisors as Array<any> | undefined
	const advisorName = quotationAdvisors && quotationAdvisors.length > 0
		? quotationAdvisors.map((a: any) => {
			const u = a.user ?? a
			return `${u.firstName || ''} ${u.lastName || ''}`.trim()
		}).join(', ')
		: quotation.createdBy
			? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
			: 'ADMIN'

	// Get client info (Client may include ic from Prisma; type allows optional ic for PDF)
	const client = quotation.Client
	const clientInfo: ClientInfoPdf = {
		name: client?.name || '',
		company: client?.company || '',
		phone: client?.phone || '',
		email: client?.email || '',
		companyRegistrationNumber: client?.companyRegistrationNumber ?? undefined,
		ic: client && 'ic' in client ? (client as { ic?: string | null }).ic ?? undefined : undefined,
	}

	const invoiceDate = formatDate(new Date(invoice.invoiceDate))
	
	// Add header and info box to first page
	addInvoiceHeader(doc, logoBase64)
	addInvoiceInfoBox(doc, 1, 1, invoice.invoiceNumber, invoiceDate, advisorName, clientInfo)
	
	// Start content after the info box
	let currentY = CONTENT_AFTER_INFO_BOX_Y
	
	// Combine all services — sanitize name and description here so every downstream
	// code path (cellText → tableData, splitTextToSize, didDrawCell) uses clean text.
	const allServices = [
		...regularServices.map((s) => {
			const qs = s as { price?: number; quantity?: number; service: { name: string; description?: string | null; basePrice: number } };
			const price = qs.price != null ? qs.price : qs.service.basePrice;
			const quantity = qs.quantity ?? 1;
			return {
				name: sanitizePdfText(qs.service.name),
				description: sanitizePdfText(qs.service.description || ""),
				price,
				quantity,
				type: "service",
			};
		}),
		...(quotation.customServices || []).filter(cs => cs.status === "APPROVED").map((cs) => ({
			name: sanitizePdfText(cs.name),
			description: sanitizePdfText(cs.description || ""),
			price: cs.price,
			type: "custom",
		})),
	]
	
	// Services table
	const tableData: (string | number)[][] = []
	const rowHeights: number[] = []
	// Use the actual column width autoTable will assign (must match columnStyles below)
	const descColWidth = (pageWidth - 2 * margin) / 15 * 7
	const descCellWidth = descColWidth - 6 // Subtract cell padding (3 left + 3 right)
	
	allServices.forEach((service, index) => {
		// Measure name height (bold 9pt)
		doc.setFont("helvetica", "bold")
		doc.setFontSize(9)
		const nameLines = doc.splitTextToSize(service.name, descCellWidth)
		let contentHeight = nameLines.length * DESC_LINE_HEIGHT
		
		if (service.description) {
			// Gap between name and description
			contentHeight += 2
			// Measure description height (normal 9pt), preserving dashes and blank lines
			doc.setFont("helvetica", "normal")
			doc.setFontSize(9)
			const descLines = splitDescriptionLines(service.description)
			contentHeight += measureDescriptionHeight(doc, descLines, descCellWidth)
		}
		
		// Add cell padding (5 top + 5 bottom)
		const rowHeight = Math.max(20, contentHeight + 10)
		rowHeights.push(rowHeight)
		
		// Put actual text in description cell so autoTable calculates correct row height
		// and can split tall rows across pages. Text rendering is suppressed in willDrawCell;
		// formatted bold name + normal description is drawn in didDrawCell.
		const cellText = service.description
			? `${service.name}\n${service.description}`
			: service.name
		const qty = (service as { quantity?: number }).quantity ?? 1;
		tableData.push([
			String(index + 1),
			cellText,
			formatNumber(qty),
			formatNumber(service.price),
			formatNumber(service.price * qty)
		])
	})

	// Track content offset per row for rows that autoTable splits across pages
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
			margin: { left: margin, right: margin, top: CONTENT_AFTER_INFO_BOX_Y, bottom: 25 },
			styles: {
				cellPadding: 3,
				lineWidth: 0.1,
				lineColor: [0, 0, 0],
				overflow: 'linebreak',
			},
			didParseCell: (data: any) => {
				// Set minHeight so autoTable allocates enough space for our custom content.
				// Do NOT force row.height — autoTable must be free to split tall rows across pages.
				if (data.row.index >= 0 && data.row.section === 'body' && rowHeights[data.row.index]) {
					data.cell.minHeight = rowHeights[data.row.index]
				}
			},
			willDrawCell: (data: any) => {
				// Suppress default text rendering for description column;
				// formatted bold name + normal description is drawn in didDrawCell.
				if (data.column.index === 1 && data.row.index >= 0 && data.row.section === 'body') {
					data.cell.text = []
				}
			},
			didDrawCell: (data: any) => {
				// Custom rendering for description column (bold name + normal description).
				// Handles rows that autoTable splits across multiple pages via content-offset tracking.
				if (data.column.index === 1 && data.row.index >= 0 && data.row.section === 'body') {
					const serviceIndex = data.row.index
					const service = allServices[serviceIndex]
					if (!service) return

					const cellWidth = data.cell.width - 6 // 3 left + 3 right padding
					const x = data.cell.x + 3
					const topPad = 5
					const botPad = 2
					let renderY = data.cell.y + topPad
					const maxRenderY = data.cell.y + data.cell.height - botPad

				const contentOffset = rowPageOffsets.get(serviceIndex) || 0
				let virtualY = 0
				let lastRenderedBottom = contentOffset

				// --- Name (bold) ---
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

				// --- Description (normal) ---
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

				// Update offset using actual last rendered content bottom, not estimated usableHeight.
				rowPageOffsets.set(serviceIndex, lastRenderedBottom)
				return false
				}
			},
		didDrawPage: (data: { pageNumber: number }) => {
			const totalPages = doc.getNumberOfPages()
			addInvoiceHeader(doc, logoBase64)
			addInvoiceInfoBox(doc, data.pageNumber, totalPages, invoice.invoiceNumber, invoiceDate, advisorName, clientInfo)
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
	addInvoiceHeader(doc, logoBase64)
	addInvoiceInfoBox(doc, totalPages, totalPages, invoice.invoiceNumber, invoiceDate, advisorName, clientInfo)
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
	
const amountInWords = numberToWords(invoiceAmount)
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
	head: [["Paid (Previous Invoice)", "Current Payment", "Balance"]],
	body: [[formatNumber(paidPreviousInvoice), formatNumber(invoiceAmount), formatNumber(balance)]],
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
		0: { cellWidth: (pageWidth - 2 * margin) / 3, halign: "center" },
		1: { cellWidth: (pageWidth - 2 * margin) / 3, halign: "center" },
		2: { cellWidth: (pageWidth - 2 * margin) / 3, halign: "center" },
	},
	margin: { left: margin, right: margin },
	styles: {
		cellPadding: 5,
		lineWidth: 0.1,
		lineColor: [0, 0, 0],
	},
	didDrawPage: (data: { pageNumber: number }) => {
		addInvoiceHeader(doc, logoBase64)
		addInvoiceInfoBox(doc, data.pageNumber, doc.getNumberOfPages(), invoice.invoiceNumber, invoiceDate, advisorName, clientInfo)
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
	logoBase64,
	invoice.invoiceNumber,
	invoiceDate,
	advisorName,
	clientInfo
)

// Final update of page numbers on all pages (header + info box)
const finalTotalPages = doc.getNumberOfPages()
for (let i = 1; i <= finalTotalPages; i++) {
	doc.setPage(i)
	addInvoiceHeader(doc, logoBase64)
	addInvoiceInfoBox(doc, i, finalTotalPages, invoice.invoiceNumber, invoiceDate, advisorName, clientInfo)
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
	const fullInvoice = await getInvoiceFullById(invoice.id)
	if (!fullInvoice) {
		throw new Error("Invoice not found")
	}
	return _generateInvoicePDFInternal(fullInvoice as unknown as InvoiceWithQuotation)
}

/** Full invoice shape returned by getInvoiceFullById (used for from-full PDF generation). */
type FullInvoiceFromDb = NonNullable<Awaited<ReturnType<typeof getInvoiceFullById>>>

/**
 * Generate invoice PDF from already-fetched full invoice (no refetch).
 * Use from send-email flow to avoid duplicate DB round-trip.
 */
export async function generateInvoicePDFBase64FromFull(fullInvoice: FullInvoiceFromDb): Promise<string> {
	return _generateInvoicePDFInternal(fullInvoice as unknown as InvoiceWithQuotation)
}

async function _generateInvoicePDFInternal(fullInvoice: InvoiceWithQuotation): Promise<string> {
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
	
	// Balance as of this invoice: document dates (invoiceDate)
	const allQuotationInvoices = (quotation as { invoices?: { id: string; amount: number; status: string; invoiceDate?: Date }[] }).invoices || []
	const thisInvoiceDocTime = new Date(fullInvoice.invoiceDate).getTime()
	const invoicesUpToThis = allQuotationInvoices.filter(
		(inv) => !inv.invoiceDate || new Date(inv.invoiceDate).getTime() <= thisInvoiceDocTime
	)
	const totalPaid = invoicesUpToThis.reduce((sum, inv) => sum + inv.amount, 0)
	const balance = Math.max(0, quotationGrandTotal - totalPaid)
	// Paid (Previous Invoice): sum of invoices created before this one (exclude this invoice by id)
	const paidPreviousInvoice = invoicesUpToThis
		.filter((inv) => inv.id !== fullInvoice.id)
		.reduce((sum, inv) => sum + inv.amount, 0)
	
	// Get advisor name (advisors join table with fallback to createdBy)
	const quotationAdvisors2 = (quotation as any).advisors as Array<any> | undefined
	const advisorName = quotationAdvisors2 && quotationAdvisors2.length > 0
		? quotationAdvisors2.map((a: any) => {
			const u = a.user ?? a
			return `${u.firstName || ''} ${u.lastName || ''}`.trim()
		}).join(', ')
		: quotation.createdBy
			? `${quotation.createdBy.firstName || ''} ${quotation.createdBy.lastName || ''}`.trim()
			: 'ADMIN'

	const client = quotation.Client
	const clientInfo: ClientInfoPdf = {
		name: client?.name || '',
		company: client?.company || '',
		phone: client?.phone || '',
		email: client?.email || '',
		companyRegistrationNumber: client?.companyRegistrationNumber ?? undefined,
		ic: client && 'ic' in client ? (client as { ic?: string | null }).ic ?? undefined : undefined,
	}

	const invoiceDate = formatDate(new Date(fullInvoice.invoiceDate))
	
	// Add header and info box to first page
	addInvoiceHeader(doc, logoBase64)
	addInvoiceInfoBox(doc, 1, 1, fullInvoice.invoiceNumber, invoiceDate, advisorName, clientInfo)
	
	// Start content after the info box
	let currentY = CONTENT_AFTER_INFO_BOX_Y
	
	// Sanitize name and description so every downstream code path uses clean text.
	const allServices = [
		...regularServices.map((s) => ({
			name: sanitizePdfText(s.service.name),
			description: sanitizePdfText(s.service.description || ""),
			price: s.service.basePrice,
		})),
		...(quotation.customServices || []).filter(cs => cs.status === "APPROVED").map((cs) => ({
			name: sanitizePdfText(cs.name),
			description: sanitizePdfText(cs.description || ""),
			price: cs.price,
		})),
	]
	
	const tableData: string[][] = []
	const rowHeights: number[] = []
	// Use the actual column width autoTable will assign (must match columnStyles below)
	const descColWidth = (pageWidth - 2 * margin) / 15 * 7
	const descCellWidth = descColWidth - 6 // Subtract cell padding (3 left + 3 right)
	
	allServices.forEach((service, index) => {
		// Measure name height (bold 9pt)
		doc.setFont("helvetica", "bold")
		doc.setFontSize(9)
		const nameLines = doc.splitTextToSize(service.name, descCellWidth)
		let contentHeight = nameLines.length * DESC_LINE_HEIGHT
		
		if (service.description) {
			// Gap between name and description
			contentHeight += 2
			// Measure description height (normal 9pt), preserving dashes and blank lines
			doc.setFont("helvetica", "normal")
			doc.setFontSize(9)
			const descLines = splitDescriptionLines(service.description)
			contentHeight += measureDescriptionHeight(doc, descLines, descCellWidth)
		}
		
		// Add cell padding (5 top + 5 bottom)
		const rowHeight = Math.max(20, contentHeight + 10)
		rowHeights.push(rowHeight)
		
		// Put actual text in description cell so autoTable calculates correct row height
		// and can split tall rows across pages. Text rendering is suppressed in willDrawCell;
		// formatted bold name + normal description is drawn in didDrawCell.
		const cellText = service.description
			? `${service.name}\n${service.description}`
			: service.name
		tableData.push([String(index + 1), cellText, "1.00", formatNumber(service.price), formatNumber(service.price)])
	})

	// Track content offset per row for rows that autoTable splits across pages
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
			headStyles: { fillColor: PRIMARY_COLOR, textColor: WHITE, fontSize: 9, fontStyle: "bold", lineWidth: 0.1 },
			bodyStyles: { fontSize: 9, textColor: BLACK, lineWidth: 0.1 },
			columnStyles: {
				0: { cellWidth: (pageWidth - 2 * margin) / 15 * 1, halign: "center" },
				1: { cellWidth: (pageWidth - 2 * margin) / 15 * 7, cellPadding: { top: 5, right: 3, bottom: 5, left: 3 }, valign: 'top' },
				2: { cellWidth: (pageWidth - 2 * margin) / 15 * 2, halign: "right" },
				3: { cellWidth: (pageWidth - 2 * margin) / 15 * 3, halign: "right" },
				4: { cellWidth: (pageWidth - 2 * margin) / 15 * 2, halign: "right" },
			},
			margin: { left: margin, right: margin, top: CONTENT_AFTER_INFO_BOX_Y, bottom: 25 },
			styles: { cellPadding: 3, lineWidth: 0.1, lineColor: [0, 0, 0], overflow: 'linebreak' },
			didParseCell: (data: any) => {
				// Set minHeight so autoTable allocates enough space for our custom content.
				// Do NOT force row.height — autoTable must be free to split tall rows across pages.
				if (data.row.index >= 0 && data.row.section === 'body' && rowHeights[data.row.index]) {
					data.cell.minHeight = rowHeights[data.row.index]
				}
			},
			willDrawCell: (data: any) => {
				// Suppress default text rendering for description column;
				// formatted bold name + normal description is drawn in didDrawCell.
				if (data.column.index === 1 && data.row.index >= 0 && data.row.section === 'body') {
					data.cell.text = []
				}
			},
			didDrawCell: (data: any) => {
				// Custom rendering for description column (bold name + normal description).
				// Handles rows that autoTable splits across multiple pages via content-offset tracking.
				if (data.column.index === 1 && data.row.index >= 0 && data.row.section === 'body') {
					const serviceIndex = data.row.index
					const service = allServices[serviceIndex]
					if (!service) return

					const cellWidth = data.cell.width - 6 // 3 left + 3 right padding
					const x = data.cell.x + 3
					const topPad = 5
					const botPad = 2
					let renderY = data.cell.y + topPad
					const maxRenderY = data.cell.y + data.cell.height - botPad

				const contentOffset = rowPageOffsets.get(serviceIndex) || 0
				let virtualY = 0
				let lastRenderedBottom = contentOffset

				// --- Name (bold) ---
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

				// --- Description (normal) ---
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

				// Update offset using actual last rendered content bottom, not estimated usableHeight.
				rowPageOffsets.set(serviceIndex, lastRenderedBottom)
				return false
				}
			},
		didDrawPage: (data: any) => {
			addInvoiceHeader(doc, logoBase64)
			addInvoiceInfoBox(doc, data.pageNumber, doc.getNumberOfPages(), fullInvoice.invoiceNumber, invoiceDate, advisorName, clientInfo)
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
	addInvoiceHeader(doc, logoBase64)
	addInvoiceInfoBox(doc, totalPages, totalPages, fullInvoice.invoiceNumber, invoiceDate, advisorName, clientInfo)
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
	
const wordsLines = doc.splitTextToSize(`RINGGIT MALAYSIA : ${numberToWords(invoiceAmount)} ONLY`, contentWidth)
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
	head: [["Paid (Previous Invoice)", "Current Payment", "Balance"]],
	body: [[formatNumber(paidPreviousInvoice), formatNumber(invoiceAmount), formatNumber(balance)]],
	theme: "grid",
	headStyles: { fillColor: PRIMARY_COLOR, textColor: WHITE, fontSize: 9, fontStyle: "bold", lineWidth: 0.1 },
	bodyStyles: { fontSize: 9, textColor: BLACK, lineWidth: 0.1 },
	columnStyles: { 0: { cellWidth: (pageWidth - 2 * margin) / 3, halign: "center" }, 1: { cellWidth: (pageWidth - 2 * margin) / 3, halign: "center" }, 2: { cellWidth: (pageWidth - 2 * margin) / 3, halign: "center" } },
	margin: { left: margin, right: margin },
	styles: { cellPadding: 5, lineWidth: 0.1, lineColor: [0, 0, 0] },
	didDrawPage: (data: { pageNumber: number }) => {
		addInvoiceHeader(doc, logoBase64)
		addInvoiceInfoBox(doc, data.pageNumber, doc.getNumberOfPages(), fullInvoice.invoiceNumber, invoiceDate, advisorName, clientInfo)
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
currentY = addTermsAndConditions(doc, currentY, margin, pageWidth, pageHeight, logoBase64, fullInvoice.invoiceNumber, invoiceDate, advisorName, clientInfo)

// Final update of page numbers on all pages (header + info box)
const finalTotalPages = doc.getNumberOfPages()
for (let i = 1; i <= finalTotalPages; i++) {
	doc.setPage(i)
	addInvoiceHeader(doc, logoBase64)
	addInvoiceInfoBox(doc, i, finalTotalPages, fullInvoice.invoiceNumber, invoiceDate, advisorName, clientInfo)
}
	
	return doc.output('datauristring').split(',')[1]
}

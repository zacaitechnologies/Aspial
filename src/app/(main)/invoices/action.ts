"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore, unstable_cache, revalidateTag } from "next/cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"

// Internal function - not cached, used by cached version
async function _getInvoicesPaginatedInternal(
	page: number = 1,
	pageSize: number = 10,
	filters: {
		typeFilter?: string
	} = {}
) {
	const skip = (page - 1) * pageSize
	const { typeFilter } = filters

	// Build where clause
	const where: any = {}
	if (typeFilter && typeFilter !== 'all') {
		where.type = typeFilter
	}

	// Execute count and findMany in parallel for better performance
	const [total, invoices] = await Promise.all([
		prisma.invoice.count({ where }),
		prisma.invoice.findMany({
			where,
			select: {
				id: true,
				invoiceNumber: true,
				type: true,
				amount: true,
				quotationId: true,
				created_at: true,
				updated_at: true,
				quotation: {
					select: {
						id: true,
						name: true,
						description: true,
						totalPrice: true,
						workflowStatus: true,
						Client: {
							select: {
								id: true,
								name: true,
								email: true,
								company: true,
							},
						},
					},
				},
				createdBy: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						supabase_id: true,
						created_at: true,
						updated_at: true,
					},
				},
			},
			orderBy: { created_at: "desc" },
			skip,
			take: pageSize,
		})
	])

	// Transform data
	const transformedInvoices = invoices.map(invoice => ({
		id: invoice.id,
		invoiceNumber: invoice.invoiceNumber,
		type: invoice.type,
		amount: invoice.amount,
		quotationId: invoice.quotationId,
		created_at: invoice.created_at,
		updated_at: invoice.updated_at,
		quotation: invoice.quotation ? {
			id: invoice.quotation.id,
			name: invoice.quotation.name,
			description: invoice.quotation.description,
			totalPrice: invoice.quotation.totalPrice,
			workflowStatus: invoice.quotation.workflowStatus,
		} : null,
		createdBy: invoice.createdBy,
		Client: invoice.quotation?.Client || null,
	}))

	return {
		data: transformedInvoices,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
	}
}

// Server-side cached version for initial page load (30 second cache)
const getCachedInvoicesPaginated = unstable_cache(
	_getInvoicesPaginatedInternal,
	["invoices-paginated"],
	{
		revalidate: 30,
		tags: ["invoices"],
	}
)

// Client-side version that bypasses cache
export async function getInvoicesPaginated(
	page: number = 1,
	pageSize: number = 10,
	filters: {
		typeFilter?: string
	} = {},
	useCache: boolean = false
) {
	unstable_noStore()
	if (useCache) {
		return await getCachedInvoicesPaginated(page, pageSize, filters)
	}
	return await _getInvoicesPaginatedInternal(page, pageSize, filters)
}

// Fresh version that always bypasses cache (for client-side updates)
export async function getInvoicesPaginatedFresh(
	page: number = 1,
	pageSize: number = 10,
	filters: {
		typeFilter?: string
	} = {}
) {
	unstable_noStore()
	return await _getInvoicesPaginatedInternal(page, pageSize, filters)
}

// Invalidate invoices cache
export async function invalidateInvoicesCache() {
	revalidateTag("invoices", "max")
}

/**
 * Get invoice by ID with basic relations (lightweight version)
 * Used for list views and quick access
 */
export async function getInvoiceById(id: string) {
	unstable_noStore()
	const invoice = await prisma.invoice.findUnique({
		where: { id },
		include: {
			quotation: {
				include: {
					services: {
						include: {
							service: true,
						},
					},
					project: true,
					createdBy: true,
					Client: true,
					customServices: true,
				},
			},
			createdBy: true,
		},
	})

	if (!invoice) {
		return null
	}

	return invoice
}

/**
 * Get full invoice data with all related entities
 * Used for PDF generation, email sending, and viewing
 */
export async function getInvoiceFullById(id: string) {
	unstable_noStore()
	const invoice = await prisma.invoice.findUnique({
		where: { id },
		include: {
			quotation: {
				include: {
					services: {
						include: {
							service: true,
						},
					},
					project: true,
					createdBy: true,
					Client: true,
					customServices: {
						include: {
							createdBy: {
								select: {
									firstName: true,
									lastName: true,
									email: true,
								},
							},
							reviewedBy: {
								select: {
									firstName: true,
									lastName: true,
									email: true,
								},
							},
						},
					},
				},
			},
			createdBy: true,
		},
	})

	if (!invoice) {
		return null
	}

	return invoice
}

/**
 * Generate invoice number based on type
 * SO-00001 (minimum 5 digits)
 * EPO-N0001 (minimum 4 digits)
 * EO-N0001 (minimum 4 digits)
 * This function must be called within a transaction to prevent race conditions
 */
async function generateInvoiceNumber(tx: any, type: "SO" | "EPO" | "EO"): Promise<string> {
	// Find the last invoice of this type
	const lastInvoice = await tx.invoice.findFirst({
		where: {
			type: type,
		},
		orderBy: {
			created_at: 'desc'
		},
		select: {
			invoiceNumber: true
		}
	})

	let nextNumber = 1

	if (lastInvoice) {
		// Extract the number from the last invoice
		let numericPart: string
		
		if (type === "SO") {
			// Format: SO-00001
			numericPart = lastInvoice.invoiceNumber.replace("SO-", "")
		} else if (type === "EPO") {
			// Format: EPO-N0001
			numericPart = lastInvoice.invoiceNumber.replace("EPO-N", "")
		} else {
			// Format: EO-N0001
			numericPart = lastInvoice.invoiceNumber.replace("EO-N", "")
		}

		const lastNumber = parseInt(numericPart, 10)
		if (!isNaN(lastNumber)) {
			nextNumber = lastNumber + 1
		}
	}

	// Format based on type
	if (type === "SO") {
		// Minimum 5 digits
		return `SO-${String(nextNumber).padStart(5, '0')}`
	} else if (type === "EPO") {
		// Minimum 4 digits
		return `EPO-N${String(nextNumber).padStart(4, '0')}`
	} else {
		// Minimum 4 digits
		return `EO-N${String(nextNumber).padStart(4, '0')}`
	}
}

export async function createInvoice(data: {
	quotationId: number
	type: "SO" | "EPO" | "EO"
	amount: number
	createdById: string
}) {
	// Validate amount
	if (data.amount <= 0) {
		throw new Error("Invoice amount must be greater than 0")
	}

	// Get current user for createdById
	const user = await getCachedUser()
	if (!user) {
		throw new Error("User must be authenticated to create an invoice")
	}

	return await prisma.$transaction(async (tx) => {
		// Get quotation to validate it exists and check total
		const quotation = await tx.quotation.findUnique({
			where: { id: data.quotationId },
			include: {
				services: {
					include: {
						service: true,
					},
				},
				customServices: true,
			},
		})

		if (!quotation) {
			throw new Error("Quotation not found")
		}

		// Calculate quotation grand total
		const regularServices = quotation.services.filter((qs) => !qs.customServiceId)
		const servicesTotal = regularServices.reduce(
			(sum, serviceItem) => sum + serviceItem.service.basePrice,
			0
		)
		const approvedCustomServicesTotal = quotation.customServices
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

		const grandTotal = subtotal - discountAmount

		// Warn if amount exceeds quotation total (but allow it)
		if (data.amount > grandTotal) {
			// We'll let the frontend handle the warning, but still allow creation
			console.warn(`Invoice amount (${data.amount}) exceeds quotation total (${grandTotal})`)
		}

		// Generate invoice number within transaction
		const invoiceNumber = await generateInvoiceNumber(tx, data.type)

		const invoice = await tx.invoice.create({
			data: {
				invoiceNumber,
				type: data.type,
				quotationId: data.quotationId,
				amount: data.amount,
				createdById: data.createdById,
			},
			include: {
				quotation: {
					include: {
						Client: true,
					},
				},
				createdBy: true,
			},
		})

		return invoice
	})
}

/**
 * Send invoice PDF via email
 */
export async function sendInvoiceEmail(
	invoiceId: string,
	recipientEmail: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const user = await getCachedUser()
		if (!user) {
			throw new Error("User must be authenticated to send invoice")
		}

		// Get invoice with all related data
		const invoice = await getInvoiceFullById(invoiceId)

		if (!invoice) {
			return { success: false, error: "Invoice not found" }
		}

		// Generate PDF as base64
		const { generateInvoicePDFBase64 } = await import("./utils/pdfExport")
		const pdfBase64 = await generateInvoicePDFBase64(invoice as any)

		// Get Supabase URL and anon key
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

		if (!supabaseUrl || !supabaseAnonKey) {
			return { success: false, error: "Supabase configuration missing" }
		}

		// Call Supabase function to send email
		const functionUrl = `${supabaseUrl}/functions/v1/send-invoice`
		const response = await fetch(functionUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${supabaseAnonKey}`,
			},
			body: JSON.stringify({
				invoiceId: invoice.id,
				invoiceNumber: invoice.invoiceNumber,
				quotationNumber: invoice.quotation.name,
				customerName: invoice.quotation.Client?.name || "Valued Customer",
				customerEmail: recipientEmail,
				clientCompany: invoice.quotation.Client?.company || "",
				amount: invoice.amount,
				pdfBase64: pdfBase64,
				invoiceDate: invoice.created_at.toISOString(),
			}),
		})

		if (!response.ok) {
			const errorData = await response.text()
			console.error("Error sending email:", errorData)
			return { success: false, error: `Failed to send email: ${errorData}` }
		}

		// Record the email in database
		const dbUser = await prisma.user.findUnique({
			where: { supabase_id: user.id },
			select: { id: true },
		})

		if (!dbUser) {
			return { success: false, error: "User not found in database" }
		}

		await prisma.invoiceEmail.create({
			data: {
				invoiceId: invoice.id,
				recipientEmail: recipientEmail,
				sentById: user.id,
			},
		})

		return { success: true }
	} catch (error: any) {
		console.error("Error sending invoice email:", error)
		return { success: false, error: error.message || "Failed to send email" }
	}
}

/**
 * Get email history for an invoice
 */
export async function getInvoiceEmailHistory(
	invoiceId: string
): Promise<
	Array<{
		id: number
		recipientEmail: string
		sentAt: Date
		sentBy: {
			firstName: string
			lastName: string
			email: string
		}
	}>
> {
	try {
		const emails = await prisma.invoiceEmail.findMany({
			where: { invoiceId },
			include: {
				sentBy: {
					select: {
						firstName: true,
						lastName: true,
						email: true,
					},
				},
			},
			orderBy: { sentAt: "desc" },
		})

		return emails.map((email) => ({
			id: email.id,
			recipientEmail: email.recipientEmail,
			sentAt: email.sentAt,
			sentBy: {
				firstName: email.sentBy.firstName,
				lastName: email.sentBy.lastName,
				email: email.sentBy.email,
			},
		}))
	} catch (error) {
		console.error("Error fetching email history:", error)
		return []
	}
}

/**
 * Search quotations for invoice creation
 */
export async function searchQuotationsForInvoice(searchTerm: string) {
	unstable_noStore()
	
	if (!searchTerm || searchTerm.trim().length === 0) {
		return []
	}

	const quotations = await prisma.quotation.findMany({
		where: {
			OR: [
				{ name: { contains: searchTerm, mode: "insensitive" } },
				{ description: { contains: searchTerm, mode: "insensitive" } },
				{ Client: { name: { contains: searchTerm, mode: "insensitive" } } },
				{ Client: { company: { contains: searchTerm, mode: "insensitive" } } },
			],
		},
		select: {
			id: true,
			name: true,
			description: true,
			totalPrice: true,
			workflowStatus: true,
			Client: {
				select: {
					id: true,
					name: true,
					email: true,
					company: true,
				},
			},
		},
		orderBy: { created_at: "desc" },
		take: 20, // Limit results
	})

	return quotations
}


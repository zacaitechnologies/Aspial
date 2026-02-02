"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore, unstable_cache, revalidateTag, revalidatePath } from "next/cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { formatLocalDateTime } from "@/lib/date-utils"
import { Prisma } from "@prisma/client"
import {
	createInvoiceSchema,
	updateInvoiceAdminSchema,
	sendInvoiceEmailSchema,
	invoiceIdSchema,
	searchQuotationsForInvoiceSchema,
	type CreateInvoiceValues,
	type UpdateInvoiceAdminValues,
	type SendInvoiceEmailValues,
} from "@/lib/validation"

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
	const where: Prisma.InvoiceWhereInput = {}
	if (typeFilter && typeFilter !== 'all') {
		where.type = typeFilter as "SO" | "EPO" | "EO"
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
				status: true,
				created_at: true,
				updated_at: true,
				receipts: {
					where: { status: { not: "cancelled" } },
					select: { amount: true },
				},
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
	const transformedInvoices = invoices.map((invoice) => {
		const totalReceived = (invoice.receipts ?? []).reduce((sum, r) => sum + r.amount, 0)
		const balance = Math.max(0, invoice.amount - totalReceived)
		return {
			id: invoice.id,
			invoiceNumber: invoice.invoiceNumber,
			type: invoice.type,
			amount: invoice.amount,
			balance,
			quotationId: invoice.quotationId,
			status: invoice.status,
			created_at: invoice.created_at,
			updated_at: invoice.updated_at,
			quotation: invoice.quotation
				? {
						id: invoice.quotation.id,
						name: invoice.quotation.name,
						description: invoice.quotation.description,
						totalPrice: invoice.quotation.totalPrice,
						workflowStatus: invoice.quotation.workflowStatus,
					}
				: null,
			createdBy: invoice.createdBy,
			Client: invoice.quotation?.Client || null,
		}
	})

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

// Client-side version: use cache when useCache is true (e.g. initial load)
export async function getInvoicesPaginated(
	page: number = 1,
	pageSize: number = 10,
	filters: {
		typeFilter?: string
	} = {},
	useCache: boolean = false
) {
	if (useCache) {
		return await getCachedInvoicesPaginated(page, pageSize, filters)
	}
	unstable_noStore()
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
export async function getInvoiceFullById(id: unknown) {
	unstable_noStore()
	// Validate input with Zod
	const validatedId = invoiceIdSchema.parse(id)
	
	const invoice = await prisma.invoice.findUnique({
		where: { id: validatedId },
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
					// Include all non-cancelled invoices (with created_at) to compute balance as of this invoice's date
					invoices: {
						where: { status: { not: "cancelled" } },
						select: {
							id: true,
							amount: true,
							status: true,
							created_at: true,
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
async function generateInvoiceNumber(
	tx: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
	type: "SO" | "EPO" | "EO"
): Promise<string> {
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

export async function createInvoice(data: unknown) {
	// Validate input with Zod
	const validatedData = createInvoiceSchema.parse(data) satisfies CreateInvoiceValues

	// Get current user
	const user = await getCachedUser()
	if (!user) {
		throw new Error("User must be authenticated to create an invoice")
	}

	// Run all read operations in parallel OUTSIDE the transaction for speed
	const [isAdmin, quotation] = await Promise.all([
		getCachedIsUserAdmin(user.id),
		prisma.quotation.findUnique({
			where: { id: validatedData.quotationId },
			select: {
				id: true,
				createdById: true,
				discountValue: true,
				discountType: true,
				services: {
					where: { customServiceId: null }, // Only regular services
					select: {
						service: { select: { basePrice: true } },
					},
				},
				customServices: {
					where: { status: "APPROVED" }, // Only approved custom services
					select: { price: true },
				},
			},
		}),
	])

	if (!quotation) {
		throw new Error("Quotation not found")
	}

	// Determine final createdById based on admin status
	let finalCreatedById: string
	if (!isAdmin) {
		// Non-admin: always use their own ID (ignore any provided createdById)
		finalCreatedById = user.id
	} else {
		// Admin: default to quotation creator, but allow override if provided
		finalCreatedById = validatedData.createdById ?? quotation.createdById
	}

	// Validate that the selected user exists (outside transaction)
	const selectedUser = await prisma.user.findUnique({
		where: { supabase_id: finalCreatedById },
		select: { supabase_id: true },
	})

	if (!selectedUser) {
		throw new Error("Selected creator user not found")
	}

	// Calculate quotation grand total (using pre-filtered data from DB)
	const servicesTotal = quotation.services.reduce(
		(sum, qs) => sum + (qs.service?.basePrice ?? 0),
		0
	)
	const approvedCustomServicesTotal = quotation.customServices.reduce(
		(sum, cs) => sum + cs.price,
		0
	)
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
	if (validatedData.amount > grandTotal) {
		// We'll let the frontend handle the warning, but still allow creation
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.warn(`Invoice amount (${validatedData.amount}) exceeds quotation total (${grandTotal})`)
		}
	}

	// Only the write operations need to be in the transaction (for invoice number uniqueness)
	const invoice = await prisma.$transaction(async (tx) => {
		// Generate invoice number within transaction to prevent race conditions
		const invoiceNumber = await generateInvoiceNumber(tx, validatedData.type)

		return tx.invoice.create({
			data: {
				invoiceNumber,
				type: validatedData.type,
				quotationId: validatedData.quotationId,
				amount: validatedData.amount,
				createdById: finalCreatedById,
				status: "active",
			},
			// Minimal include - only what's needed for immediate return
			select: {
				id: true,
				invoiceNumber: true,
				type: true,
				amount: true,
				status: true,
				created_at: true,
				quotationId: true,
				createdById: true,
				quotation: {
					select: {
						id: true,
						name: true,
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
						supabase_id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
			},
		})
	}, {
		isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
		maxWait: 5000,
		timeout: 10000,
	})

	// Invalidate cache after creating invoice (outside transaction)
	revalidateTag("invoices", { expire: 0 })
	revalidatePath("/invoices")

	return invoice
}

/**
 * Update invoice (change createdById or status)
 * - Admins can update any invoice and change createdById
 * - Non-admins can only cancel/reactivate their own invoices (status only)
 */
export async function updateInvoiceAdmin(
	invoiceId: unknown,
	data: unknown
) {
	// Validate inputs with Zod
	const validatedInvoiceId = invoiceIdSchema.parse(invoiceId)
	const validatedData = updateInvoiceAdminSchema.parse(data) satisfies UpdateInvoiceAdminValues

	// Get current user
	const user = await getCachedUser()
	if (!user) {
		throw new Error("User must be authenticated")
	}

	// Check if user is admin
	const isAdmin = await getCachedIsUserAdmin(user.id)

	// Get the invoice to check ownership and quotation status
	const existingInvoice = await prisma.invoice.findUnique({
		where: { id: validatedInvoiceId },
		select: {
			createdById: true,
			status: true,
			quotationId: true,
			quotation: {
				select: {
					workflowStatus: true,
				},
			},
		},
	})

	if (!existingInvoice) {
		throw new Error("Invoice not found")
	}

	// Block reactivation if quotation is cancelled
	if (validatedData.status === "active" && existingInvoice.status === "cancelled") {
		if (existingInvoice.quotation.workflowStatus === "cancelled") {
			throw new Error("Cannot reactivate invoice because the quotation is cancelled. Please reactivate the quotation first.")
		}
	}

	// Non-admins can only update their own invoices
	if (!isAdmin && existingInvoice.createdById !== user.id) {
		throw new Error("You can only update your own invoices")
	}

	// Non-admins cannot change createdById
	if (!isAdmin && validatedData.createdById !== undefined) {
		throw new Error("Only administrators can change invoice creator")
	}

	// Build update data
	const updateData: Prisma.InvoiceUncheckedUpdateInput = {}
	
	if (validatedData.createdById !== undefined) {
		// Only admins can change createdById
		if (!isAdmin) {
			throw new Error("Only administrators can change invoice creator")
		}

		// Validate that the selected user exists
		const selectedUser = await prisma.user.findUnique({
			where: { supabase_id: validatedData.createdById },
			select: { supabase_id: true },
		})

		if (!selectedUser) {
			throw new Error("Selected creator user not found")
		}

		updateData.createdById = validatedData.createdById
	}

	if (validatedData.status !== undefined) {
		updateData.status = validatedData.status
	}

	updateData.updated_at = new Date()

	// Use transaction to update invoice and cancel associated receipts if cancelling
	const result = await prisma.$transaction(async (tx) => {
		// If cancelling the invoice, also cancel all associated receipts
		if (validatedData.status === "cancelled") {
			await tx.receipt.updateMany({
				where: {
					invoiceId: validatedInvoiceId,
					status: "active", // Only cancel active receipts
				},
				data: {
					status: "cancelled",
					updated_at: new Date(),
				},
			})
		}

		// If reactivating the invoice, optionally reactivate receipts
		// Note: Receipt reactivation is handled by a separate function call with reactivateReceipts option

		const invoice = await tx.invoice.update({
			where: { id: validatedInvoiceId },
			data: updateData,
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
	}, { timeout: 15000 }) // Increased timeout for production network latency

	revalidateTag("invoices", { expire: 0 })
	revalidateTag("receipts", { expire: 0 })
	revalidatePath("/invoices")
	revalidatePath(`/invoices/${validatedInvoiceId}`)
	revalidatePath("/receipts")

	return result
}

/**
 * Reactivate a cancelled invoice and optionally reactivate related receipts
 */
export async function reactivateInvoiceWithReceipts(
	invoiceId: unknown,
	options: {
		reactivateReceipts?: boolean
	} = {}
) {
	// Validate input
	const validatedInvoiceId = invoiceIdSchema.parse(invoiceId)
	
	unstable_noStore()
	const user = await getCachedUser()
	if (!user) {
		throw new Error("User must be authenticated")
	}

	// Check if user is admin
	const isAdmin = await getCachedIsUserAdmin(user.id)

	// Get the invoice to check ownership and quotation status
	const existingInvoice = await prisma.invoice.findUnique({
		where: { id: validatedInvoiceId },
		select: {
			createdById: true,
			status: true,
			quotationId: true,
			quotation: {
				select: {
					id: true,
					workflowStatus: true,
				},
			},
		},
	})

	if (!existingInvoice) {
		throw new Error("Invoice not found")
	}

	if (existingInvoice.status !== "cancelled") {
		throw new Error("Only cancelled invoices can be reactivated")
	}

	// Non-admins can only reactivate their own invoices
	if (!isAdmin && existingInvoice.createdById !== user.id) {
		throw new Error("You can only reactivate your own invoices")
	}

	// If quotation is cancelled, reactivate it first
	if (existingInvoice.quotation.workflowStatus === "cancelled") {
		const { reactivateQuotationCascade } = await import("../quotations/action")
		await reactivateQuotationCascade(existingInvoice.quotation.id.toString(), {
			reactivateInvoices: false, // We'll reactivate this invoice ourselves
			reactivateReceipts: false, // We'll handle receipts based on options
		})
	}

	// Use transaction to reactivate invoice and optionally receipts
	const result = await prisma.$transaction(async (tx) => {
		// Reactivate the invoice
		const invoice = await tx.invoice.update({
			where: { id: validatedInvoiceId },
			data: {
				status: "active",
				updated_at: new Date(),
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

		// Optionally reactivate receipts
		if (options.reactivateReceipts) {
			await tx.receipt.updateMany({
				where: {
					invoiceId: validatedInvoiceId,
					status: "cancelled",
				},
				data: {
					status: "active",
					updated_at: new Date(),
				},
			})
		}

		return invoice
	}, { timeout: 15000 }) // Increased timeout for production network latency

	revalidateTag("invoices", { expire: 0 })
	revalidateTag("receipts", { expire: 0 })
	revalidateTag("quotations", { expire: 0 })
	revalidatePath("/invoices")
	revalidatePath(`/invoices/${validatedInvoiceId}`)
	revalidatePath("/receipts")
	revalidatePath("/quotations")
	if (existingInvoice.quotationId) {
		revalidatePath(`/quotations/${existingInvoice.quotationId}`)
	}

	return result
}

/**
 * Send invoice PDF via email
 */
export async function sendInvoiceEmail(
	invoiceId: unknown,
	recipientEmail: unknown
): Promise<{ success: boolean; error?: string }> {
	try {
		// Validate inputs with Zod
		const validatedData = sendInvoiceEmailSchema.parse({
			invoiceId,
			recipientEmail,
		}) satisfies SendInvoiceEmailValues

		const user = await getCachedUser()
		if (!user) {
			throw new Error("User must be authenticated to send invoice")
		}

		// Get invoice with all related data
		const invoice = await getInvoiceFullById(validatedData.invoiceId)

		if (!invoice) {
			return { success: false, error: "Invoice not found" }
		}

		// Generate PDF as base64 (use FromFull to avoid duplicate getInvoiceFullById)
		const { generateInvoicePDFBase64FromFull } = await import("./utils/pdfExport")
		const pdfBase64 = await generateInvoicePDFBase64FromFull(invoice)

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
				customerEmail: validatedData.recipientEmail,
				clientCompany: invoice.quotation.Client?.company || "",
				amount: invoice.amount,
				pdfBase64: pdfBase64,
				invoiceDate: formatLocalDateTime(new Date(invoice.created_at)),
			}),
		})

		if (!response.ok) {
			const errorData = await response.text()
			if (process.env.NODE_ENV === "development") {
				console.error("Error sending email:", errorData)
			}
			return { success: false, error: "Failed to send email. Please try again." }
		}

		// Record the email in database (sentById references User.supabase_id)
		await prisma.invoiceEmail.create({
			data: {
				invoiceId: invoice.id,
				recipientEmail: validatedData.recipientEmail,
				sentById: user.id,
			},
		})

		return { success: true }
	} catch (error: unknown) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error sending invoice email:", error)
		}
		const errorMessage = error instanceof Error ? error.message : "Failed to send email"
		return { success: false, error: errorMessage }
	}
}

/**
 * Get email history for an invoice
 */
export async function getInvoiceEmailHistory(
	invoiceId: unknown
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
		// Validate input with Zod
		const validatedInvoiceId = invoiceIdSchema.parse(invoiceId)

		const emails = await prisma.invoiceEmail.findMany({
			where: { invoiceId: validatedInvoiceId },
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
	} catch (error: unknown) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error fetching email history:", error)
		}
		return []
	}
}

/**
 * Search quotations for invoice creation.
 * Returns each quotation with balance = totalPrice - sum of all non-cancelled invoices.
 */
export async function searchQuotationsForInvoice(searchTerm: unknown) {
	unstable_noStore()
	
	// Validate input with Zod
	const validatedSearchTerm = searchQuotationsForInvoiceSchema.parse(searchTerm)

	const quotations = await prisma.quotation.findMany({
		where: {
			OR: [
				{ name: { contains: validatedSearchTerm, mode: "insensitive" } },
				{ description: { contains: validatedSearchTerm, mode: "insensitive" } },
				{ Client: { name: { contains: validatedSearchTerm, mode: "insensitive" } } },
				{ Client: { company: { contains: validatedSearchTerm, mode: "insensitive" } } },
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
			invoices: {
				where: { status: { not: "cancelled" } },
				select: { amount: true },
			},
		},
		orderBy: { created_at: "desc" },
		take: 20, // Limit results
	})

	return quotations.map((q) => {
		const totalInvoiced = q.invoices.reduce((sum, inv) => sum + inv.amount, 0)
		const balance = Math.max(0, q.totalPrice - totalInvoiced)
		const { invoices: _invoices, ...rest } = q
		return { ...rest, balance }
	})
}


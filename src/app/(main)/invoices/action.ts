"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore, unstable_cache, revalidateTag, revalidatePath } from "next/cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { formatLocalDateTime, parseDocumentDateInputOrNow } from "@/lib/date-utils"
import { ensureClientAdvisors } from "@/lib/client-advisors"
import { Prisma } from "@prisma/client"
import {
	createInvoiceSchema,
	updateInvoiceAdminSchema,
	sendInvoiceEmailSchema,
	invoiceIdSchema,
	searchQuotationsForInvoiceSchema,
	invoiceListFiltersSchema,
	type CreateInvoiceValues,
	type UpdateInvoiceAdminValues,
	type SendInvoiceEmailValues,
	type InvoiceListFilters,
} from "@/lib/validation"

// Internal function - not cached, used by cached version
async function _getInvoicesPaginatedInternal(
	page: number = 1,
	pageSize: number = 10,
	filters: InvoiceListFilters = {}
) {
	const skip = (page - 1) * pageSize
	const parsed = invoiceListFiltersSchema.safeParse(filters)
	const raw = parsed.success ? parsed.data : {}
	const typeFilter = raw.typeFilter
	const searchQuery = raw.searchQuery
	const advisorFilter = raw.advisorFilter
	const monthYear =
		raw.monthYear && /^\d{4}-\d{2}$/.test(raw.monthYear) ? raw.monthYear : undefined

	// Build where clause
	const where: Prisma.InvoiceWhereInput = {}
	if (typeFilter && typeFilter !== 'all') {
		where.type = typeFilter as "SO" | "EPO" | "EO"
	}
	if (advisorFilter && advisorFilter !== 'all') {
		where.advisors = { some: { userId: advisorFilter } }
	}
	if (monthYear) {
		const parts = monthYear.split("-")
		const y = Number(parts[0])
		const m = Number(parts[1])
		if (!Number.isNaN(y) && m >= 1 && m <= 12) {
			const monthIndex = m - 1
			const start = new Date(y, monthIndex, 1)
			const end = new Date(y, monthIndex + 1, 0, 23, 59, 59, 999)
			where.invoiceDate = { gte: start, lte: end }
		}
	}

	const searchTerm = searchQuery?.trim()
	if (searchTerm && searchTerm.length > 0) {
		where.OR = [
			{ invoiceNumber: { contains: searchTerm, mode: "insensitive" } },
			{ quotation: { name: { contains: searchTerm, mode: "insensitive" } } },
			{ quotation: { description: { contains: searchTerm, mode: "insensitive" } } },
			{ quotation: { Client: { name: { contains: searchTerm, mode: "insensitive" } } } },
			{ quotation: { Client: { company: { contains: searchTerm, mode: "insensitive" } } } },
		]
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
				invoiceDate: true,
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
				advisors: {
					include: {
						user: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								email: true,
							},
						},
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
			invoiceDate: invoice.invoiceDate,
			quotation: invoice.quotation
				? {
						id: invoice.quotation.id,
						name: invoice.quotation.name,
						description: invoice.quotation.description,
						totalPrice: invoice.quotation.totalPrice,
						workflowStatus: invoice.quotation.workflowStatus,
						Client: invoice.quotation.Client ?? null,
					}
				: null,
			createdBy: invoice.createdBy,
			advisors: invoice.advisors.map((a) => a.user),
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
	filters: InvoiceListFilters = {},
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
	filters: InvoiceListFilters = {}
) {
	unstable_noStore()
	return await _getInvoicesPaginatedInternal(page, pageSize, filters)
}

// Get all unique advisors that appear on invoices (for filter dropdown)
export async function getInvoiceAdvisors() {
	unstable_noStore()
	const rows = await prisma.invoiceAdvisor.findMany({
		distinct: ["userId"],
		include: {
			user: {
				select: { id: true, firstName: true, lastName: true },
			},
		},
	})
	return rows
		.map((r) => r.user)
		.sort((a, b) =>
			`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
		)
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
					advisors: {
						include: {
							user: {
								select: {
									id: true,
									firstName: true,
									lastName: true,
									email: true,
								},
							},
						},
					},
					Client: true,
					customServices: true,
				},
			},
			createdBy: true,
			advisors: {
				include: {
					user: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							email: true,
						},
					},
				},
			},
		},
	})

	if (!invoice) {
		return null
	}

	// Transform advisors from join-table shape to flat array
	const flatAdvisors = invoice.advisors.map((a) => a.user)
	const flatQuotationAdvisors = invoice.quotation?.advisors?.map((a) => a.user) ?? []

	return {
		...invoice,
		advisors: flatAdvisors,
		quotation: invoice.quotation
			? { ...invoice.quotation, advisors: flatQuotationAdvisors }
			: invoice.quotation,
	}
}

/** Helper to flatten join-table advisors to `{ id, firstName, lastName, email }[]`. */
function flattenAdvisors(advisors: Array<{ user: { id: string; firstName: string; lastName: string; email: string } }>) {
	return advisors.map((a) => a.user)
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
					advisors: {
						include: {
							user: {
								select: {
									id: true,
									firstName: true,
									lastName: true,
									email: true,
								},
							},
						},
					},
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
					// Include all non-cancelled invoices (with invoiceDate) to compute balance as of this invoice's document date
					invoices: {
						where: { status: { not: "cancelled" } },
						select: {
							id: true,
							amount: true,
							status: true,
							invoiceDate: true,
						},
					},
				},
			},
			createdBy: true,
			advisors: {
				include: {
					user: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							email: true,
						},
					},
				},
			},
		},
	})

	if (!invoice) {
		return null
	}

	// Transform advisors from join-table shape to flat array
	return {
		...invoice,
		advisors: flattenAdvisors(invoice.advisors),
		quotation: invoice.quotation
			? { ...invoice.quotation, advisors: flattenAdvisors(invoice.quotation.advisors) }
			: invoice.quotation,
	}
}

/**
 * Generate invoice number using PostgreSQL function (gapless, concurrency-safe).
 * Formats: SO-00001, EPO-N0001, EO-N0001
 * Must be called within a transaction.
 */
async function generateInvoiceNumber(
	tx: Prisma.TransactionClient,
	type: "SO" | "EPO" | "EO"
): Promise<string> {
	const result = await tx.$queryRaw<Array<{ generate_gapless_invoice_number: string }>>`
		SELECT generate_gapless_invoice_number(${type}) as "generate_gapless_invoice_number"
	`

	if (!result || result.length === 0 || !result[0]?.generate_gapless_invoice_number) {
		throw new Error("Failed to generate invoice number")
	}

	return result[0].generate_gapless_invoice_number
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
	const [isAdmin, quotation, dbUser] = await Promise.all([
		getCachedIsUserAdmin(user.id),
		prisma.quotation.findUnique({
			where: { id: validatedData.quotationId },
			select: {
				id: true,
				clientId: true,
				createdById: true,
				discountValue: true,
				discountType: true,
				services: {
					where: { customServiceId: null }, // Only regular services
					select: {
						price: true,
						quantity: true,
						service: { select: { basePrice: true } },
					},
				},
				customServices: {
					where: { status: "APPROVED" }, // Only approved custom services
					select: { price: true },
				},
			},
		}),
		prisma.user.findUnique({
			where: { supabase_id: user.id },
			select: { id: true, supabase_id: true },
		}),
	])

	if (!quotation) {
		throw new Error("Quotation not found")
	}

	if (!dbUser) {
		throw new Error("User not found in database")
	}

	// createdById is ALWAYS the logged-in user's supabase_id (immutable audit trail)
	const finalCreatedById = user.id

	// Determine advisor IDs: use submitted list when provided, else quotation advisors
	let finalAdvisorIds: string[]
	if (validatedData.advisorIds && validatedData.advisorIds.length > 0) {
		finalAdvisorIds = [...new Set(validatedData.advisorIds)]
	} else {
		const quotationAdvisors = await prisma.quotationAdvisor.findMany({
			where: { quotationId: validatedData.quotationId },
			select: { userId: true },
		})
		finalAdvisorIds = quotationAdvisors.map((a) => a.userId)
	}
	if (finalAdvisorIds.length === 0) {
		finalAdvisorIds = [dbUser.id]
	}
	// Non-admin cannot remove themselves in the UI; enforce on the server too
	if (!isAdmin && !finalAdvisorIds.includes(dbUser.id)) {
		finalAdvisorIds = [...finalAdvisorIds, dbUser.id]
	}

	const invoiceDateForDb = parseDocumentDateInputOrNow(validatedData.invoiceDate)

	// Validate that the creator user exists (outside transaction)
	const selectedUser = await prisma.user.findUnique({
		where: { supabase_id: finalCreatedById },
		select: { supabase_id: true },
	})

	if (!selectedUser) {
		throw new Error("Selected creator user not found")
	}

	// Calculate quotation grand total (using pre-filtered data from DB)
	const servicesTotal = quotation.services.reduce(
		(sum, qs) => sum + qs.price * qs.quantity,
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
			console.warn(`Invoice amount (${validatedData.amount}) exceeds quotation total (${grandTotal})`)
		}
	}

	// Retry logic for serialization / unique-constraint conflicts (mirrors quotation flow)
	const maxRetries = 3
	let lastError: unknown = null

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const invoice = await prisma.$transaction(async (tx) => {
				const invoiceNumber = await generateInvoiceNumber(tx, validatedData.type)

				// Ensure invoice advisors are also linked to the client so they can
				// view it and track outstanding balances from their own account.
				if (quotation.clientId) {
					await ensureClientAdvisors(quotation.clientId, finalAdvisorIds, tx)
				}

				const created = await tx.invoice.create({
					data: {
						invoiceNumber,
						type: validatedData.type,
						quotationId: validatedData.quotationId,
						amount: validatedData.amount,
						createdById: finalCreatedById,
						status: "active",
						invoiceDate: invoiceDateForDb,
						advisors: {
							create: finalAdvisorIds.map((id) => ({ userId: id })),
						},
					},
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
						advisors: {
							include: {
								user: {
									select: {
										id: true,
										firstName: true,
										lastName: true,
										email: true,
									},
								},
							},
						},
					},
				})

				return created
			}, {
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
				maxWait: 5000,
				timeout: 10000,
			})

			revalidateTag("invoices", { expire: 0 })
			revalidatePath("/invoices")
			return invoice
		} catch (error: unknown) {
			lastError = error

			const isRetryable =
				(error && typeof error === "object" && "code" in error &&
					((error as { code: string }).code === "P2002" || (error as { code: string }).code === "P2034")) ||
				(error instanceof Error &&
					(error.message.includes("Unique constraint failed") ||
						error.message.includes("duplicate key value") ||
						error.message.includes("serialization failure") ||
						error.message.includes("could not serialize")))

			if (!isRetryable || attempt === maxRetries - 1) {
				if (process.env.NODE_ENV === "development") {
					console.error(`Error creating invoice (attempt ${attempt + 1}/${maxRetries}):`, error)
				}
				throw error
			}

			const delay = Math.min(50 * Math.pow(2, attempt) + Math.random() * 100, 500)
			await new Promise(resolve => setTimeout(resolve, delay))
		}
	}

	throw lastError || new Error("Failed to create invoice after multiple attempts")
}

/**
 * Update invoice (change advisors or status)
 * - Admins can update any invoice and change advisors
 * - Non-admins can only cancel/reactivate their own invoices (status only)
 * - createdById is immutable and cannot be changed
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

	// Run admin + ownership lookups in parallel.
	const [isAdmin, existingInvoice, dbUser] = await Promise.all([
		getCachedIsUserAdmin(user.id),
		prisma.invoice.findUnique({
			where: { id: validatedInvoiceId },
			select: {
				createdById: true,
				status: true,
				quotationId: true,
				quotation: {
					select: {
						workflowStatus: true,
						clientId: true,
					},
				},
				advisors: { select: { userId: true } },
			},
		}),
		prisma.user.findUnique({
			where: { supabase_id: user.id },
			select: { id: true },
		}),
	])

	if (!existingInvoice) {
		throw new Error("Invoice not found")
	}

	if (!dbUser) {
		throw new Error("User not found in database")
	}

	// Block reactivation if quotation is cancelled
	if (validatedData.status === "active" && existingInvoice.status === "cancelled") {
		if (existingInvoice.quotation.workflowStatus === "cancelled") {
			throw new Error("Cannot reactivate invoice because the quotation is cancelled. Please reactivate the quotation first.")
		}
	}

	// Authorization: admin, creator, or an assigned advisor can update the invoice.
	// Advisors get the same edit rights as the creator here (including cancelling /
	// reactivating). Only admins may re-assign advisors.
	const isCreator = existingInvoice.createdById === user.id
	const isAdvisor = existingInvoice.advisors.some((a) => a.userId === dbUser.id)
	const isOwner = isCreator || isAdvisor

	if (!isAdmin && !isOwner) {
		throw new Error("You can only update invoices you created or are assigned to as an advisor")
	}

	// Non-admins cannot change advisors (even if they are an assigned advisor themselves).
	if (!isAdmin && validatedData.advisorIds !== undefined) {
		throw new Error("Only administrators can change invoice advisors")
	}

	// Build update data
	const updateData: Prisma.InvoiceUncheckedUpdateInput = {}

	if (validatedData.status !== undefined) {
		updateData.status = validatedData.status
	}

	// Invoice document date: only admins can change it
	if (validatedData.invoiceDate !== undefined) {
		if (!isAdmin) {
			throw new Error("Only administrators can change the invoice date")
		}
		updateData.invoiceDate = new Date(validatedData.invoiceDate)
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

		// Update advisors via join table if provided (admin only)
		if (validatedData.advisorIds !== undefined && isAdmin) {
			await tx.invoiceAdvisor.deleteMany({ where: { invoiceId: validatedInvoiceId } })
			if (validatedData.advisorIds.length > 0) {
				await tx.invoiceAdvisor.createMany({
					data: validatedData.advisorIds.map((id) => ({ invoiceId: validatedInvoiceId, userId: id })),
				})
			}

			// Any advisor added to this invoice is also linked to the client so they can
			// view the client and track outstanding balances from their account.
			if (existingInvoice.quotation.clientId && validatedData.advisorIds.length > 0) {
				await ensureClientAdvisors(
					existingInvoice.quotation.clientId,
					validatedData.advisorIds,
					tx,
				)
			}
		}

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

	// Run admin + ownership lookups in parallel.
	const [isAdmin, existingInvoice, dbUser] = await Promise.all([
		getCachedIsUserAdmin(user.id),
		prisma.invoice.findUnique({
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
				advisors: { select: { userId: true } },
			},
		}),
		prisma.user.findUnique({
			where: { supabase_id: user.id },
			select: { id: true },
		}),
	])

	if (!existingInvoice) {
		throw new Error("Invoice not found")
	}

	if (!dbUser) {
		throw new Error("User not found in database")
	}

	if (existingInvoice.status !== "cancelled") {
		throw new Error("Only cancelled invoices can be reactivated")
	}

	// Admin, creator, or an assigned advisor can reactivate the invoice.
	const isReactivateCreator = existingInvoice.createdById === user.id
	const isReactivateAdvisor = existingInvoice.advisors.some((a) => a.userId === dbUser.id)
	if (!isAdmin && !isReactivateCreator && !isReactivateAdvisor) {
		throw new Error("You can only reactivate invoices you created or are assigned to as an advisor")
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
				invoiceDate: formatLocalDateTime(new Date(invoice.invoiceDate)),
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


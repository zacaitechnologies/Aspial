"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore, unstable_cache, revalidateTag, revalidatePath } from "next/cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { formatLocalDateTime } from "@/lib/date-utils"
import { Prisma, type PaymentMethod } from "@prisma/client"
import { receiptListFiltersSchema, type ReceiptListFilters } from "@/lib/validation"

// Internal function - not cached, used by cached version
async function _getReceiptsPaginatedInternal(
	page: number = 1,
	pageSize: number = 10,
	filters: ReceiptListFilters = {}
) {
	const skip = (page - 1) * pageSize
	const parsed = receiptListFiltersSchema.safeParse(filters)
	const raw = parsed.success ? parsed.data : {}
	const searchQuery = raw.searchQuery
	const advisorFilter = raw.advisorFilter
	const monthYear = raw.monthYear && /^\d{4}-\d{2}$/.test(raw.monthYear) ? raw.monthYear : undefined
	const paymentMethodRaw = raw.paymentMethod

	const searchTerm = searchQuery?.trim()
	const where: Prisma.ReceiptWhereInput = {}
	if (advisorFilter && advisorFilter !== "all") {
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
			where.receiptDate = { gte: start, lte: end }
		}
	}
	if (paymentMethodRaw && paymentMethodRaw !== "all") {
		const allowed: PaymentMethod[] = [
			"cash",
			"bank_transfer",
			"mydebit",
			"visa",
			"mastercard",
			"qr",
		]
		if (allowed.includes(paymentMethodRaw as PaymentMethod)) {
			where.paymentMethod = paymentMethodRaw as PaymentMethod
		}
	}
	if (searchTerm && searchTerm.length > 0) {
		where.OR = [
			{ receiptNumber: { contains: searchTerm, mode: "insensitive" } },
			{ invoice: { invoiceNumber: { contains: searchTerm, mode: "insensitive" } } },
			{ invoice: { quotation: { name: { contains: searchTerm, mode: "insensitive" } } } },
			{ invoice: { quotation: { Client: { name: { contains: searchTerm, mode: "insensitive" } } } } },
			{ invoice: { quotation: { Client: { company: { contains: searchTerm, mode: "insensitive" } } } } },
		]
	}

	// Execute count and findMany in parallel for better performance
	const [total, receipts] = await Promise.all([
		prisma.receipt.count({ where }),
		prisma.receipt.findMany({
			where,
			select: {
				id: true,
				receiptNumber: true,
				amount: true,
				invoiceId: true,
				status: true,
				paymentMethod: true,
				created_at: true,
				updated_at: true,
				receiptDate: true,
				invoice: {
					select: {
						id: true,
						invoiceNumber: true,
						type: true,
						amount: true,
						status: true,
						quotation: {
							select: {
								id: true,
								name: true,
								description: true,
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
	const transformedReceipts = receipts.map(receipt => ({
		id: receipt.id,
		receiptNumber: receipt.receiptNumber,
		amount: receipt.amount,
		invoiceId: receipt.invoiceId,
		status: receipt.status,
		paymentMethod: receipt.paymentMethod,
		created_at: receipt.created_at,
		updated_at: receipt.updated_at,
		receiptDate: receipt.receiptDate,
		invoice: receipt.invoice ? {
			id: receipt.invoice.id,
			invoiceNumber: receipt.invoice.invoiceNumber,
			type: receipt.invoice.type,
			amount: receipt.invoice.amount,
			status: receipt.invoice.status,
		} : null,
		quotation: receipt.invoice?.quotation ? {
			id: receipt.invoice.quotation.id,
			name: receipt.invoice.quotation.name,
			description: receipt.invoice.quotation.description,
		} : null,
		Client: receipt.invoice?.quotation?.Client || null,
		createdBy: receipt.createdBy,
		advisors: receipt.advisors.map(a => a.user),
	}))

	return {
		data: transformedReceipts,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
	}
}

// Server-side cached version for initial page load (30 second cache)
const getCachedReceiptsPaginated = unstable_cache(
	_getReceiptsPaginatedInternal,
	["receipts-paginated"],
	{
		revalidate: 30,
		tags: ["receipts"],
	}
)

// Client-side version: use cache when useCache is true (e.g. initial load)
export async function getReceiptsPaginated(
	page: number = 1,
	pageSize: number = 10,
	filters: ReceiptListFilters = {},
	useCache: boolean = false
) {
	if (useCache) {
		return await getCachedReceiptsPaginated(page, pageSize, filters)
	}
	unstable_noStore()
	return await _getReceiptsPaginatedInternal(page, pageSize, filters)
}

// Fresh version that always bypasses cache (for client-side updates)
export async function getReceiptsPaginatedFresh(
	page: number = 1,
	pageSize: number = 10,
	filters: ReceiptListFilters = {}
) {
	unstable_noStore()
	return await _getReceiptsPaginatedInternal(page, pageSize, filters)
}

/** Distinct brand advisors on receipts (for filter dropdown). */
export async function getReceiptAdvisors() {
	unstable_noStore()
	const rows = await prisma.receiptAdvisor.findMany({
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

// Invalidate receipts cache
export async function invalidateReceiptsCache() {
	revalidateTag("receipts", "max")
}

/**
 * Get all receipts for an invoice
 * @param invoiceId - The invoice ID
 * @param beforeDate - Optional: Only include receipts with receiptDate at or before this date (for historical balance calculation)
 * @param excludeCancelled - Optional: Exclude cancelled receipts (default: true for balance calculations)
 */
export async function getReceiptsForInvoice(invoiceId: string, beforeDate?: Date, excludeCancelled: boolean = true) {
	unstable_noStore()
	const whereClause: Prisma.ReceiptWhereInput = { invoiceId }
	
	// Exclude cancelled receipts by default (for balance calculations)
	if (excludeCancelled) {
		whereClause.status = "active"
	}
	
	// If beforeDate is provided, filter by document date
	if (beforeDate) {
		whereClause.receiptDate = {
			lte: beforeDate
		}
	}
	
	const receipts = await prisma.receipt.findMany({
		where: whereClause,
		select: {
			id: true,
			receiptNumber: true,
			amount: true,
			status: true,
			created_at: true,
			receiptDate: true,
			createdBy: {
				select: {
					firstName: true,
					lastName: true,
					email: true,
				},
			},
		},
		orderBy: { created_at: "desc" },
	})

	return receipts
}

/**
 * Sum of non-cancelled invoice amounts for a quotation, for invoices with invoiceDate on or before a given date.
 * Used for receipt PDF "project balance" = quotation total − this sum.
 */
export async function getQuotationInvoicesTotalAsOf(
	quotationId: number,
	asOfInvoiceDate: Date
): Promise<number> {
	unstable_noStore()
	const result = await prisma.invoice.aggregate({
		where: {
			quotationId,
			status: { not: "cancelled" },
			invoiceDate: { lte: asOfInvoiceDate },
		},
		_sum: { amount: true },
	})
	return result._sum.amount ?? 0
}

/**
 * Sum of non-cancelled invoice amounts for a quotation, for invoices with invoiceDate strictly before a given date.
 * Used for receipt PDF "Previous Invoice Amount".
 */
export async function getPreviousInvoiceAmount(
	quotationId: number,
	currentInvoiceDocumentDate: Date
): Promise<number> {
	unstable_noStore()
	const result = await prisma.invoice.aggregate({
		where: {
			quotationId,
			status: { not: "cancelled" },
			invoiceDate: { lt: currentInvoiceDocumentDate },
		},
		_sum: { amount: true },
	})
	return result._sum.amount ?? 0
}

/**
 * Sum of non-cancelled receipt amounts for receipts against invoices with invoiceDate
 * before a given invoice document date, with receipt receiptDate <= receiptDocumentDate.
 * Used for receipt PDF "Paid (Previous Invoice)".
 */
export async function getPaidPreviousInvoice(
	quotationId: number,
	currentInvoiceDocumentDate: Date,
	receiptDocumentDate: Date
): Promise<number> {
	unstable_noStore()
	const previousInvoiceIds = await prisma.invoice.findMany({
		where: {
			quotationId,
			status: { not: "cancelled" },
			invoiceDate: { lt: currentInvoiceDocumentDate },
		},
		select: { id: true },
	})
	const ids = previousInvoiceIds.map((inv) => inv.id)
	if (ids.length === 0) return 0
	const result = await prisma.receipt.aggregate({
		where: {
			invoiceId: { in: ids },
			status: { not: "cancelled" },
			receiptDate: { lte: receiptDocumentDate },
		},
		_sum: { amount: true },
	})
	return result._sum.amount ?? 0
}

/**
 * Get receipt by ID with basic relations (lightweight version)
 * Used for list views and quick access
 */
export async function getReceiptById(id: string) {
	unstable_noStore()
	const receipt = await prisma.receipt.findUnique({
		where: { id },
		include: {
			invoice: {
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

	if (!receipt) {
		return null
	}

	// Transform advisors from join-table shape to flat array
	return {
		...receipt,
		advisors: flattenAdvisors(receipt.advisors),
		invoice: receipt.invoice
			? {
					...receipt.invoice,
					advisors: flattenAdvisors(receipt.invoice.advisors),
					quotation: receipt.invoice.quotation
						? { ...receipt.invoice.quotation, advisors: flattenAdvisors(receipt.invoice.quotation.advisors) }
						: receipt.invoice.quotation,
				}
			: receipt.invoice,
	}
}

/** Helper to flatten join-table advisors to `{ id, firstName, lastName, email }[]`. */
function flattenAdvisors(advisors: Array<{ user: { id: string; firstName: string; lastName: string; email: string } }>) {
	return advisors.map((a) => a.user)
}

/**
 * Get full receipt data with all related entities
 * Used for PDF generation, email sending, and viewing
 */
export async function getReceiptFullById(id: string) {
	unstable_noStore()
	const receipt = await prisma.receipt.findUnique({
		where: { id },
		include: {
			invoice: {
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

	if (!receipt) {
		return null
	}

	// Transform advisors from join-table shape to flat array
	return {
		...receipt,
		advisors: flattenAdvisors(receipt.advisors),
		invoice: receipt.invoice
			? {
					...receipt.invoice,
					advisors: flattenAdvisors(receipt.invoice.advisors),
					quotation: receipt.invoice.quotation
						? { ...receipt.invoice.quotation, advisors: flattenAdvisors(receipt.invoice.quotation.advisors) }
						: receipt.invoice.quotation,
				}
			: receipt.invoice,
	}
}

/**
 * Generate receipt number using PostgreSQL function (gapless, concurrency-safe).
 * Format: OR-N0001 (minimum 4 digits, naturally continues beyond 9999).
 * Must be called within a transaction.
 */
async function generateReceiptNumber(tx: Prisma.TransactionClient): Promise<string> {
	const result = await tx.$queryRaw<Array<{ generate_gapless_receipt_number: string }>>`
		SELECT generate_gapless_receipt_number() as "generate_gapless_receipt_number"
	`

	if (!result || result.length === 0 || !result[0]?.generate_gapless_receipt_number) {
		throw new Error("Failed to generate receipt number")
	}

	return result[0].generate_gapless_receipt_number
}

export async function createReceipt(data: {
	invoiceId: string
	amount: number
	/** Advisor User.id list. Admin can override; non-admin always includes self. */
	advisorIds?: string[]
	/** Receipt date (created_at). Only applied when user is admin. */
	receiptDate?: string
	/** Payment method used for this receipt */
	paymentMethod?: "cash" | "bank_transfer" | "mydebit" | "visa" | "mastercard" | "qr"
}) {
	// Validate amount
	if (data.amount <= 0) {
		throw new Error("Receipt amount must be greater than 0")
	}

	// Get current user
	const user = await getCachedUser()
	if (!user) {
		throw new Error("User must be authenticated to create a receipt")
	}

	// Run all read operations in parallel OUTSIDE the transaction for speed
	const [isAdmin, invoice, existingReceipts, dbUser] = await Promise.all([
		getCachedIsUserAdmin(user.id),
		prisma.invoice.findUnique({
			where: { id: data.invoiceId },
			select: {
				id: true,
				amount: true,
			},
		}),
		prisma.receipt.findMany({
			where: {
				invoiceId: data.invoiceId,
				status: "active", // Only count active receipts
			},
			select: { amount: true },
		}),
		prisma.user.findUnique({
			where: { supabase_id: user.id },
			select: { id: true, supabase_id: true },
		}),
	])

	if (!invoice) {
		throw new Error("Invoice not found")
	}

	if (!dbUser) {
		throw new Error("User not found in database")
	}

	// createdById is ALWAYS the logged-in user's supabase_id (immutable audit trail)
	const finalCreatedById = user.id

	// Determine advisor IDs for the receipt
	let finalAdvisorIds: string[]
	if (data.advisorIds && data.advisorIds.length > 0) {
		finalAdvisorIds = [...data.advisorIds]
	} else {
		// Default: inherit advisors from invoice's join table
		const invoiceAdvisors = await prisma.invoiceAdvisor.findMany({
			where: { invoiceId: data.invoiceId },
			select: { userId: true },
		})
		finalAdvisorIds = invoiceAdvisors.map((a) => a.userId)
	}
	// Non-admin: always include self
	if (!isAdmin && !finalAdvisorIds.includes(dbUser.id)) {
		finalAdvisorIds.push(dbUser.id)
	}
	// Deduplicate
	finalAdvisorIds = [...new Set(finalAdvisorIds)]

	// Validate that the creator user exists (outside transaction)
	const selectedUser = await prisma.user.findUnique({
		where: { supabase_id: finalCreatedById },
		select: { supabase_id: true },
	})

	if (!selectedUser) {
		throw new Error("Selected creator user not found")
	}

	// Calculate remaining amount
	const totalReceipted = existingReceipts.reduce((sum, r) => sum + r.amount, 0)
	const remaining = invoice.amount - totalReceipted

	// Warn if amount exceeds remaining (but allow it)
	if (data.amount > remaining) {
		if (process.env.NODE_ENV === 'development') {
			console.warn(`Receipt amount (${data.amount}) exceeds remaining invoice amount (${remaining})`)
		}
	}

	// Retry logic for serialization / unique-constraint conflicts (mirrors quotation flow)
	const maxRetries = 3
	let lastError: unknown = null

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const receipt = await prisma.$transaction(async (tx) => {
				const receiptNumber = await generateReceiptNumber(tx)

				return tx.receipt.create({
					data: {
						receiptNumber,
						invoiceId: data.invoiceId,
						amount: data.amount,
						paymentMethod: data.paymentMethod || "bank_transfer",
						createdById: finalCreatedById,
						status: "active",
						receiptDate: isAdmin && data.receiptDate
							? new Date(data.receiptDate)
							: new Date(),
						advisors: {
							create: finalAdvisorIds.map((userId) => ({ userId })),
						},
					},
					select: {
						id: true,
						receiptNumber: true,
						amount: true,
						status: true,
						paymentMethod: true,
						created_at: true,
						invoiceId: true,
						createdById: true,
						invoice: {
							select: {
								id: true,
								invoiceNumber: true,
								amount: true,
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
			}, {
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
				maxWait: 5000,
				timeout: 10000,
			})

			await invalidateReceiptsCache()
			revalidatePath("/receipts")
			return receipt
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
					// eslint-disable-next-line no-console
					console.error(`Error creating receipt (attempt ${attempt + 1}/${maxRetries}):`, error)
				}
				throw error
			}

			const delay = Math.min(50 * Math.pow(2, attempt) + Math.random() * 100, 500)
			await new Promise(resolve => setTimeout(resolve, delay))
		}
	}

	throw lastError || new Error("Failed to create receipt after multiple attempts")
}

/**
 * Get invoice receipt summary (total receipted and remaining)
 * Excludes cancelled receipts from calculations
 */
export async function getInvoiceReceiptSummary(invoiceId: string) {
	unstable_noStore()
	
	const invoice = await prisma.invoice.findUnique({
		where: { id: invoiceId },
		select: { amount: true, status: true },
	})

	if (!invoice) {
		return { totalReceipted: 0, remaining: 0 }
	}

	// Only count active receipts (exclude cancelled)
	const receipts = await prisma.receipt.findMany({
		where: { 
			invoiceId,
			status: "active", // Exclude cancelled receipts
		},
		select: { amount: true },
	})

	const totalReceipted = receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
	const remaining = invoice.amount - totalReceipted

	return {
		totalReceipted,
		remaining,
	}
}

/**
 * Search invoices for receipt creation
 */
export async function searchInvoicesForReceipt(searchTerm: string) {
	unstable_noStore()
	
	if (!searchTerm || searchTerm.trim().length === 0) {
		return []
	}

	const invoices = await prisma.invoice.findMany({
		where: {
			OR: [
				{ invoiceNumber: { contains: searchTerm, mode: "insensitive" } },
				{ quotation: { name: { contains: searchTerm, mode: "insensitive" } } },
				{ quotation: { description: { contains: searchTerm, mode: "insensitive" } } },
				{ quotation: { Client: { name: { contains: searchTerm, mode: "insensitive" } } } },
				{ quotation: { Client: { company: { contains: searchTerm, mode: "insensitive" } } } },
			],
		},
		select: {
			id: true,
			invoiceNumber: true,
			type: true,
			amount: true,
			createdById: true,
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
			quotation: {
				select: {
					id: true,
					name: true,
					description: true,
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
		},
		orderBy: { created_at: "desc" },
		take: 20, // Limit results
	})

	return invoices
}

/**
 * Update receipt (change advisors or status)
 * - Admins can update any receipt and change advisors
 * - Non-admins can only update their own receipts and only change status
 * - createdById is immutable and cannot be changed
 */
export async function updateReceiptAdmin(
	receiptId: string,
	data: {
		advisorIds?: string[]
		status?: "active" | "cancelled"
		/** Receipt date (created_at). Admin only. */
		receiptDate?: string
		/** Payment method */
		paymentMethod?: "cash" | "bank_transfer" | "mydebit" | "visa" | "mastercard" | "qr"
	}
) {
	// Get current user
	const user = await getCachedUser()
	if (!user) {
		throw new Error("User must be authenticated")
	}

	// Check if user is admin
	const isAdmin = await getCachedIsUserAdmin(user.id)

	// Get the receipt to check ownership and invoice status
	const existingReceipt = await prisma.receipt.findUnique({
		where: { id: receiptId },
		select: {
			createdById: true,
			status: true,
			invoiceId: true,
			invoice: {
				select: {
					id: true,
					status: true,
					quotationId: true,
					quotation: {
						select: {
							id: true,
							workflowStatus: true,
						},
					},
				},
			},
		},
	})

	if (!existingReceipt) {
		throw new Error("Receipt not found")
	}

	// If reactivating a cancelled receipt, automatically reactivate parent invoice and quotation if needed
	if (data.status === "active" && existingReceipt.status === "cancelled") {
		if (existingReceipt.invoice.status === "cancelled") {
			// Invoice is cancelled, reactivate it (which will also reactivate quotation if needed)
			const { reactivateInvoiceWithReceipts } = await import("../invoices/action")
			await reactivateInvoiceWithReceipts(existingReceipt.invoice.id, {
				reactivateReceipts: false, // We'll reactivate this receipt ourselves
			})
		} else if (existingReceipt.invoice.quotation.workflowStatus === "cancelled") {
			// Only quotation is cancelled, reactivate it
			const { reactivateQuotationCascade } = await import("../quotations/action")
			await reactivateQuotationCascade(existingReceipt.invoice.quotation.id.toString(), {
				reactivateInvoices: false, // Invoice is already active
				reactivateReceipts: false, // We'll reactivate this receipt ourselves
			})
		}
	}

	// Non-admins can only update their own receipts
	if (!isAdmin && existingReceipt.createdById !== user.id) {
		throw new Error("You can only update your own receipts")
	}

	// Non-admins cannot change advisors
	if (!isAdmin && data.advisorIds !== undefined) {
		throw new Error("Only administrators can change receipt advisors")
	}

	// Build update data
	const updateData: Record<string, unknown> = {}

	if (data.advisorIds !== undefined) {
		if (!isAdmin) {
			throw new Error("Only administrators can change receipt advisors")
		}
		// Replace all advisors: delete existing, create new
		updateData.advisors = {
			deleteMany: {},
			create: data.advisorIds.map((userId) => ({ userId })),
		}
	}

	if (data.status !== undefined) {
		updateData.status = data.status
	}

	// Receipt document date: only admins can change it
	if (data.receiptDate !== undefined) {
		if (!isAdmin) {
			throw new Error("Only administrators can change the receipt date")
		}
		updateData.receiptDate = new Date(data.receiptDate)
	}

	if (data.paymentMethod !== undefined) {
		updateData.paymentMethod = data.paymentMethod
	}

	if (Object.keys(updateData).length === 0) {
		throw new Error("No fields to update")
	}

	updateData.updated_at = new Date()

	const receipt = await prisma.receipt.update({
		where: { id: receiptId },
		data: updateData,
		include: {
			invoice: {
				include: {
					quotation: {
						include: {
							Client: true,
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

	revalidateTag("receipts", { expire: 0 })
	revalidateTag("invoices", { expire: 0 })
	revalidateTag("quotations", { expire: 0 })
	revalidatePath("/receipts")
	revalidatePath(`/receipts/${receiptId}`)
	revalidatePath("/invoices")
	if (existingReceipt.invoiceId) {
		revalidatePath(`/invoices/${existingReceipt.invoiceId}`)
	}
	revalidatePath("/quotations")

	return receipt
}

/**
 * Send receipt PDF via email
 */
export async function sendReceiptEmail(
	receiptId: string,
	recipientEmail: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const user = await getCachedUser()
		if (!user) {
			throw new Error("User must be authenticated to send receipt")
		}

		// Get receipt with all related data
		const receipt = await getReceiptFullById(receiptId)

		if (!receipt) {
			return { success: false, error: "Receipt not found" }
		}

		// Generate PDF as base64 (use FromFull to avoid duplicate getReceiptFullById)
		const { generateReceiptPDFBase64FromFull } = await import("./utils/pdfExport")
		const pdfBase64 = await generateReceiptPDFBase64FromFull(receipt)

		// Get Supabase URL and anon key
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

		if (!supabaseUrl || !supabaseAnonKey) {
			return { success: false, error: "Supabase configuration missing" }
		}

		// Call Supabase function to send email
		const functionUrl = `${supabaseUrl}/functions/v1/send-receipt`
		const response = await fetch(functionUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${supabaseAnonKey}`,
			},
			body: JSON.stringify({
				receiptId: receipt.id,
				receiptNumber: receipt.receiptNumber,
				invoiceNumber: receipt.invoice.invoiceNumber,
				customerName: receipt.invoice.quotation.Client?.name || "Valued Customer",
				customerEmail: recipientEmail,
				clientCompany: receipt.invoice.quotation.Client?.company || "",
				amount: receipt.amount,
				pdfBase64: pdfBase64,
				receiptDate: formatLocalDateTime(new Date(receipt.receiptDate)),
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
		await prisma.receiptEmail.create({
			data: {
				receiptId: receipt.id,
				recipientEmail: recipientEmail,
				sentById: user.id,
			},
		})

		return { success: true }
	} catch (error: unknown) {
		if (process.env.NODE_ENV === "development") {
			// eslint-disable-next-line no-console
			console.error("Error sending receipt email:", error)
		}
		const errorMessage = error instanceof Error ? error.message : "Failed to send email"
		return { success: false, error: errorMessage }
	}
}

/**
 * Get email history for a receipt
 */
export async function getReceiptEmailHistory(
	receiptId: string
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
		const emails = await prisma.receiptEmail.findMany({
			where: { receiptId },
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


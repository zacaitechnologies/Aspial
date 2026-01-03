"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore, unstable_cache, revalidateTag, revalidatePath } from "next/cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"

// Internal function - not cached, used by cached version
async function _getReceiptsPaginatedInternal(
	page: number = 1,
	pageSize: number = 10,
	filters: {} = {}
) {
	const skip = (page - 1) * pageSize

	// Execute count and findMany in parallel for better performance
	const [total, receipts] = await Promise.all([
		prisma.receipt.count(),
		prisma.receipt.findMany({
			select: {
				id: true,
				receiptNumber: true,
				amount: true,
				invoiceId: true,
				status: true,
				created_at: true,
				updated_at: true,
				invoice: {
					select: {
						id: true,
						invoiceNumber: true,
						type: true,
						amount: true,
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
		created_at: receipt.created_at,
		updated_at: receipt.updated_at,
		invoice: receipt.invoice ? {
			id: receipt.invoice.id,
			invoiceNumber: receipt.invoice.invoiceNumber,
			type: receipt.invoice.type,
			amount: receipt.invoice.amount,
		} : null,
		quotation: receipt.invoice?.quotation ? {
			id: receipt.invoice.quotation.id,
			name: receipt.invoice.quotation.name,
			description: receipt.invoice.quotation.description,
		} : null,
		Client: receipt.invoice?.quotation?.Client || null,
		createdBy: receipt.createdBy,
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

// Client-side version that bypasses cache
export async function getReceiptsPaginated(
	page: number = 1,
	pageSize: number = 10,
	filters: {} = {},
	useCache: boolean = false
) {
	unstable_noStore()
	if (useCache) {
		return await getCachedReceiptsPaginated(page, pageSize, filters)
	}
	return await _getReceiptsPaginatedInternal(page, pageSize, filters)
}

// Fresh version that always bypasses cache (for client-side updates)
export async function getReceiptsPaginatedFresh(
	page: number = 1,
	pageSize: number = 10,
	filters: {} = {}
) {
	unstable_noStore()
	return await _getReceiptsPaginatedInternal(page, pageSize, filters)
}

// Invalidate receipts cache
export async function invalidateReceiptsCache() {
	revalidateTag("receipts", "max")
}

/**
 * Get all receipts for an invoice
 * @param invoiceId - The invoice ID
 * @param beforeDate - Optional: Only include receipts created at or before this date (for historical balance calculation)
 * @param excludeCancelled - Optional: Exclude cancelled receipts (default: true for balance calculations)
 */
export async function getReceiptsForInvoice(invoiceId: string, beforeDate?: Date, excludeCancelled: boolean = true) {
	unstable_noStore()
	const whereClause: any = { invoiceId }
	
	// Exclude cancelled receipts by default (for balance calculations)
	if (excludeCancelled) {
		whereClause.status = "active"
	}
	
	// If beforeDate is provided, filter receipts by created_at <= beforeDate
	if (beforeDate) {
		whereClause.created_at = {
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
							Client: true,
							customServices: true,
						},
					},
					createdBy: true,
				},
			},
			createdBy: true,
		},
	})

	if (!receipt) {
		return null
	}

	return receipt
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
			},
			createdBy: true,
		},
	})

	if (!receipt) {
		return null
	}

	return receipt
}

/**
 * Generate receipt number based on format: OR-N0001 (minimum 4 digits)
 * When it reaches 9999, continue with 10000
 * This function must be called within a transaction to prevent race conditions
 */
async function generateReceiptNumber(tx: any): Promise<string> {
	// Find the last receipt
	const lastReceipt = await tx.receipt.findFirst({
		orderBy: {
			created_at: 'desc'
		},
		select: {
			receiptNumber: true
		}
	})

	let nextNumber = 1

	if (lastReceipt) {
		// Extract the number from the last receipt (format: OR-N####)
		const numericPart = lastReceipt.receiptNumber.replace("OR-N", "")
		const lastNumber = parseInt(numericPart, 10)
		if (!isNaN(lastNumber)) {
			nextNumber = lastNumber + 1
		}
	}

	// Format: OR-N#### (minimum 4 digits, naturally continues to 10000)
	return `OR-N${String(nextNumber).padStart(4, '0')}`
}

export async function createReceipt(data: {
	invoiceId: string
	amount: number
	createdById?: string // Optional - will be determined server-side based on admin status
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

	// Check if user is admin
	const isAdmin = await getCachedIsUserAdmin(user.id)

	return await prisma.$transaction(async (tx) => {
		// Get invoice to validate it exists and get quotation creator
		const invoice = await tx.invoice.findUnique({
			where: { id: data.invoiceId },
			include: {
				quotation: {
					include: {
						createdBy: {
							select: {
								supabase_id: true,
							},
						},
					},
				},
			},
		})

		if (!invoice) {
			throw new Error("Invoice not found")
		}

		// Determine final createdById based on admin status
		let finalCreatedById: string
		if (!isAdmin) {
			// Non-admin: always use their own ID (ignore any provided createdById)
			finalCreatedById = user.id
		} else {
			// Admin: default to quotation creator, but allow override if provided
			finalCreatedById = data.createdById || invoice.quotation.createdById
		}

		// Validate that the selected user exists
		const selectedUser = await tx.user.findUnique({
			where: { supabase_id: finalCreatedById },
			select: { supabase_id: true },
		})

		if (!selectedUser) {
			throw new Error("Selected creator user not found")
		}

		// Calculate total receipted amount for this invoice (excluding cancelled receipts)
		const existingReceipts = await tx.receipt.findMany({
			where: { 
				invoiceId: data.invoiceId,
				status: "active", // Only count active receipts
			},
			select: { amount: true },
		})

		const totalReceipted = existingReceipts.reduce((sum, receipt) => sum + receipt.amount, 0)
		const remaining = invoice.amount - totalReceipted

		// Warn if amount exceeds remaining (but allow it)
		if (data.amount > remaining) {
			console.warn(`Receipt amount (${data.amount}) exceeds remaining invoice amount (${remaining})`)
		}

		// Generate receipt number within transaction
		const receiptNumber = await generateReceiptNumber(tx)

		const receipt = await tx.receipt.create({
			data: {
				receiptNumber,
				invoiceId: data.invoiceId,
				amount: data.amount,
				createdById: finalCreatedById,
				status: "active",
			},
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
			},
		})

		return receipt
	})
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
 * Admin-only: Update receipt (change createdById or status)
 */
export async function updateReceiptAdmin(
	receiptId: string,
	data: {
		createdById?: string
		status?: "active" | "cancelled"
	}
) {
	// Get current user
	const user = await getCachedUser()
	if (!user) {
		throw new Error("User must be authenticated")
	}

	// Check if user is admin
	const isAdmin = await getCachedIsUserAdmin(user.id)
	if (!isAdmin) {
		throw new Error("Only administrators can update receipts")
	}

	// Build update data
	const updateData: any = {}
	
	if (data.createdById !== undefined) {
		// Validate that the selected user exists
		const selectedUser = await prisma.user.findUnique({
			where: { supabase_id: data.createdById },
			select: { supabase_id: true },
		})

		if (!selectedUser) {
			throw new Error("Selected creator user not found")
		}

		updateData.createdById = data.createdById
	}

	if (data.status !== undefined) {
		updateData.status = data.status
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
		},
	})

	revalidateTag("receipts", { expire: 0 })
	revalidatePath("/receipts")
	revalidatePath(`/receipts/${receiptId}`)

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

		// Generate PDF as base64
		const { generateReceiptPDFBase64 } = await import("./utils/pdfExport")
		const pdfBase64 = await generateReceiptPDFBase64(receipt as any)

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
				receiptDate: receipt.created_at.toISOString(),
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

		await prisma.receiptEmail.create({
			data: {
				receiptId: receipt.id,
				recipientEmail: recipientEmail,
				sentById: user.id,
			},
		})

		return { success: true }
	} catch (error: any) {
		console.error("Error sending receipt email:", error)
		return { success: false, error: error.message || "Failed to send email" }
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
	} catch (error) {
		console.error("Error fetching email history:", error)
		return []
	}
}


"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath, revalidateTag } from "next/cache"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getCachedUser } from "@/lib/auth-cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { unstable_noStore, unstable_cache } from "next/cache"
import { 
  createClientSchema, 
  updateClientSchema, 
  clientFiltersSchema,
  salesDataFiltersSchema,
  type CreateClientValues,
  type UpdateClientValues,
  type ClientFilters,
  type SalesDataFilters
} from "@/lib/validation"
import { z } from "zod"
import type { InvoiceStatus, Prisma } from "@prisma/client"

// Authentication functions
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return redirect("/login")
    }
    
    return user
  } catch (error: unknown) {
    // Handle redirect errors
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Error in getCurrentUser:", error)
    }
    throw new Error("Authentication failed")
  }
}

// Client CRUD operations
export async function getAllClients() {
  try {
    const user = await getCurrentUser()
    const isAdmin = await getCachedIsUserAdmin(user.id)
    const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } })
    const createdByIdFilter = isAdmin ? undefined : dbUser?.id

    const clients = await prisma.client.findMany({
      where: createdByIdFilter !== undefined ? { createdById: createdByIdFilter } : undefined,
      include: {
        quotations: {
          select: {
            id: true,
            totalPrice: true,
            invoices: {
              where: { status: { not: "cancelled" } },
              select: { amount: true },
            },
          },
        },
        projects: {
          select: {
            id: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: {
        created_at: "desc"
      }
    })
    
    // Handle empty database gracefully
    if (!clients || clients.length === 0) {
      return [];
    }
    
    // Transform data to match the expected interface (totalValue = sum of invoice amounts)
    return clients.map(client => {
      const totalValue = client.quotations.reduce(
        (sum, q) => sum + (q.invoices?.reduce((s, inv) => s + inv.amount, 0) ?? 0),
        0
      )
      return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone || undefined,
      company: client.company || undefined,
      companyRegistrationNumber: client.companyRegistrationNumber || undefined,
      ic: client.ic || undefined,
      address: client.address || undefined,
      notes: client.notes || undefined,
      industry: client.industry || undefined,
      yearlyRevenue: client.yearlyRevenue || undefined,
      membershipType: client.membershipType,
      quotationsCount: client.quotations.length,
      totalValue,
      created_at: client.created_at.toISOString(),
      createdById: client.createdById,
      createdBy: client.createdBy ? {
        id: client.createdBy.id,
        firstName: client.createdBy.firstName,
        lastName: client.createdBy.lastName,
        email: client.createdBy.email,
      } : undefined,
      }
    })
  } catch (error: unknown) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Error in getAllClients:", error);
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch clients: ${message}`)
  }
}

// Internal function - not cached, used by cached version
async function _getClientsPaginatedInternal(
  page: number = 1,
  pageSize: number = 12,
  filters: {
    searchTerm?: string
    industry?: string
    membershipType?: 'all' | 'MEMBER' | 'NON_MEMBER'
    sortBy?: 'name' | 'yearlyRevenue' | 'totalValue' | 'created_at'
    sortDirection?: 'asc' | 'desc'
  } = {},
  createdByIdFilter?: string
) {
  const skip = (page - 1) * pageSize
  const {
    searchTerm,
    industry,
    membershipType,
    sortBy = 'created_at',
    sortDirection = 'desc',
  } = filters

  // Build where clause (Brand Advisors see only clients they created; Admin sees all)
  const where: {
    OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' }; company?: { contains: string; mode: 'insensitive' } }>
    industry?: string
    membershipType?: 'MEMBER' | 'NON_MEMBER'
    createdById?: string
  } = {}
  if (createdByIdFilter !== undefined) {
    where.createdById = createdByIdFilter
  }

  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { company: { contains: searchTerm, mode: 'insensitive' } },
    ]
  }

  if (industry && industry !== 'all') {
    where.industry = industry
  }

  if (membershipType && membershipType !== 'all') {
    where.membershipType = membershipType
  }

  const isTotalValueSort = sortBy === 'totalValue'
  let total: number
  let clients: any[]

  if (isTotalValueSort) {
    // totalValue sort: sum of invoice amounts per client (not quotations)
    const [totalCount, filteredIds] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({ where, select: { id: true } }),
    ])
    total = totalCount
    const ids = filteredIds.map((c) => c.id)
    const idSet = new Set(ids)
    // Get all invoices for these clients (via quotation.clientId) and sum amount by clientId
    const invoicesForClients =
      ids.length === 0
        ? []
        : await prisma.invoice.findMany({
            where: {
              quotation: { clientId: { in: ids } },
              status: { not: "cancelled" },
            },
            select: { amount: true, quotation: { select: { clientId: true } } },
          })
    const sumByClient = new Map<string, number>()
    invoicesForClients.forEach((inv) => {
      const cid = inv.quotation?.clientId
      if (cid && idSet.has(cid)) {
        sumByClient.set(cid, (sumByClient.get(cid) ?? 0) + inv.amount)
      }
    })
    const sortedIds = filteredIds
      .map((c) => ({ id: c.id, totalValue: sumByClient.get(c.id) ?? 0 }))
      .sort((a, b) => (sortDirection === 'asc' ? a.totalValue - b.totalValue : b.totalValue - a.totalValue))
      .slice(skip, skip + pageSize)
      .map((x) => x.id)
    if (sortedIds.length === 0) {
      clients = []
    } else {
      const pageClients = await prisma.client.findMany({
        where: { id: { in: sortedIds } },
        include: {
          quotations: {
            select: {
              id: true,
              invoices: {
                where: { status: { not: "cancelled" } },
                select: { amount: true },
              },
            },
          },
          projects: { select: { id: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })
      const orderMap = new Map(sortedIds.map((id, i) => [id, i]))
      pageClients.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
      clients = pageClients.map((client) => {
        const totalValue = client.quotations.reduce(
          (sum, q) => sum + (q.invoices?.reduce((s, inv) => s + inv.amount, 0) ?? 0),
          0
        )
        return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone || undefined,
        company: client.company || undefined,
        companyRegistrationNumber: client.companyRegistrationNumber || undefined,
        ic: client.ic || undefined,
        address: client.address || undefined,
        notes: client.notes || undefined,
        industry: client.industry || undefined,
        yearlyRevenue: client.yearlyRevenue || undefined,
        membershipType: client.membershipType,
        quotationsCount: client.quotations.length,
        totalValue,
        created_at: client.created_at.toISOString(),
        createdById: client.createdById,
        createdBy: client.createdBy
          ? {
              id: client.createdBy.id,
              firstName: client.createdBy.firstName,
              lastName: client.createdBy.lastName,
              email: client.createdBy.email,
            }
          : undefined,
        }
      })
    }
  } else {
    // For database fields, use Prisma's orderBy
    const [totalCount, fetchedClients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        include: {
          quotations: {
            select: {
              id: true,
              invoices: {
                where: { status: { not: "cancelled" } },
                select: { amount: true },
              },
            },
          },
          projects: {
            select: {
              id: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        },
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortDirection },
      }),
    ])
    
    total = totalCount
    clients = fetchedClients
  }

  // Transform data (if not already transformed); totalValue = sum of invoice amounts
  const transformedClients = isTotalValueSort ? clients : clients.map(client => {
    const totalValue = client.quotations.reduce(
      (sum: number, q: { invoices?: { amount: number }[] }) =>
        sum + (q.invoices?.reduce((s: number, inv: { amount: number }) => s + inv.amount, 0) ?? 0),
      0
    )
    return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone || undefined,
    company: client.company || undefined,
    companyRegistrationNumber: client.companyRegistrationNumber || undefined,
    ic: client.ic || undefined,
    address: client.address || undefined,
    notes: client.notes || undefined,
    industry: client.industry || undefined,
    yearlyRevenue: client.yearlyRevenue || undefined,
    membershipType: client.membershipType,
    quotationsCount: client.quotations.length,
    totalValue,
    created_at: client.created_at.toISOString(),
    createdById: client.createdById,
    createdBy: client.createdBy ? {
      id: client.createdBy.id,
      firstName: client.createdBy.firstName,
      lastName: client.createdBy.lastName,
      email: client.createdBy.email,
    } : undefined,
  }
  })

  return {
    data: transformedClients,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// Server-side cached version for initial page load (30 second cache). Cache key includes creatorScope so admin vs brand-advisor see correct lists.
const getCachedClientsPaginated = unstable_cache(
  async (
    creatorScope: string,
    page: number,
    pageSize: number,
    searchTerm: string,
    industry: string,
    membershipType: string,
    sortBy: string,
    sortDirection: string
  ) => {
    const createdByIdFilter = creatorScope === "admin" ? undefined : creatorScope
    return await _getClientsPaginatedInternal(page, pageSize, {
      searchTerm: searchTerm || undefined,
      industry: industry || undefined,
      membershipType: (membershipType || 'all') as 'all' | 'MEMBER' | 'NON_MEMBER',
      sortBy: (sortBy || 'created_at') as 'name' | 'yearlyRevenue' | 'totalValue' | 'created_at',
      sortDirection: (sortDirection || 'desc') as 'asc' | 'desc',
    }, createdByIdFilter)
  },
  ["clients-paginated"],
  {
    revalidate: 30,
    tags: ["clients"]
  }
)

export async function getClientsPaginated(
  page: number = 1,
  pageSize: number = 12,
  filters: {
    searchTerm?: string
    industry?: string
    membershipType?: 'all' | 'MEMBER' | 'NON_MEMBER'
    sortBy?: 'name' | 'yearlyRevenue' | 'totalValue' | 'created_at'
    sortDirection?: 'asc' | 'desc'
  } = {}
) {
  try {
    const user = await getCachedUser()
    const [isAdmin, dbUser] = await Promise.all([
      getCachedIsUserAdmin(user.id),
      prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }),
    ])
    const creatorScope = isAdmin ? "admin" : (dbUser?.id ?? "none")

    return await getCachedClientsPaginated(
      creatorScope,
      page,
      pageSize,
      filters.searchTerm || "",
      filters.industry || "all",
      filters.membershipType || "all",
      filters.sortBy || "created_at",
      filters.sortDirection || "desc"
    )
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in getClientsPaginated:', error)
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch clients: ${message}`)
  }
}

// Force fresh data (bypasses cache) - use for mutations
export async function getClientsPaginatedFresh(
  page: number = 1,
  pageSize: number = 12,
  filters: {
    searchTerm?: string
    industry?: string
    membershipType?: 'all' | 'MEMBER' | 'NON_MEMBER'
    sortBy?: 'name' | 'yearlyRevenue' | 'totalValue' | 'created_at'
    sortDirection?: 'asc' | 'desc'
  } = {}
) {
  unstable_noStore()
  const user = await getCachedUser()
  const [isAdmin, dbUser] = await Promise.all([
    getCachedIsUserAdmin(user.id),
    prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }),
  ])
  const createdByIdFilter = isAdmin ? undefined : dbUser?.id
  return await _getClientsPaginatedInternal(page, pageSize, filters, createdByIdFilter)
}

// Invalidate clients cache after mutations
export async function invalidateClientsCache() {
  revalidateTag("clients", {expire: 0})
}

/** Dashboard totals: quotation and invoice outstanding balance (visible to everyone). */
export type ClientsDashboardTotals = {
  totalQuotationBalance: number
  totalInvoiceBalance: number
}

/** Returns total quotation balance (totalPrice − invoiced) and total invoice balance (amount − received). Admin: all clients. Brand Advisors: only their created clients. */
export async function getClientsDashboardTotals(): Promise<ClientsDashboardTotals | null> {
  try {
    const user = await getCachedUser()
    if (!user?.id) return null

    const isAdmin = await getCachedIsUserAdmin(user.id)
    let clientIdFilter: string[] | undefined
    if (isAdmin) {
      clientIdFilter = undefined
    } else {
      const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } })
      clientIdFilter = dbUser
        ? (await prisma.client.findMany({ where: { createdById: dbUser.id }, select: { id: true } })).map((r) => r.id)
        : []
    }

    const quotationWhere = clientIdFilter
      ? { workflowStatus: { not: "cancelled" as const }, clientId: { in: clientIdFilter } }
      : { workflowStatus: { not: "cancelled" as const } }
    const invoiceWhere = clientIdFilter
      ? { status: { not: "cancelled" as const }, quotation: { clientId: { in: clientIdFilter } } }
      : { status: { not: "cancelled" as const } }

    const [quotationsWithInvoiced, invoicesWithReceipts] = await Promise.all([
      prisma.quotation.findMany({
        where: quotationWhere,
        select: {
          totalPrice: true,
          invoices: {
            where: { status: { not: "cancelled" } },
            select: { amount: true },
          },
        },
      }),
      prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          amount: true,
          receipts: {
            where: { status: { not: "cancelled" } },
            select: { amount: true },
          },
        },
      }),
    ])

    const totalQuotationBalance = quotationsWithInvoiced.reduce((sum, q) => {
      const totalInvoiced = q.invoices.reduce((s, inv) => s + inv.amount, 0)
      return sum + Math.max(0, q.totalPrice - totalInvoiced)
    }, 0)

    const totalInvoiceBalance = invoicesWithReceipts.reduce((sum, inv) => {
      const totalReceived = inv.receipts.reduce((s, r) => s + r.amount, 0)
      return sum + Math.max(0, inv.amount - totalReceived)
    }, 0)

    return { totalQuotationBalance, totalInvoiceBalance }
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Error in getClientsDashboardTotals:", error)
    }
    return null
  }
}

export async function getClientById(id: string) {
  try {
    const user = await getCurrentUser()
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        quotations: {
          select: {
            id: true,
            name: true,
            totalPrice: true,
            workflowStatus: true,
            paymentStatus: true,
            created_at: true,
            quotationDate: true,
            invoices: {
              where: { status: { not: "cancelled" } },
              select: {
                id: true,
                invoiceNumber: true,
                amount: true,
                type: true,
                status: true,
                created_at: true,
                invoiceDate: true,
                receipts: {
                  where: { status: { not: "cancelled" } },
                  select: { id: true, receiptNumber: true, amount: true, created_at: true, receiptDate: true, status: true },
                },
              },
            },
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            created_at: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    })

    if (!client) {
      throw new Error("Client not found")
    }

    // Brand Advisors: only allow access to clients they created. Admin: all clients.
    const isAdmin = await getCachedIsUserAdmin(user.id)
    if (!isAdmin) {
      const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } })
      if (!dbUser || client.createdById !== dbUser.id) {
        return null
      }
    }

    return client
  } catch (error: unknown) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Error in getClientById:", error)
    }
    throw new Error("Failed to fetch client")
  }
}

export async function createCustomerClient(data: unknown) {
  try {
    // Validate input
    const validatedData = createClientSchema.parse(data)
    
    await getCurrentUser() // Ensure user is authenticated
    const user = await getCachedUser() // Get Supabase user
    
    if (!user) {
      throw new Error("User must be authenticated to create a client")
    }
    
    // Get database user ID from Supabase ID
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      select: { id: true }
    })
    
    if (!dbUser) {
      throw new Error("User not found in database")
    }
    
    const client = await prisma.client.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        ic: validatedData.ic,
        phone: validatedData.phone,
        company: validatedData.company,
        companyRegistrationNumber: validatedData.companyRegistrationNumber,
        address: validatedData.address,
        notes: validatedData.notes,
        industry: validatedData.industry,
        yearlyRevenue: validatedData.yearlyRevenue,
        membershipType: validatedData.membershipType,
        createdById: dbUser.id,
      }
    })
    
    revalidatePath("/clients")
    revalidateTag("clients", { expire: 0 })
    return client
  } catch (error: unknown) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`)
    }
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Error in createClient:", error)
    }
    throw error instanceof Error ? error : new Error("Failed to create client")
  }
}

export async function updateClient(id: string, data: {
  name?: string
  email?: string
  ic?: string
  phone?: string
  company?: string
  companyRegistrationNumber?: string
  address?: string
  notes?: string
  industry?: string
  yearlyRevenue?: number
  membershipType?: "MEMBER" | "NON_MEMBER"
}) {
  try {
    // Validate input
    const validatedData = updateClientSchema.parse(data)
    
    const user = await getCurrentUser() // Ensure user is authenticated
    
    // Get database user ID from Supabase ID
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      select: { id: true }
    })
    
    if (!dbUser) {
      throw new Error("User not found")
    }
    
    // Check if user is admin or created the client
    const client = await prisma.client.findUnique({
      where: { id },
      select: { createdById: true }
    })
    
    if (!client) {
      throw new Error("Client not found")
    }
    
    // Check if user is admin
    const userWithRoles = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    const isAdmin = userWithRoles?.userRoles.some((userRole) => userRole.role.slug === "admin") || false
    
    // If not admin, check if user created the client
    if (!isAdmin && client.createdById !== dbUser.id) {
      throw new Error("You can only edit clients that you created")
    }
    
    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name: validatedData.name,
        email: validatedData.email,
        ic: validatedData.ic,
        phone: validatedData.phone,
        company: validatedData.company,
        companyRegistrationNumber: validatedData.companyRegistrationNumber,
        address: validatedData.address,
        notes: validatedData.notes,
        industry: validatedData.industry,
        yearlyRevenue: validatedData.yearlyRevenue,
        membershipType: validatedData.membershipType,
        updated_at: new Date(),
      }
    })
    
    revalidatePath("/clients")
    revalidatePath(`/clients/${id}`)
    revalidateTag("clients", { expire: 0 })
    return updatedClient
  } catch (error: unknown) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`)
    }
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Error in updateClient:", error)
    }
    throw error instanceof Error ? error : new Error("Failed to update client")
  }
}

export interface DeletionImpactItem {
	label: string
	count: number
	examples?: string[]
}

export interface DeletionImpact {
	items: DeletionImpactItem[]
}

export async function getClientDeletionImpact(id: string): Promise<DeletionImpact> {
	try {
		await getCurrentUser() // Ensure user is authenticated

		const [projects, quotations, invoices, receipts] = await Promise.all([
			prisma.project.findMany({
				where: { clientId: id },
				select: { id: true, name: true },
				take: 5,
			}),
			prisma.quotation.findMany({
				where: { clientId: id },
				select: { id: true, name: true },
				take: 5,
			}),
			prisma.invoice.findMany({
				where: {
					quotation: {
						clientId: id,
					},
				},
				select: { id: true, invoiceNumber: true },
				take: 5,
			}),
			prisma.receipt.findMany({
				where: {
					invoice: {
						quotation: {
							clientId: id,
						},
					},
				},
				select: { id: true, receiptNumber: true },
				take: 5,
			}),
		])

		const [projectsCount, quotationsCount, invoicesCount, receiptsCount] = await Promise.all([
			prisma.project.count({ where: { clientId: id } }),
			prisma.quotation.count({ where: { clientId: id } }),
			prisma.invoice.count({
				where: {
					quotation: {
						clientId: id,
					},
				},
			}),
			prisma.receipt.count({
				where: {
					invoice: {
						quotation: {
							clientId: id,
						},
					},
				},
			}),
		])

		const items: DeletionImpactItem[] = []

		if (projectsCount > 0) {
			items.push({
				label: "projects",
				count: projectsCount,
				examples: projects.map((p) => p.name),
			})
		}

		if (quotationsCount > 0) {
			items.push({
				label: "quotations",
				count: quotationsCount,
				examples: quotations.map((q) => q.name),
			})
		}

		if (invoicesCount > 0) {
			items.push({
				label: "invoices",
				count: invoicesCount,
				examples: invoices.map((i) => i.invoiceNumber),
			})
		}

		if (receiptsCount > 0) {
			items.push({
				label: "receipts",
				count: receiptsCount,
				examples: receipts.map((r) => r.receiptNumber),
			})
		}

		return { items }
	} catch (error: any) {
		if (isRedirectError(error)) throw error
		console.error("Error in getClientDeletionImpact:", error)
		throw new Error("Failed to get deletion impact")
	}
}

export async function deleteClient(id: string) {
  try {
    const user = await getCurrentUser() // Ensure user is authenticated
    
    // Get database user ID from Supabase ID
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      select: { id: true }
    })
    
    if (!dbUser) {
      throw new Error("User not found")
    }
    
    // Check if user is admin or created the client
    const client = await prisma.client.findUnique({
      where: { id },
      select: { createdById: true }
    })
    
    if (!client) {
      throw new Error("Client not found")
    }
    
    // Check if user is admin
    const userWithRoles = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    const isAdmin = userWithRoles?.userRoles.some((userRole) => userRole.role.slug === "admin") || false
    
    // If not admin, check if user created the client
    if (!isAdmin && client.createdById !== dbUser.id) {
      throw new Error("You can only delete clients that you created")
    }
    
    await prisma.client.delete({
      where: { id }
    })
    
    revalidatePath("/clients")
    revalidateTag("clients", { expire: 0 })
  } catch (error: unknown) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Error in deleteClient:", error)
    }
    throw error instanceof Error ? error : new Error("Failed to delete client")
  }
}

// Check if user is admin
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const userWithRoles = await prisma.user.findUnique({
      where: { supabase_id: userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!userWithRoles) {
      return false
    }

    return userWithRoles.userRoles.some((userRole) => userRole.role.slug === 'admin')
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Get current user's database ID
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const user = await getCachedUser()
    if (!user) return null
    
    // Get database user ID from Supabase ID
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      select: { id: true }
    })
    
    return dbUser?.id || null
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error getting current user ID:', error)
    }
    return null
  }
}

// Get all advisors (users who have created quotations that have invoices)
export async function getAllAdvisors() {
  try {
    const user = await getCachedUser()
    if (!user) return []
    
    // Check if user is admin
    const isAdmin = await checkIsAdmin(user.id)
    
    // If not admin, only return the current user
    if (!isAdmin) {
      // Check if user has any advised quotations with invoices
      const dbUser = await prisma.user.findUnique({
        where: { supabase_id: user.id },
        select: { id: true, firstName: true, lastName: true, email: true }
      })

      if (!dbUser) return []

      const hasAdvisedInvoicedQuotations = await prisma.quotation.count({
        where: {
          advisedById: dbUser.id, // Quotation.advisedById references User.id (cuid)
          invoices: {
            some: {}
          }
        }
      }) > 0

      if (!hasAdvisedInvoicedQuotations) return []

      return [{
        id: dbUser.id,
        name: `${dbUser.firstName} ${dbUser.lastName}`,
        email: dbUser.email,
      }]
    }

    // Admin can see all advisors (users who have advised quotations with invoices)
    const users = await prisma.user.findMany({
      where: {
        advisedQuotations: {
          some: {
            invoices: {
              some: {}
            }
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    return users.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
    }))
  } catch (error) {
    console.error('Error getting advisors:', error)
    return []
  }
}

// Get sales data by time period and advisor (based on invoices)
export async function getSalesData(filters: unknown) {
  try {
    // Validate input
    const validatedFilters = salesDataFiltersSchema.parse(filters)
    
    const user = await getCachedUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    // Check if user is admin
    const isAdmin = await checkIsAdmin(user.id)
    
    const { year, month, advisorId, viewMode = 'yearly' } = validatedFilters
    
    // Build where clause for invoices
    const where: Prisma.InvoiceWhereInput = {
      status: "active" as InvoiceStatus, // Exclude cancelled invoices
      ...(year && {
        invoiceDate: {
          gte: new Date(year, month !== undefined ? month : 0, 1),
          lte: month !== undefined 
            ? new Date(year, month + 1, 0, 23, 59, 59, 999)
            : new Date(year, 11, 31, 23, 59, 59, 999),
        }
      }),
      // Filter by advisor (advisedById of quotation that the invoice references)
      // For non-admin users, always filter by their own User.id (cuid), ignore advisorId parameter
      ...((!isAdmin || (advisorId && advisorId !== 'all')) && {
        quotation: {
          advisedById: !isAdmin
            ? (await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }))?.id ?? user.id
            : advisorId // advisorId is now User.id (cuid)
        }
      })
    }
    
    // Get invoices with quotation, client, and advisor info
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        quotation: {
          include: {
            Client: {
              select: {
                id: true,
                name: true,
                email: true,
                company: true,
                membershipType: true,
              }
            },
            advisedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    }) as Array<{
      id: string
      invoiceNumber: string
      type: string
      quotationId: number
      amount: number
      createdById: string
      status: InvoiceStatus
      invoiceDate: Date
      created_at: Date
      updated_at: Date
      quotation: {
        id: number
        name: string
        clientId: string
        advisedById: string | null
        Client: {
          id: string
          name: string
          email: string
          company: string | null
          membershipType: string | null
        }
        advisedBy: {
          id: string
          firstName: string
          lastName: string
          email: string
        } | null
      }
    }>
    
    // Calculate totals
    const totalSales = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const totalClients = new Set(invoices.map(inv => inv.quotation.clientId)).size
    const totalInvoices = invoices.length
    
    // Group by advisor (using quotation advisedById - User.id cuid)
    const salesByAdvisor: Record<string, {
      advisorId: string
      advisorName: string
      totalSales: number
      invoicesCount: number
      clientsCount: number
    }> = {}

    invoices.forEach(inv => {
      const advisorId = inv.quotation.advisedById ?? '' // User.id (cuid)
      if (!advisorId) return
      const advisorName = inv.quotation.advisedBy
        ? `${inv.quotation.advisedBy.firstName} ${inv.quotation.advisedBy.lastName}`
        : 'Unknown'

      if (!salesByAdvisor[advisorId]) {
        salesByAdvisor[advisorId] = {
          advisorId,
          advisorName,
          totalSales: 0,
          invoicesCount: 0,
          clientsCount: 0
        }
      }

      salesByAdvisor[advisorId].totalSales += inv.amount
      salesByAdvisor[advisorId].invoicesCount += 1
    })

    // Calculate unique clients per advisor
    Object.keys(salesByAdvisor).forEach(advisorId => {
      const advisorInvoices = invoices.filter(inv => inv.quotation.advisedById === advisorId)
      salesByAdvisor[advisorId].clientsCount = new Set(advisorInvoices.map(inv => inv.quotation.clientId)).size
    })
    
    // If yearly view, group by month
    let monthlyBreakdown: any[] = []
    if (viewMode === 'yearly' && year) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      monthlyBreakdown = months.map((monthName, monthIndex) => {
        const monthInvoices = invoices.filter(inv => {
          const invDate = new Date(inv.invoiceDate)
          return invDate.getMonth() === monthIndex
        })
        
        return {
          month: monthName,
          monthIndex,
          sales: monthInvoices.reduce((sum, inv) => sum + inv.amount, 0),
          invoices: monthInvoices.length,
          clients: new Set(monthInvoices.map(inv => inv.quotation.clientId)).size
        }
      })
    }
    
    return {
      totalSales,
      totalClients,
      totalInvoices,
      monthlyBreakdown,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        type: inv.type,
        amount: inv.amount,
        invoiceDate: inv.invoiceDate.toISOString(),
        created_at: inv.created_at.toISOString(),
        quotation: {
          id: inv.quotation.id,
          name: inv.quotation.name,
        },
        client: inv.quotation.Client,
        createdBy: {
          id: inv.quotation.advisedById ?? '',
          name: inv.quotation.advisedBy
            ? `${inv.quotation.advisedBy.firstName} ${inv.quotation.advisedBy.lastName}`
            : 'Unknown',
          email: inv.quotation.advisedBy?.email ?? '',
        }
      })),
      salesByAdvisor: Object.values(salesByAdvisor).sort((a, b) => b.totalSales - a.totalSales),
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`)
    }
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error getting sales data:', error)
    }
    throw error instanceof Error ? error : new Error("Failed to get sales data")
  }
}

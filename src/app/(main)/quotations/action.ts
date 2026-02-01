"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore, unstable_cache, revalidateTag, revalidatePath } from "next/cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { formatLocalDateTime } from "@/lib/date-utils"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import {
  quotationFiltersSchema,
  quotationPaginationSchema,
  createQuotationSchema,
  editQuotationSchema,
  quotationIdSchema,
  createCustomServiceSchema,
  updateCustomServiceStatusSchema,
  sendQuotationEmailSchema,
  updateClientMembershipSchema,
  type CreateQuotationValues,
  type EditQuotationValues,
  type QuotationFilters,
} from "@/lib/validation"

// Get all users for admin dropdown
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      supabase_id: true,
    },
    orderBy: {
      firstName: "asc"
    }
  })
  
  return users
}

export async function getAllQuotations(userId?: string) {
  // Validate userId if provided
  if (userId !== undefined && userId !== null) {
    z.string().min(1).parse(userId)
  }

  // Check if user is operation-user - if so, filter by project permissions
  const whereClause: Prisma.QuotationWhereInput = {}
  
  if (userId) {
    const { isUserOperationUser } = await import("../projects/permissions")
    const isOperationUser = await isUserOperationUser(userId)
    
    if (isOperationUser) {
      // Get user's project IDs from ProjectPermission
      const userProjects = await prisma.projectPermission.findMany({
        where: { 
          userId: userId,
          canView: true
        },
        select: { projectId: true }
      })
      const projectIds = userProjects.map(p => p.projectId)
      
      // Only show quotations linked to projects user has access to
      if (projectIds.length > 0) {
        whereClause.projectId = { in: projectIds }
      } else {
        // User has no project access, return empty array
        return []
      }
    }
    // For admin and brand-advisor, show all quotations (empty where clause)
  }

  return await prisma.quotation.findMany({
    where: whereClause,
    include: {
      services: {
        include: {
          service: true,
        },
      },
      project: true,
      createdBy: true,
      Client: true,
    },
    orderBy: { created_at: "desc" },
  })
}

// Internal function - not cached, used by cached version
async function _getQuotationsPaginatedInternal(
  page: number = 1,
  pageSize: number = 10,
  filters: QuotationFilters = {},
  userId?: string
) {
  // Validate inputs
  const validatedPage = z.number().int().positive().parse(page)
  const validatedPageSize = z.number().int().positive().max(100).parse(pageSize)
  const validatedFilters = quotationFiltersSchema.parse(filters)
  
  if (userId !== undefined && userId !== null) {
    z.string().min(1).parse(userId)
  }

  const skip = (validatedPage - 1) * validatedPageSize
  const { statusFilter } = validatedFilters

  // Build where clause
  const where: Prisma.QuotationWhereInput = {}
  if (statusFilter && statusFilter !== 'all') {
    where.workflowStatus = statusFilter
  }

  // For operation-users, filter by project permissions
  if (userId) {
    const { isUserOperationUser } = await import("../projects/permissions")
    const isOperationUser = await isUserOperationUser(userId)
    
    if (isOperationUser) {
      // Get user's project IDs from ProjectPermission
      const userProjects = await prisma.projectPermission.findMany({
        where: { 
          userId: userId,
          canView: true
        },
        select: { projectId: true }
      })
      const projectIds = userProjects.map(p => p.projectId)
      
      // Only show quotations linked to projects user has access to
      if (projectIds.length > 0) {
        where.projectId = { in: projectIds }
      } else {
        // User has no project access, return empty result
        return {
          data: [],
          total: 0,
          page: validatedPage,
          pageSize: validatedPageSize,
          totalPages: 0,
        }
      }
    }
    // For admin and brand-advisor, show all quotations
  }

  // Execute count and findMany in parallel for better performance
  const [total, quotations] = await Promise.all([
    prisma.quotation.count({ where }),
    prisma.quotation.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        totalPrice: true,
        workflowStatus: true,
        paymentStatus: true,
        discountValue: true,
        discountType: true,
        duration: true,
        startDate: true,
        endDate: true,
        clientId: true,
        created_at: true,
        updated_at: true,
        project: {
          select: {
            id: true,
            status: true,
            name: true,
          },
        },
        projectId: true,
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
        Client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            address: true,
            notes: true,
            industry: true,
            yearlyRevenue: true,
          },
        },
        customServices: {
          select: {
            id: true,
            quotationId: true,
            name: true,
            description: true,
            price: true,
            status: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        services: {
          select: {
            id: true,
            quotationId: true,
            serviceId: true,
            customServiceId: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: validatedPageSize,
    })
  ])

  // Transform data to match QuotationWithServices type (convert null to undefined)
  const transformedQuotations = quotations.map(quotation => ({
    id: quotation.id,
    name: quotation.name,
    description: quotation.description,
    totalPrice: quotation.totalPrice,
    workflowStatus: quotation.workflowStatus,
    paymentStatus: quotation.paymentStatus,
    discountValue: quotation.discountValue ?? undefined,
    discountType: quotation.discountType ?? undefined,
    duration: quotation.duration ?? undefined,
    startDate: quotation.startDate ?? undefined,
    endDate: quotation.endDate ?? undefined,
    clientId: quotation.clientId ?? undefined,
    created_at: quotation.created_at,
    updated_at: quotation.updated_at,
    Client: quotation.Client ? {
      id: quotation.Client.id,
      name: quotation.Client.name,
      email: quotation.Client.email,
      phone: quotation.Client.phone ?? undefined,
      company: quotation.Client.company ?? undefined,
      address: quotation.Client.address ?? undefined,
      notes: quotation.Client.notes ?? undefined,
      industry: quotation.Client.industry ?? undefined,
      yearlyRevenue: quotation.Client.yearlyRevenue ?? undefined,
    } : undefined,
    createdBy: quotation.createdBy,
    services: quotation.services.map(service => ({
      id: service.id,
      quotationId: service.quotationId,
      serviceId: service.serviceId,
      customServiceId: service.customServiceId ?? undefined,
      // Minimal service object for type compatibility (not used in list view)
      // Must match Services type from Prisma schema
      service: {
        id: 0,
        name: "",
        description: "",
        basePrice: 0,
        imageUrl: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    })),
    project: quotation.project ? {
      id: quotation.project.id,
      name: quotation.project.name,
      description: undefined,
      status: quotation.project.status,
      startDate: undefined,
      endDate: undefined,
      created_at: new Date(),
      updated_at: new Date(),
    } : null,
    customServices: quotation.customServices?.map(cs => ({
      id: cs.id,
      quotationId: cs.quotationId,
      name: cs.name,
      description: cs.description ?? undefined,
      price: cs.price,
      status: cs.status,
      createdById: cs.createdById ?? undefined,
      created_at: cs.createdAt,
      updated_at: cs.updatedAt,
    })) ?? [],
  }))

  return {
    data: transformedQuotations,
    total,
    page: validatedPage,
    pageSize: validatedPageSize,
    totalPages: Math.ceil(total / validatedPageSize),
  }
}

// Server-side cached version for initial page load (30 second cache)
const getCachedQuotationsPaginated = unstable_cache(
  _getQuotationsPaginatedInternal,
  ["quotations-paginated"],
  {
    revalidate: 30,
    tags: ["quotations"],
  }
)

// Client-side version: use cache when useCache is true (e.g. initial load); otherwise fresh for user-specific filtering
export async function getQuotationsPaginated(
  page: number = 1,
  pageSize: number = 10,
  filters: QuotationFilters = {},
  useCache: boolean = false
) {
  if (useCache) {
    return await getCachedQuotationsPaginated(page, pageSize, filters)
  }
  unstable_noStore()
  const user = await getCachedUser()
  const userId = user?.id
  return await _getQuotationsPaginatedInternal(page, pageSize, filters, userId)
}

// Fresh version that always bypasses cache (for client-side updates)
// Note: unstable_noStore() is required here because we need fresh user-specific data
// for operation-users who have project-based filtering.
export async function getQuotationsPaginatedFresh(
  page: number = 1,
  pageSize: number = 10,
  filters: QuotationFilters = {}
) {
  unstable_noStore()
  // Get current user for filtering
  const user = await getCachedUser()
  const userId = user?.id
  return await _getQuotationsPaginatedInternal(page, pageSize, filters, userId)
}

// Invalidate quotations cache
export async function invalidateQuotationsCache() {
  revalidateTag("quotations", { expire: 0 })
  revalidatePath("/quotations")
}

/**
 * Get all invoices for a quotation
 * Note: unstable_noStore() is required because invoice data changes frequently
 * and needs to reflect real-time status updates.
 */
export async function getInvoicesForQuotation(quotationId: number) {
	// Validate input
	const validatedId = z.number().int().positive().parse(quotationId)
	
	unstable_noStore()
	const invoices = await prisma.invoice.findMany({
		where: { quotationId: validatedId },
		select: {
			id: true,
			invoiceNumber: true,
			type: true,
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

	return invoices
}

/**
 * Get quotation by ID
 * Note: unstable_noStore() is required because quotation data may change
 * and we need fresh data for editing/viewing.
 */
export async function getQuotationById(id: string) {
  // Validate and parse ID
  const quotationId = quotationIdSchema.parse(id)
  
  unstable_noStore()
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
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
  })

  if (!quotation) {
    return null
  }

  // Transform to match QuotationWithServices type
  return {
    id: quotation.id,
    name: quotation.name,
    description: quotation.description,
    totalPrice: quotation.totalPrice,
    workflowStatus: quotation.workflowStatus,
    paymentStatus: quotation.paymentStatus,
    discountValue: quotation.discountValue ?? undefined,
    discountType: quotation.discountType ?? undefined,
    duration: quotation.duration ?? undefined,
    startDate: quotation.startDate ?? undefined,
    endDate: quotation.endDate ?? undefined,
    clientId: quotation.clientId ?? undefined,
    created_at: quotation.created_at,
    updated_at: quotation.updated_at,
    Client: quotation.Client ? {
      id: quotation.Client.id,
      name: quotation.Client.name,
      email: quotation.Client.email,
      phone: quotation.Client.phone ?? undefined,
      company: quotation.Client.company ?? undefined,
      address: quotation.Client.address ?? undefined,
      notes: quotation.Client.notes ?? undefined,
      industry: quotation.Client.industry ?? undefined,
      yearlyRevenue: quotation.Client.yearlyRevenue ?? undefined,
    } : undefined,
    createdBy: quotation.createdBy,
    services: quotation.services.map(service => ({
      id: service.id,
      quotationId: service.quotationId,
      serviceId: service.serviceId,
      customServiceId: service.customServiceId ?? undefined,
      service: service.service,
    })),
    project: quotation.project ? {
      id: quotation.project.id,
      name: quotation.project.name,
      description: quotation.project.description ?? undefined,
      status: quotation.project.status,
      startDate: quotation.project.startDate ?? undefined,
      endDate: quotation.project.endDate ?? undefined,
      created_at: quotation.project.created_at,
      updated_at: quotation.project.updated_at,
    } : null,
    customServices: quotation.customServices.map(cs => ({
      id: cs.id,
      quotationId: cs.quotationId,
      name: cs.name,
      description: cs.description ?? undefined,
      price: cs.price,
      status: cs.status,
      createdById: cs.createdById ?? undefined,
      created_at: cs.createdAt,
      updated_at: cs.updatedAt,
    })),
  }
}

/**
 * Get full quotation data with all related entities
 * Used for PDF generation, email sending, and editing
 * This fetches complete data including all service details
 * Note: unstable_noStore() is required because we need fresh data for PDF/email generation.
 */
export async function getQuotationFullById(id: string) {
  // Validate and parse ID
  const quotationId = quotationIdSchema.parse(id)
  
  unstable_noStore()
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
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
  })

  if (!quotation) {
    return null
  }

  // Transform to match QuotationWithServices type
  return {
    id: quotation.id,
    name: quotation.name,
    description: quotation.description,
    totalPrice: quotation.totalPrice,
    workflowStatus: quotation.workflowStatus,
    paymentStatus: quotation.paymentStatus,
    discountValue: quotation.discountValue ?? undefined,
    discountType: quotation.discountType ?? undefined,
    duration: quotation.duration ?? undefined,
    startDate: quotation.startDate ?? undefined,
    endDate: quotation.endDate ?? undefined,
    clientId: quotation.clientId ?? undefined,
    created_at: quotation.created_at,
    updated_at: quotation.updated_at,
    Client: quotation.Client ? {
      id: quotation.Client.id,
      name: quotation.Client.name,
      email: quotation.Client.email,
      phone: quotation.Client.phone ?? undefined,
      company: quotation.Client.company ?? undefined,
      address: quotation.Client.address ?? undefined,
      notes: quotation.Client.notes ?? undefined,
      industry: quotation.Client.industry ?? undefined,
      yearlyRevenue: quotation.Client.yearlyRevenue ?? undefined,
    } : undefined,
    createdBy: quotation.createdBy,
    services: quotation.services.map(service => ({
      id: service.id,
      quotationId: service.quotationId,
      serviceId: service.serviceId,
      customServiceId: service.customServiceId ?? undefined,
      service: service.service,
    })),
    project: quotation.project ? {
      id: quotation.project.id,
      name: quotation.project.name,
      description: quotation.project.description ?? undefined,
      status: quotation.project.status,
      startDate: quotation.project.startDate ?? undefined,
      endDate: quotation.project.endDate ?? undefined,
      created_at: quotation.project.created_at,
      updated_at: quotation.project.updated_at,
    } : null,
    customServices: quotation.customServices.map(cs => ({
      id: cs.id,
      quotationId: cs.quotationId,
      name: cs.name,
      description: cs.description ?? undefined,
      price: cs.price,
      status: cs.status,
      createdById: cs.createdById ?? undefined,
      created_at: cs.createdAt,
      updated_at: cs.updatedAt,
      createdBy: cs.createdBy,
      reviewedBy: cs.reviewedBy,
    })),
  }
}

/**
 * Generate quotation number using PostgreSQL function
 * This function must be called within a transaction to prevent race conditions
 */
async function generateQuotationNumber(
  tx: Prisma.TransactionClient
): Promise<string> {
  const startTime = Date.now()
  
  // Call the PostgreSQL function to generate gapless quotation number
  const result = await tx.$queryRaw<Array<{ generate_gapless_quotation_name: string }>>`
    SELECT generate_gapless_quotation_name() as "generate_gapless_quotation_name"
  `
  
  if (!result || result.length === 0 || !result[0]?.generate_gapless_quotation_name) {
    throw new Error("Failed to generate quotation number")
  }
  
  const quotationNumber = result[0].generate_gapless_quotation_name
  const duration = Date.now() - startTime
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] Generated quotation number: ${quotationNumber} (took ${duration}ms)`)
  }
  
  return quotationNumber
}

export async function createQuotation(data: unknown) {
  // Validate input with Zod
  const validatedData = createQuotationSchema.parse(data) as CreateQuotationValues
  // No project requirement for finalizing quotations - users can link projects anytime

  // Calculate end date if start date and duration are provided
  let endDate: Date | undefined = undefined;
  if (validatedData.startDate && validatedData.duration) {
    const startDate = new Date(validatedData.startDate);
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + validatedData.duration);
  }

  // Get current user for createdById - always use server session, never trust client
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to create a quotation")
  }

  // Verify the createdById matches the current user (security check)
  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
    select: { id: true, supabase_id: true }
  })
  
  if (!dbUser) {
    throw new Error("User not found in database")
  }

  // Never trust client-provided createdById - use server session
  // Only allow admin to set different createdById (handled separately if needed)
  const isAdmin = await getCachedIsUserAdmin(user.id)
  const finalCreatedById = isAdmin && validatedData.createdById !== user.id
    ? validatedData.createdById
    : user.id

  // Retry logic for handling unique constraint violations (race conditions)
  // Use SERIALIZABLE isolation to ensure strict serialization of quotation number generation
  const maxRetries = 3
  let lastError: unknown = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const quotation = await prisma.$transaction(async (tx) => {
        let finalClientId = validatedData.clientId;

        // If creating a new client, create it first
        if (validatedData.newClient && !validatedData.clientId) {
          const newClient = await tx.client.create({
            data: {
              name: validatedData.newClient.name,
              email: validatedData.newClient.email,
              phone: validatedData.newClient.phone,
              company: validatedData.newClient.company,
              companyRegistrationNumber: validatedData.newClient.companyRegistrationNumber,
              address: validatedData.newClient.address,
              notes: validatedData.newClient.notes,
              industry: validatedData.newClient.industry,
              yearlyRevenue: validatedData.newClient.yearlyRevenue ? parseFloat(validatedData.newClient.yearlyRevenue) : null,
              membershipType: validatedData.newClient.membershipType || "NON_MEMBER",
              createdById: dbUser.id,
            }
          });
          finalClientId = newClient.id;
        }

        // Ensure we have a client ID
        if (!finalClientId) {
          throw new Error("Client ID is required");
        }

        // Prevent linking projects to draft quotations
        const workflowStatus = validatedData.workflowStatus || "draft"
        if (validatedData.projectId !== undefined && 
            validatedData.projectId !== null && 
            workflowStatus === "draft") {
          throw new Error("Draft quotations cannot be linked to projects. Please finalize the quotation first.")
        }

        // Generate quotation number within transaction to prevent race conditions
        // This ensures the number is generated atomically right before creation
        // The number is only generated when user clicks "Create" or "Save as Draft"
        // and is not shown to the user until the quotation is successfully created
        // Note: SERIALIZABLE isolation level ensures the PostgreSQL function runs atomically
        const quotationNumber = await generateQuotationNumber(tx)

        // Debug: Check if number already exists before creating
        if (process.env.NODE_ENV === 'development') {
          const existing = await tx.quotation.findUnique({
            where: { name: quotationNumber },
            select: { id: true, name: true }
          })
          if (existing) {
            // eslint-disable-next-line no-console
            console.error(`[DEBUG] COLLISION DETECTED: Quotation number ${quotationNumber} already exists! ID: ${existing.id}`)
          }
        }

        // Verify the user exists (createdById in Quotation model references User.supabase_id, not User.id)
        const quotationDbUser = await tx.user.findUnique({
          where: { supabase_id: finalCreatedById },
          select: { supabase_id: true }
        })

        if (!quotationDbUser) {
          throw new Error("Creator user not found in database")
        }

        const quotation = await tx.quotation.create({
          data: {
            name: quotationNumber,
            description: validatedData.description,
            totalPrice: validatedData.totalPrice,
            createdById: finalCreatedById, // Use supabase_id string directly
            workflowStatus: validatedData.workflowStatus || "draft", // Default to draft, user sets to final when ready
            paymentStatus: validatedData.paymentStatus || "unpaid", // Default to unpaid
            clientId: finalClientId,
            projectId: validatedData.projectId || null,
            discountValue: validatedData.discountValue || null,
            discountType: validatedData.discountType || null,
            duration: validatedData.duration || 0,
            startDate: validatedData.startDate ? new Date(validatedData.startDate) : new Date(),
            endDate: endDate || new Date(),

            services: {
              create: validatedData.serviceIds.map((serviceId) => ({
                serviceId: Number.parseInt(serviceId),
              })),
            },
          },
          include: {
            Client: true,
            services: {
              include: {
                service: true,
              },
            },
            createdBy: true,
          },
        })
        
        return quotation
      }, {
        // Use SERIALIZABLE isolation level to prevent concurrent transactions
        // from generating duplicate quotation numbers
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000, // Wait up to 5 seconds for transaction to start
        timeout: 10000, // Transaction timeout of 10 seconds
      })
      
      // Success - invalidate cache and return
      revalidateTag("quotations", { expire: 0 })
      revalidatePath("/quotations")
      return quotation
    } catch (error: unknown) {
      lastError = error
      
      // Enhanced error logging with quotation number if available
      if (process.env.NODE_ENV === 'development') {
        // Try to extract quotation number from error context if available
        if (error && typeof error === 'object' && 'meta' in error) {
          const meta = error.meta as { target?: string[] }
          if (meta?.target?.includes('name')) {
            // eslint-disable-next-line no-console
            console.error(`[DEBUG] Unique constraint violation on 'name' field`)
          }
        }
        // Log full error details for debugging
        // eslint-disable-next-line no-console
        console.error(`[DEBUG] Quotation creation error (attempt ${attempt + 1}/${maxRetries}):`, {
          error,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorCode: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
        })
      }
      
      // Check if it's a retryable error:
      // 1. Unique constraint violation (P2002) - quotation number collision
      // 2. Serialization failure (P2034) - SERIALIZABLE isolation conflict
      const isRetryableError = 
        (error && typeof error === 'object' && 'code' in error && 
         (error.code === 'P2002' || error.code === 'P2034')) ||
        (error instanceof Error &&
         (error.message.includes("Unique constraint failed") ||
          error.message.includes("duplicate key value") ||
          error.message.includes("Unique constraint failed on the fields: (`name`)") ||
          error.message.includes("serialization failure") ||
          error.message.includes("could not serialize")))
      
      // If it's not a retryable error or we've exhausted retries, throw
      if (!isRetryableError || attempt === maxRetries - 1) {
        // Gate logging by environment
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error(`Error creating quotation (attempt ${attempt + 1}/${maxRetries}):`, error)
        }
        throw error
      }
      
      // Wait a short random time before retrying to reduce collision probability
      // Use exponential backoff: longer delay on each retry
      const baseDelay = 50
      const maxDelay = 500
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 100, maxDelay)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error("Failed to create quotation after multiple attempts")
}

export async function editQuotationById(
  id: string,
  data: unknown
) {
  // Validate inputs
  const quotationId = quotationIdSchema.parse(id)
  const validatedData = editQuotationSchema.parse(data) as EditQuotationValues

  // No project requirement for finalizing quotations - users can link projects anytime

  // Get current user - always use server session
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to edit a quotation")
  }

  // Check if admin is trying to change createdBy
  let finalCreatedById: string | undefined = undefined
  if (validatedData.createdById) {
    const isAdmin = await getCachedIsUserAdmin(user.id)
    if (!isAdmin) {
      throw new Error("Only admins can change the creator of a quotation")
    }
    
    // Verify the user exists
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: validatedData.createdById },
      select: { supabase_id: true }
    })
    
    if (!dbUser) {
      throw new Error("Selected user not found in database")
    }
    
    finalCreatedById = validatedData.createdById
  }

  // Check authorization: Only admin or quotation creator can edit
  unstable_noStore()
  const currentQuotationForAuth = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: { 
      createdById: true, 
      workflowStatus: true,
      description: true,
      totalPrice: true,
      paymentStatus: true,
      clientId: true,
      projectId: true,
      discountValue: true,
      discountType: true,
      duration: true,
    }
  })

  if (!currentQuotationForAuth) {
    throw new Error("Quotation not found")
  }

  const isAdmin = await getCachedIsUserAdmin(user.id)
  
  // Authorization: Only admin or quotation creator can edit quotations
  // Exception: Non-admin users can update payment status for finalized quotations
  // Exception: Non-admin users can cancel finalized quotations that are not linked to projects
  // Exception: Non-admin users can only change draft quotations to "draft" or "cancelled"
  const isFinalizedQuotation = currentQuotationForAuth.workflowStatus === "final"
  const isDraftQuotation = currentQuotationForAuth.workflowStatus === "draft"
  
  // Check if quotation has a project (already fetched in currentQuotationForAuth)
  const hasProject = currentQuotationForAuth.projectId !== null && currentQuotationForAuth.projectId !== undefined
  
  // Check if this is a payment-status-only update (non-admin editing finalized quotation)
  // We check by seeing if only paymentStatus is being changed and all other fields match current values
  const isPaymentStatusOnlyUpdate = isFinalizedQuotation && 
    validatedData.paymentStatus !== undefined &&
    validatedData.paymentStatus !== currentQuotationForAuth.paymentStatus &&
    validatedData.description === currentQuotationForAuth.description &&
    validatedData.totalPrice === currentQuotationForAuth.totalPrice &&
    (validatedData.workflowStatus === undefined || validatedData.workflowStatus === currentQuotationForAuth.workflowStatus) &&
    !validatedData.serviceIds && // No service changes
    (validatedData.clientId === undefined || validatedData.clientId === currentQuotationForAuth.clientId) &&
    !validatedData.newClient && // No new client
    (validatedData.projectId === undefined || validatedData.projectId === currentQuotationForAuth.projectId) &&
    (validatedData.discountValue === undefined || validatedData.discountValue === (currentQuotationForAuth.discountValue ?? 0)) &&
    (validatedData.discountType === undefined || validatedData.discountType === currentQuotationForAuth.discountType) &&
    (validatedData.duration === undefined || validatedData.duration === currentQuotationForAuth.duration) &&
    validatedData.createdById === undefined // No creator change

  // Check if this is a cancellation update (non-admin cancelling finalized quotation without project)
  const isCancellationUpdate = isFinalizedQuotation && 
    !hasProject &&
    validatedData.workflowStatus === "cancelled" &&
    validatedData.description === currentQuotationForAuth.description &&
    validatedData.totalPrice === currentQuotationForAuth.totalPrice &&
    (validatedData.paymentStatus === undefined || validatedData.paymentStatus === currentQuotationForAuth.paymentStatus) &&
    !validatedData.serviceIds && // No service changes
    (validatedData.clientId === undefined || validatedData.clientId === currentQuotationForAuth.clientId) &&
    !validatedData.newClient && // No new client
    (validatedData.projectId === undefined || validatedData.projectId === currentQuotationForAuth.projectId) &&
    (validatedData.discountValue === undefined || validatedData.discountValue === (currentQuotationForAuth.discountValue ?? 0)) &&
    (validatedData.discountType === undefined || validatedData.discountType === currentQuotationForAuth.discountType) &&
    (validatedData.duration === undefined || validatedData.duration === currentQuotationForAuth.duration) &&
    validatedData.createdById === undefined // No creator change

  // Check if this is a combined update (payment status + cancellation)
  const isCombinedUpdate = isFinalizedQuotation && 
    !hasProject &&
    validatedData.workflowStatus === "cancelled" &&
    validatedData.paymentStatus !== undefined &&
    validatedData.paymentStatus !== currentQuotationForAuth.paymentStatus &&
    validatedData.description === currentQuotationForAuth.description &&
    validatedData.totalPrice === currentQuotationForAuth.totalPrice &&
    !validatedData.serviceIds && // No service changes
    (validatedData.clientId === undefined || validatedData.clientId === currentQuotationForAuth.clientId) &&
    !validatedData.newClient && // No new client
    (validatedData.projectId === undefined || validatedData.projectId === currentQuotationForAuth.projectId) &&
    (validatedData.discountValue === undefined || validatedData.discountValue === (currentQuotationForAuth.discountValue ?? 0)) &&
    (validatedData.discountType === undefined || validatedData.discountType === currentQuotationForAuth.discountType) &&
    (validatedData.duration === undefined || validatedData.duration === currentQuotationForAuth.duration) &&
    validatedData.createdById === undefined // No creator change

  // Ensure draft quotations can only be changed to "draft" or "cancelled" by non-admin users
  if (!isAdmin && isDraftQuotation && validatedData.workflowStatus !== undefined && 
      validatedData.workflowStatus !== "draft" && validatedData.workflowStatus !== "cancelled") {
    throw new Error("You can only change the workflow status to 'draft' or 'cancelled' for draft quotations")
  }

  if (!isAdmin && currentQuotationForAuth.createdById !== user.id) {
    // Allow non-admin users to:
    // 1. Update payment status for finalized quotations
    // 2. Cancel finalized quotations that are not linked to projects
    // 3. Update payment status and cancel in the same update (if unlinked)
    // Note: Non-admin users editing their own draft quotations are allowed (checked above for workflow status restriction)
    
    if (!isPaymentStatusOnlyUpdate && !isCancellationUpdate && !isCombinedUpdate) {
      throw new Error("You can only edit quotations you created, update payment status for finalized quotations, or cancel finalized quotations that are not linked to projects")
    }
    
    // Prevent cancelling quotations that are linked to projects
    if ((isCancellationUpdate || isCombinedUpdate) && hasProject) {
      throw new Error("Cannot cancel a quotation that is linked to a project")
    }
    
    // Ensure cancellation is only to "cancelled" status
    if ((isCancellationUpdate || isCombinedUpdate) && validatedData.workflowStatus !== "cancelled") {
      throw new Error("You can only change the workflow status to 'cancelled' for finalized quotations")
    }
  }

  // Prevent linking projects to draft quotations through edit form
  if (validatedData.projectId !== undefined && 
      validatedData.projectId !== null && 
      currentQuotationForAuth.workflowStatus === "draft") {
    throw new Error("Draft quotations cannot be linked to projects. Please finalize the quotation first.")
  }

  const quotation = await prisma.$transaction(async (tx) => {
    // First, get the current quotation to check if it has a project
    const currentQuotation = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: { project: true }
    });

    if (!currentQuotation) {
      throw new Error("Quotation not found")
    }

    // Delete existing quotation services
    await tx.quotationService.deleteMany({
      where: { quotationId },
    });

    // Calculate end date if start date and duration are provided
    let endDate: Date | undefined = undefined;
    if (validatedData.startDate && validatedData.duration) {
      const startDate = new Date(validatedData.startDate);
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + validatedData.duration);
    }

    let finalClientId = validatedData.clientId;

    // If creating a new client, create it first
    if (validatedData.newClient && !validatedData.clientId) {
      // Get database user ID from Supabase ID (Client model references User.id, not supabase_id)
      const dbUser = await tx.user.findUnique({
        where: { supabase_id: user.id },
        select: { id: true }
      })
      
      if (!dbUser) {
        throw new Error("User not found in database")
      }

      const newClient = await tx.client.create({
        data: {
          name: validatedData.newClient.name,
          email: validatedData.newClient.email,
          phone: validatedData.newClient.phone,
          company: validatedData.newClient.company,
          address: validatedData.newClient.address,
          notes: validatedData.newClient.notes,
          industry: validatedData.newClient.industry,
          yearlyRevenue: validatedData.newClient.yearlyRevenue ? parseFloat(validatedData.newClient.yearlyRevenue) : null,
          membershipType: validatedData.newClient.membershipType || "NON_MEMBER",
          createdById: dbUser.id,
        }
      });
      finalClientId = newClient.id;
    }

    // Ensure we have a client ID
    if (!finalClientId) {
      throw new Error("Client ID is required");
    }

    // Update the quotation (don't update name as it's auto-generated)
    // Note: createdById in Quotation model references User.supabase_id (String), not User.id (number)
    // For non-admin users updating payment status or cancelling finalized quotations, only update allowed fields
    const updateData: any = {}
    
    if (isPaymentStatusOnlyUpdate) {
      // Non-admin user updating only payment status for finalized quotation
      updateData.paymentStatus = validatedData.paymentStatus
    } else if (isCancellationUpdate) {
      // Non-admin user cancelling finalized quotation (not linked to project)
      updateData.workflowStatus = validatedData.workflowStatus
    } else if (isCombinedUpdate) {
      // Non-admin user updating payment status and cancelling in same update
      updateData.paymentStatus = validatedData.paymentStatus
      updateData.workflowStatus = validatedData.workflowStatus
    } else {
      // Admin or creator editing full quotation
      updateData.description = validatedData.description
      updateData.totalPrice = validatedData.totalPrice
      updateData.workflowStatus = validatedData.workflowStatus
      updateData.paymentStatus = validatedData.paymentStatus
      updateData.clientId = finalClientId
      updateData.projectId = validatedData.projectId !== undefined ? validatedData.projectId : currentQuotation.projectId
      updateData.discountValue = validatedData.discountValue !== undefined ? validatedData.discountValue : null
      updateData.discountType = validatedData.discountType !== undefined ? validatedData.discountType : null
      updateData.duration = validatedData.duration !== undefined ? validatedData.duration : 0
      updateData.startDate = validatedData.startDate ? new Date(validatedData.startDate) : new Date()
      updateData.endDate = endDate || new Date()
      updateData.createdById = finalCreatedById !== undefined ? finalCreatedById : undefined
      updateData.services = validatedData.serviceIds
        ? {
            create: validatedData.serviceIds.map((serviceId) => ({
              serviceId: Number.parseInt(serviceId),
            })),
          }
        : undefined
    }

    const updatedQuotation = await tx.quotation.update({
      where: { id: quotationId },
      data: updateData,
      include: {
        Client: true,
        services: {
          include: {
            service: true,
          },
        },
        createdBy: true,
        project: true,
      },
    });

    // If cancelling the quotation, cascade cancel all related invoices and receipts
    if (validatedData.workflowStatus === "cancelled" && currentQuotation.workflowStatus !== "cancelled") {
      // Get all active invoices for this quotation
      const activeInvoices = await tx.invoice.findMany({
        where: {
          quotationId: quotationId,
          status: "active",
        },
        select: {
          id: true,
        },
      })

      const invoiceIds = activeInvoices.map(inv => inv.id)

      if (invoiceIds.length > 0) {
        // Cancel all active invoices
        await tx.invoice.updateMany({
          where: {
            id: { in: invoiceIds },
            status: "active",
          },
          data: {
            status: "cancelled",
            updated_at: new Date(),
          },
        })

        // Cancel all active receipts for these invoices
        await tx.receipt.updateMany({
          where: {
            invoiceId: { in: invoiceIds },
            status: "active",
          },
          data: {
            status: "cancelled",
            updated_at: new Date(),
          },
        })
      }
    }

    return updatedQuotation;
  }, { timeout: 15000 }) // Increased timeout for production network latency

  // Revalidate caches after cascade cancellation
  if (validatedData.workflowStatus === "cancelled") {
    revalidateTag("quotations", { expire: 0 })
    revalidateTag("invoices", { expire: 0 })
    revalidateTag("receipts", { expire: 0 })
    revalidatePath("/quotations")
    revalidatePath("/invoices")
    revalidatePath("/receipts")
  }

  return quotation
}

export async function deleteQuotationById(id: string) {
  // Validate input
  const quotationId = quotationIdSchema.parse(id)
  
  unstable_noStore()
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to delete a quotation")
  }

  // Get database user ID
  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
    select: { id: true }
  })

  if (!dbUser) {
    throw new Error("User not found in database")
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: {
      id: true,
      workflowStatus: true,
      projectId: true,
      createdById: true,
    },
  })

  if (!quotation) {
    throw new Error("Quotation not found")
  }

  // Only allow deletion if user is the creator or admin
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (quotation.createdById !== dbUser.id && !isAdmin) {
    throw new Error("You don't have permission to delete this quotation")
  }

  // Enforce deletion rules: only draft quotations without projects can be deleted
  if (quotation.workflowStatus !== "draft") {
    throw new Error("Only draft quotations can be deleted")
  }

  if (quotation.projectId !== null) {
    throw new Error("Cannot delete a quotation that is linked to a project. Unlink the project first.")
  }

  await prisma.quotation.delete({
    where: { id: quotationId },
  })

  revalidateTag("quotations", { expire: 0 })
  revalidatePath("/quotations")
}

/**
 * Reactivate a cancelled quotation and optionally reactivate related invoices and receipts
 * - Sets quotation workflowStatus from "cancelled" to "final"
 * - Optionally reactivates all cancelled invoices for this quotation
 * - Optionally reactivates all cancelled receipts for those invoices
 */
export async function reactivateQuotationCascade(
  quotationId: unknown,
  options: {
    reactivateInvoices?: boolean
    reactivateReceipts?: boolean
  } = {}
) {
  // Validate input
  const validatedQuotationId = quotationIdSchema.parse(quotationId)
  
  unstable_noStore()
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated")
  }

  // Check if user is admin
  const isAdmin = await getCachedIsUserAdmin(user.id)

  // Get quotation to check ownership and status
  const quotation = await prisma.quotation.findUnique({
    where: { id: validatedQuotationId },
    select: {
      id: true,
      workflowStatus: true,
      createdById: true,
    },
  })

  if (!quotation) {
    throw new Error("Quotation not found")
  }

  if (quotation.workflowStatus !== "cancelled") {
    throw new Error("Only cancelled quotations can be reactivated")
  }

  // Only allow if user is the creator or admin
  // quotation.createdById is a Supabase ID (string), so compare with user.id (also Supabase ID)
  if (quotation.createdById !== user.id && !isAdmin) {
    throw new Error("You don't have permission to reactivate this quotation")
  }

  // Use transaction to reactivate quotation and optionally invoices/receipts
  const result = await prisma.$transaction(async (tx) => {
    // Reactivate the quotation (set to final)
    const reactivatedQuotation = await tx.quotation.update({
      where: { id: validatedQuotationId },
      data: {
        workflowStatus: "final",
      },
      include: {
        Client: true,
        services: {
          include: {
            service: true,
          },
        },
        createdBy: true,
        project: true,
      },
    })

    // Optionally reactivate invoices
    if (options.reactivateInvoices) {
      const cancelledInvoices = await tx.invoice.findMany({
        where: {
          quotationId: validatedQuotationId,
          status: "cancelled",
        },
        select: {
          id: true,
        },
      })

      const invoiceIds = cancelledInvoices.map(inv => inv.id)

      if (invoiceIds.length > 0) {
        await tx.invoice.updateMany({
          where: {
            id: { in: invoiceIds },
            status: "cancelled",
          },
          data: {
            status: "active",
            updated_at: new Date(),
          },
        })

        // Optionally reactivate receipts for these invoices
        if (options.reactivateReceipts) {
          await tx.receipt.updateMany({
            where: {
              invoiceId: { in: invoiceIds },
              status: "cancelled",
            },
            data: {
              status: "active",
              updated_at: new Date(),
            },
          })
        }
      }
    }

    return reactivatedQuotation
  }, { timeout: 15000 }) // Increased timeout for production network latency

  // Revalidate caches
  revalidateTag("quotations", { expire: 0 })
  revalidateTag("invoices", { expire: 0 })
  revalidateTag("receipts", { expire: 0 })
  revalidatePath("/quotations")
  revalidatePath(`/quotations/${validatedQuotationId}`)
  revalidatePath("/invoices")
  revalidatePath("/receipts")

  return result
}

export async function getClientById(id: string) {
  unstable_noStore()
  return await prisma.client.findUnique({
    where: { id },
  })
}

/**
 * Get all clients optimized for quotation selection
 * Returns only essential fields needed for client selection
 * Note: unstable_noStore() is required because client list may change frequently.
 */
export async function getClientsForQuotationOptimized() {
  unstable_noStore()
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
      },
      orderBy: {
        name: "asc",
      },
    })
    return clients.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      company: client.company ?? undefined,
    }))
  } catch (error: unknown) {
    // Gate logging by environment
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Error fetching clients for quotation:", error)
    }
    return []
  }
}

/**
 * Get all projects optimized for quotation selection
 * Returns only essential fields needed for project selection
 * Note: unstable_noStore() is required because project list may change frequently.
 */
export async function getProjectsForQuotationOptimized(userId: string) {
  // Validate input
  z.string().min(1).parse(userId)
  
  unstable_noStore()
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { supabase_id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    const isAdmin = user?.userRoles.some((userRole) => userRole.role.slug === "admin") || false

    let projects

    if (isAdmin) {
      // Admin can see all projects
      projects = await prisma.project.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          Client: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      })
    } else {
      // Get projects user has permissions for
      const userPermissions = await prisma.projectPermission.findMany({
        where: {
          userId,
          OR: [
            { isOwner: true },
            { canView: true },
          ],
        },
        select: {
          projectId: true,
        },
      })

      const projectIds = userPermissions.map((p) => p.projectId)

      if (projectIds.length === 0) {
        return []
      }

      projects = await prisma.project.findMany({
        where: {
          id: { in: projectIds },
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          Client: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      })
    }

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description ?? undefined,
      status: project.status,
      startDate: project.startDate ?? undefined,
      endDate: project.endDate ?? undefined,
      Client: project.Client,
    }))
  } catch (error: unknown) {
    // Gate logging by environment
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Error fetching projects for quotation:", error)
    }
    return []
  }
}

export async function updateClientMembershipStatus(
  clientId: string,
  membershipType: "MEMBER" | "NON_MEMBER"
) {
  // Validate input
  const validated = updateClientMembershipSchema.parse({ clientId, membershipType })
  
  unstable_noStore()
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated")
  }

  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) {
    throw new Error("Only admins can update membership status")
  }

  await prisma.client.update({
    where: { id: validated.clientId },
    data: { membershipType: validated.membershipType },
  })

  revalidateTag("quotations", { expire: 0 })
  revalidatePath("/quotations")
}

export async function updateQuotationProjectId(quotationId: number, projectId: number | null) {
  // Validate inputs
  const validatedQuotationId = z.number().int().positive().parse(quotationId)
  const validatedProjectId = projectId !== null 
    ? z.number().int().positive().parse(projectId)
    : null
  
  // Get current user for authorization
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to update quotation project")
  }

  // Check if user is admin
  const isAdmin = await getCachedIsUserAdmin(user.id)

  // Get quotation to check ownership and status
  unstable_noStore()
  const quotation = await prisma.quotation.findUnique({
    where: { id: validatedQuotationId },
    select: { createdById: true, workflowStatus: true }
  })

  if (!quotation) {
    throw new Error("Quotation not found")
  }

  // Authorization: Only admin or quotation creator can link/unlink projects
  if (!isAdmin && quotation.createdById !== user.id) {
    throw new Error("You can only link or unlink projects for quotations you created")
  }

  // Prevent linking projects to draft quotations (but allow unlinking)
  if (validatedProjectId !== null && quotation.workflowStatus === "draft") {
    throw new Error("Draft quotations cannot be linked to projects. Please finalize the quotation first.")
  }

  await prisma.quotation.update({
    where: { id: validatedQuotationId },
    data: { projectId: validatedProjectId },
  })
  revalidateTag("quotations", { expire: 0 })
  revalidatePath("/quotations")
}

export async function linkProjectAndUpdateQuotationStatus(quotationId: number, projectId: number) {
  // Validate inputs
  const validatedQuotationId = z.number().int().positive().parse(quotationId)
  const validatedProjectId = z.number().int().positive().parse(projectId)
  
  // Get current user for authorization
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to link project to quotation")
  }

  // Check if user is admin
  const isAdmin = await getCachedIsUserAdmin(user.id)

  // Get quotation to check ownership and status
  unstable_noStore()
  const quotation = await prisma.quotation.findUnique({
    where: { id: validatedQuotationId },
    select: { createdById: true, workflowStatus: true }
  })

  if (!quotation) {
    throw new Error("Quotation not found")
  }

  // Authorization: Only admin or quotation creator can link projects
  if (!isAdmin && quotation.createdById !== user.id) {
    throw new Error("You can only link projects to quotations you created")
  }

  // Prevent linking projects to draft quotations
  if (quotation.workflowStatus === "draft") {
    throw new Error("Draft quotations cannot be linked to projects. Please finalize the quotation first.")
  }

  // Just link the project, don't change status - users can link projects anytime
  const updatedQuotation = await prisma.quotation.update({
    where: { id: validatedQuotationId },
    data: {
      projectId: validatedProjectId,
      // Don't automatically change status to final - let users finalize when ready
    },
  })
  revalidateTag("quotations", { expire: 0 })
  revalidatePath("/quotations")
  return updatedQuotation
}

export async function getCustomServicesByQuotationId(quotationId: number) {
  // Validate input
  const validatedId = z.number().int().positive().parse(quotationId)
  
  unstable_noStore()
  return await prisma.customService.findMany({
    where: { quotationId: validatedId },
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
      quotation: {
        select: {
          id: true,
          name: true,
          Client: {
            select: {
              name: true,
              company: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

// Get all custom services (for admin)
export async function getAllCustomServices() {
  unstable_noStore()
  return await prisma.customService.findMany({
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
      quotation: {
        select: {
          id: true,
          name: true,
          Client: {
            select: {
              name: true,
              company: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

// Get custom services for a specific user
export async function getUserCustomServices(userId: string) {
  unstable_noStore()
  return await prisma.customService.findMany({
    where: {
      createdById: userId,
    },
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
      quotation: {
        select: {
          id: true,
          name: true,
          Client: {
            select: {
              name: true,
              company: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function createCustomService(
  quotationId: number,
  data: unknown
) {
  // Validate inputs
  const validatedId = z.number().int().positive().parse(quotationId)
  const validatedData = createCustomServiceSchema.parse({ 
    ...(typeof data === 'object' && data !== null ? data : {}), 
    quotationId: validatedId 
  })
  
  unstable_noStore()
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to create a custom service")
  }

  // Verify user exists (createdById in CustomService model references User.supabase_id, not User.id)
  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
    select: { supabase_id: true }
  })

  if (!dbUser) {
    throw new Error("User not found in database")
  }

  return await prisma.customService.create({
    data: {
      quotationId: validatedId,
      name: validatedData.name,
      description: validatedData.description,
      price: validatedData.price,
      createdById: user.id, // Use supabase_id string directly
    },
    include: {
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })
}

export async function updateCustomServiceStatus(
  customServiceId: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
  comment?: string
) {
  // Validate inputs
  const validated = updateCustomServiceStatusSchema.parse({ customServiceId, status, comment })
  
  unstable_noStore()
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to update custom service status")
  }

  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) {
    throw new Error("Only admins can update custom service status")
  }

  // Verify user exists (reviewedById in CustomService model references User.supabase_id, not User.id)
  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
    select: { supabase_id: true }
  })

  if (!dbUser) {
    throw new Error("User not found in database")
  }

  return await prisma.$transaction(async (tx) => {
    const customService = await tx.customService.update({
      where: { id: validated.customServiceId },
      data: {
        status: validated.status,
        reviewedById: user.id, // Use supabase_id string directly
        approvalComment: validated.status === "APPROVED" ? validated.comment ?? null : null,
        rejectionComment: validated.status === "REJECTED" ? validated.comment ?? null : null,
      },
      include: {
        quotation: {
          include: {
            services: {
              where: {
                customServiceId: validated.customServiceId,
              },
            },
          },
        },
      },
    });

    // If approved, create QuotationService entry (serviceId omitted for custom services)
    if (validated.status === "APPROVED") {
      await tx.quotationService.create({
        data: {
          quotationId: customService.quotationId,
          customServiceId: validated.customServiceId,
          // serviceId omitted: custom services are linked via customServiceId only; DB stores NULL
        },
      });
    }

    // Check if there are any pending custom services
    const pendingCount = await tx.customService.count({
      where: {
        quotationId: customService.quotationId,
        status: "PENDING",
      },
    });

    // If no pending custom services and quotation is in_review, change to rejected
    if (pendingCount === 0) {
      const quotation = await tx.quotation.findUnique({
        where: { id: customService.quotationId },
        select: { workflowStatus: true },
      });

      if (quotation?.workflowStatus === "in_review") {
        await tx.quotation.update({
          where: { id: customService.quotationId },
          data: { workflowStatus: "rejected" },
        });
      }
    }

    return customService;
  }, { timeout: 15000 }); // Increased timeout for production network latency
}

// Approve custom service
export async function approveCustomService(
  customServiceId: string,
  userId: string,
  comment?: string
) {
  return await updateCustomServiceStatus(customServiceId, "APPROVED", comment)
}

// Reject custom service
export async function rejectCustomService(
  customServiceId: string,
  userId: string,
  comment: string
) {
  return await updateCustomServiceStatus(customServiceId, "REJECTED", comment)
}

/**
 * Send quotation PDF via email
 * Note: unstable_noStore() is required because email sending needs fresh data.
 */
export async function sendQuotationEmail(
  quotationId: number,
  recipientEmail: string
): Promise<{ success: boolean; error?: string }> {
  // Validate inputs
  const validated = sendQuotationEmailSchema.parse({ quotationId, recipientEmail })
  
  try {
    const user = await getCachedUser()
    if (!user) {
      throw new Error("User must be authenticated to send quotation")
    }

    // Get quotation with all related data (including custom services with full details)
    const quotation = await getQuotationFullById(validated.quotationId.toString())

    if (!quotation) {
      return { success: false, error: "Quotation not found" }
    }

    if (quotation.workflowStatus !== "final") {
      return { success: false, error: "Only finalized quotations can be sent" }
    }

    // Generate PDF as base64 (use FromFull to avoid duplicate getQuotationFullById)
    const { generateQuotationPDFBase64FromFull } = await import("./utils/pdfExport")
    const pdfBase64 = await generateQuotationPDFBase64FromFull(quotation)

    // Get Supabase URL and anon key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: "Supabase configuration missing" }
    }

    // Call Supabase function to send email
    const functionUrl = `${supabaseUrl}/functions/v1/send-quote`
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        quotationId: quotation.id,
        quotationNumber: quotation.name,
        customerName: quotation.Client?.name || "Valued Customer",
        customerEmail: validated.recipientEmail,
        clientCompany: quotation.Client?.company || "",
        totalAmount: quotation.totalPrice,
        pdfBase64: pdfBase64,
        quotationDate: formatLocalDateTime(new Date(quotation.created_at)),
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      // Gate logging by environment
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error("Error sending email:", errorData)
      }
      return { success: false, error: "Failed to send email. Please try again." }
    }

    // Record the email in database (sentById references User.supabase_id)
    await prisma.quotationEmail.create({
      data: {
        quotationId: quotation.id,
        recipientEmail: validated.recipientEmail,
        sentById: user.id,
      },
    })

    return { success: true }
  } catch (error: unknown) {
    // Gate logging by environment
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Error sending quotation email:", error)
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to send email"
    return { success: false, error: errorMessage }
  }
}

/**
 * Get email history for a quotation
 * Note: unstable_noStore() is required because email history may change frequently.
 */
export async function getQuotationEmailHistory(
  quotationId: number
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
  // Validate input
  const validatedId = z.number().int().positive().parse(quotationId)
  
  unstable_noStore()
  try {
    // Use type-safe Prisma client
    const emails = await prisma.quotationEmail.findMany({
      where: { quotationId: validatedId },
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
    // Gate logging by environment
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Error fetching email history:", error)
    }
    return []
  }
}

/**
 * DEBUG: Check for duplicate quotation names
 * Use this to investigate duplicate quotation numbers
 * Only available in development mode
 */
export async function debugCheckDuplicateQuotations() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error("Debug functions only available in development")
  }
  
  const duplicates = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
    SELECT name, COUNT(*) as count
    FROM quotations
    GROUP BY name
    HAVING COUNT(*) > 1
  `
  
  return duplicates.map(d => ({ name: d.name, count: Number(d.count) }))
}

/**
 * DEBUG: Get current quotation counter state
 * Use this to check the counter table state
 * Only available in development mode
 */
export async function debugGetQuotationCounterState() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error("Debug functions only available in development")
  }
  
  const counters = await prisma.quotationCounter.findMany({
    orderBy: { month_prefix: 'desc' },
    take: 12 // Last 12 months
  })
  
  return counters
}

/**
 * DEBUG: Get recent quotation numbers
 * Use this to see what numbers were recently generated
 * Only available in development mode
 */
export async function debugGetRecentQuotations(limit: number = 20) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error("Debug functions only available in development")
  }
  
  const quotations = await prisma.quotation.findMany({
    select: {
      id: true,
      name: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: limit
  })
  
  return quotations
}

"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore, unstable_cache, revalidateTag } from "next/cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"

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
  // Everyone can see all quotations regardless of who created them
  return await prisma.quotation.findMany({
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
  filters: {
    statusFilter?: string
  } = {}
) {
  const skip = (page - 1) * pageSize
  const { statusFilter } = filters

  // Build where clause
  const where: any = {}
  if (statusFilter && statusFilter !== 'all') {
    where.workflowStatus = statusFilter
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
      take: pageSize,
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
      ...quotation.Client,
      phone: quotation.Client.phone ?? undefined,
      company: quotation.Client.company ?? undefined,
      address: quotation.Client.address ?? undefined,
      notes: quotation.Client.notes ?? undefined,
      industry: quotation.Client.industry ?? undefined,
      yearlyRevenue: quotation.Client.yearlyRevenue ?? undefined,
    } : undefined,
    createdBy: quotation.createdBy,
    services: quotation.services.map(service => ({
      ...service,
      customServiceId: service.customServiceId ?? undefined,
      // Add minimal service object for type compatibility (not used in list view)
      service: {} as any,
    })),
    project: quotation.project ? {
      id: quotation.project.id,
      name: "",
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
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
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

// Client-side version that bypasses cache
export async function getQuotationsPaginated(
  page: number = 1,
  pageSize: number = 10,
  filters: {
    statusFilter?: string
  } = {},
  useCache: boolean = false
) {
  unstable_noStore()
  if (useCache) {
    return await getCachedQuotationsPaginated(page, pageSize, filters)
  }
  return await _getQuotationsPaginatedInternal(page, pageSize, filters)
}

// Fresh version that always bypasses cache (for client-side updates)
export async function getQuotationsPaginatedFresh(
  page: number = 1,
  pageSize: number = 10,
  filters: {
    statusFilter?: string
  } = {}
) {
  unstable_noStore()
  return await _getQuotationsPaginatedInternal(page, pageSize, filters)
}

// Invalidate quotations cache
export async function invalidateQuotationsCache() {
  revalidateTag("quotations", "max")
}

/**
 * Get all invoices for a quotation
 */
export async function getInvoicesForQuotation(quotationId: number) {
	unstable_noStore()
	const invoices = await prisma.invoice.findMany({
		where: { quotationId },
		select: {
			id: true,
			invoiceNumber: true,
			type: true,
			amount: true,
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

export async function getQuotationById(id: string) {
  unstable_noStore()
  const quotation = await prisma.quotation.findUnique({
    where: { id: Number.parseInt(id) },
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
    ...quotation,
    discountValue: quotation.discountValue ?? undefined,
    discountType: quotation.discountType ?? undefined,
    Client: quotation.Client ? {
      ...quotation.Client,
      phone: quotation.Client.phone ?? undefined,
      company: quotation.Client.company ?? undefined,
      address: quotation.Client.address ?? undefined,
      notes: quotation.Client.notes ?? undefined,
      industry: quotation.Client.industry ?? undefined,
      yearlyRevenue: quotation.Client.yearlyRevenue ?? undefined,
    } : undefined,
    services: quotation.services.map(service => ({
      ...service,
      customServiceId: service.customServiceId ?? undefined,
    })),
    project: quotation.project ? {
      ...quotation.project,
      description: quotation.project.description ?? undefined,
      startDate: quotation.project.startDate ?? undefined,
      endDate: quotation.project.endDate ?? undefined,
    } : null,
  }
}

/**
 * Get full quotation data with all related entities
 * Used for PDF generation, email sending, and editing
 * This fetches complete data including all service details
 */
export async function getQuotationFullById(id: string) {
  unstable_noStore()
  const quotation = await prisma.quotation.findUnique({
    where: { id: Number.parseInt(id) },
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
    ...quotation,
    discountValue: quotation.discountValue ?? undefined,
    discountType: quotation.discountType ?? undefined,
    Client: quotation.Client ? {
      ...quotation.Client,
      phone: quotation.Client.phone ?? undefined,
      company: quotation.Client.company ?? undefined,
      address: quotation.Client.address ?? undefined,
      notes: quotation.Client.notes ?? undefined,
      industry: quotation.Client.industry ?? undefined,
      yearlyRevenue: quotation.Client.yearlyRevenue ?? undefined,
    } : undefined,
    services: quotation.services.map(service => ({
      ...service,
      customServiceId: service.customServiceId ?? undefined,
    })),
    project: quotation.project ? {
      ...quotation.project,
      description: quotation.project.description ?? undefined,
      startDate: quotation.project.startDate ?? undefined,
      endDate: quotation.project.endDate ?? undefined,
    } : null,
    customServices: quotation.customServices.map(cs => ({
      ...cs,
      description: cs.description ?? undefined,
      createdById: cs.createdById ?? undefined,
      created_at: cs.createdAt,
      updated_at: cs.updatedAt,
    })),
  }
}

/**
 * Generate quotation number in format: QUO-YYYYMM###
 * Where ### starts at 001 each day and increments
 * This function must be called within a transaction to prevent race conditions
 */
async function generateQuotationNumber(tx: any): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const datePrefix = `${year}${month}`
  
  // Get start of today
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Find the last quotation created today with the same date prefix
  // Use transaction client to ensure atomicity and prevent race conditions
  // Order by id desc to get the most recent one (more reliable than created_at)
  const lastQuotation = await tx.quotation.findFirst({
    where: {
      name: {
        startsWith: `QUO-${datePrefix}`
      },
      created_at: {
        gte: startOfDay
      }
    },
    orderBy: {
      id: 'desc' // Use id for more reliable ordering
    },
    select: {
      name: true
    }
  })
  
  let nextNumber = 1
  
  if (lastQuotation) {
    // Extract the number from the last quotation (last 3 digits)
    const lastNumber = parseInt(lastQuotation.name.slice(-3))
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }
  
  // Format: QUO-YYYYMM###
  return `QUO-${datePrefix}${String(nextNumber).padStart(3, '0')}`
}

export async function createQuotation(data: {
  description: string
  totalPrice: number
  serviceIds: string[]
  createdById: string
  workflowStatus?: "draft" | "in_review" | "final" | "accepted" | "rejected"
  paymentStatus?: "unpaid" | "partially_paid" | "deposit_paid" | "fully_paid"
  discountValue?: number
  discountType?: "percentage" | "fixed"
  duration?: number
  startDate?: string
  clientId?: string
  projectId?: number
  newClient?: {
    name: string
    email: string
    phone?: string
    company?: string
    address?: string
    notes?: string
    industry?: string
    yearlyRevenue?: string
    membershipType?: string
  }
}) {
  // Validate that final quotations have a project
  if (data.workflowStatus === "final" && !data.projectId) {
    throw new Error("Final quotations must be linked to a project. Please select or create a project before finalizing.");
  }

  // Calculate end date if start date and duration are provided
  let endDate: Date | undefined = undefined;
  if (data.startDate && data.duration) {
    const startDate = new Date(data.startDate);
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.duration);
  }

  // Get current user for createdById
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to create a quotation")
  }

  return await prisma.$transaction(async (tx) => {
    let finalClientId = data.clientId;

    // If creating a new client, create it first
    if (data.newClient && !data.clientId) {
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
          name: data.newClient.name,
          email: data.newClient.email,
          phone: data.newClient.phone,
          company: data.newClient.company,
          address: data.newClient.address,
          notes: data.newClient.notes,
          industry: data.newClient.industry,
          yearlyRevenue: data.newClient.yearlyRevenue ? parseFloat(data.newClient.yearlyRevenue) : null,
          membershipType: data.newClient.membershipType as "MEMBER" | "NON_MEMBER" || "NON_MEMBER",
          createdById: dbUser.id,
        } as any
      });
      finalClientId = newClient.id;
    }

    // Ensure we have a client ID
    if (!finalClientId) {
      throw new Error("Client ID is required");
    }

    // Generate quotation number within transaction to prevent race conditions
    // This ensures the number is generated atomically right before creation
    // The number is only generated when user clicks "Create" or "Save as Draft"
    // and is not shown to the user until the quotation is successfully created
    const quotationNumber = await generateQuotationNumber(tx)

    const quotation = await tx.quotation.create({
      data: {
        name: quotationNumber,
        description: data.description,
        totalPrice: data.totalPrice,
        createdById: data.createdById,
        workflowStatus: data.workflowStatus || "draft", // Default to draft, user sets to final when ready
        paymentStatus: data.paymentStatus || "unpaid", // Default to unpaid
        clientId: finalClientId,
        projectId: data.projectId || null,
        discountValue: data.discountValue || null,
        discountType: data.discountType || null,
        duration: data.duration || 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: endDate || new Date(),

        services: {
          create: data.serviceIds.map((serviceId) => ({
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
  });
}

export async function editQuotationById(
  id: string,
  data: {
    description: string
    totalPrice: number
    workflowStatus?: "draft" | "in_review" | "final" | "accepted" | "rejected"
    paymentStatus?: "unpaid" | "partially_paid" | "deposit_paid" | "fully_paid"
    discountValue?: number
    discountType?: "percentage" | "fixed"
    serviceIds?: string[]
    duration?: number
    startDate?: string
    clientId?: string
    projectId?: number
    createdById?: string // Allow admin to change createdBy
    newClient?: {
      name: string
      email: string
      phone?: string
      company?: string
      address?: string
      notes?: string
      industry?: string
      yearlyRevenue?: string
      membershipType?: string
    }
  },
) {
  // Validate that final quotations have a project
  if (data.workflowStatus === "final" && !data.projectId) {
    throw new Error("Final quotations must be linked to a project. Please select or create a project before finalizing.");
  }

  // Get current user for createdById
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to edit a quotation")
  }

  // Check if admin is trying to change createdBy
  let finalCreatedById: string | undefined = undefined
  if (data.createdById) {
    const isAdmin = await getCachedIsUserAdmin(user.id)
    if (!isAdmin) {
      throw new Error("Only admins can change the creator of a quotation")
    }
    
    // Verify the user exists
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: data.createdById },
      select: { supabase_id: true }
    })
    
    if (!dbUser) {
      throw new Error("Selected user not found in database")
    }
    
    finalCreatedById = data.createdById // Use supabase_id directly
  }

  return await prisma.$transaction(async (tx) => {
    // First, get the current quotation to check if it has a project
    const currentQuotation = await tx.quotation.findUnique({
      where: { id: Number.parseInt(id) },
      include: { project: true }
    });

    // Delete existing quotation services
    await tx.quotationService.deleteMany({
      where: { quotationId: Number.parseInt(id) },
    });

    // Calculate end date if start date and duration are provided
    let endDate: Date | undefined = undefined;
    if (data.startDate && data.duration) {
      const startDate = new Date(data.startDate);
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + data.duration);
    }

    let finalClientId = data.clientId;

    // If creating a new client, create it first
    if (data.newClient && !data.clientId) {
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
          name: data.newClient.name,
          email: data.newClient.email,
          phone: data.newClient.phone,
          company: data.newClient.company,
          address: data.newClient.address,
          notes: data.newClient.notes,
          industry: data.newClient.industry,
          yearlyRevenue: data.newClient.yearlyRevenue ? parseFloat(data.newClient.yearlyRevenue) : null,
          membershipType: data.newClient.membershipType as "MEMBER" | "NON_MEMBER" || "NON_MEMBER",
          createdById: dbUser.id,
        } as any
      });
      finalClientId = newClient.id;
    }

    // Ensure we have a client ID
    if (!finalClientId) {
      throw new Error("Client ID is required");
    }

    // Update the quotation (don't update name as it's auto-generated)
    const quotation = await tx.quotation.update({
      where: { id: Number.parseInt(id) },
      data: {
        description: data.description,
        totalPrice: data.totalPrice,
        workflowStatus: data.workflowStatus,
        paymentStatus: data.paymentStatus,
        clientId: finalClientId,
        projectId: data.projectId !== undefined ? data.projectId : currentQuotation?.projectId || null,
        discountValue: data.discountValue !== undefined ? data.discountValue : null,
        discountType: data.discountType !== undefined ? data.discountType : null,
        duration: data.duration !== undefined ? data.duration : 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: endDate || new Date(),
        createdById: finalCreatedById !== undefined ? finalCreatedById : undefined, // Only update if provided
        services: data.serviceIds
          ? {
              create: data.serviceIds.map((serviceId) => ({
                serviceId: Number.parseInt(serviceId),
              })),
            }
          : undefined,
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
    });

    return quotation;
  });
}

export async function deleteQuotationById(id: string) {
  unstable_noStore()
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to delete a quotation")
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: Number.parseInt(id) },
    include: { createdBy: true },
  })

  if (!quotation) {
    throw new Error("Quotation not found")
  }

  // Only allow deletion if user is the creator or admin
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (quotation.createdById !== user.id && !isAdmin) {
    throw new Error("You don't have permission to delete this quotation")
  }

  await prisma.quotation.delete({
    where: { id: Number.parseInt(id) },
  })

  revalidateTag("quotations", "max")
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
      company: client.company,
    }))
  } catch (error) {
    console.error("Error fetching clients for quotation:", error)
    return []
  }
}

/**
 * Get all projects optimized for quotation selection
 * Returns only essential fields needed for project selection
 */
export async function getProjectsForQuotationOptimized(userId: string) {
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
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      Client: project.Client,
    }))
  } catch (error) {
    console.error("Error fetching projects for quotation:", error)
    return []
  }
}

export async function updateClientMembershipStatus(
  clientId: string,
  membershipType: "MEMBER" | "NON_MEMBER"
) {
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
    where: { id: clientId },
    data: { membershipType },
  })

  revalidateTag("quotations", "max")
}

export async function updateQuotationProjectId(quotationId: number, projectId: number) {
  unstable_noStore()
  await prisma.quotation.update({
    where: { id: quotationId },
    data: { projectId },
  })
  revalidateTag("quotations", "max")
}

export async function linkProjectAndUpdateQuotationStatus(quotationId: number, projectId: number) {
  unstable_noStore()
  const quotation = await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      projectId,
      workflowStatus: "final",
    },
  })
  revalidateTag("quotations", "max")
  return quotation
}

export async function getCustomServicesByQuotationId(quotationId: number) {
  unstable_noStore()
  return await prisma.customService.findMany({
    where: { quotationId },
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
    orderBy: { createdAt: "desc" },
  })
}

export async function createCustomService(
  quotationId: number,
  data: {
    name: string
    description: string
    price: number
  }
) {
  unstable_noStore()
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to create a custom service")
  }

  return await prisma.customService.create({
    data: {
      quotationId,
      name: data.name,
      description: data.description,
      price: data.price,
      createdById: user.id,
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
  unstable_noStore()
  const user = await getCachedUser()
  if (!user) {
    throw new Error("User must be authenticated to update custom service status")
  }

  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) {
    throw new Error("Only admins can update custom service status")
  }

  return await prisma.$transaction(async (tx) => {
    const customService = await tx.customService.update({
      where: { id: customServiceId },
      data: {
        status,
        reviewedById: user.id,
        approvalComment: status === "APPROVED" ? comment : null,
        rejectionComment: status === "REJECTED" ? comment : null,
      },
      include: {
        quotation: {
          include: {
            services: {
              where: {
                customServiceId: customServiceId,
              },
            },
          },
        },
      },
    });

    // If approved, create QuotationService entry
    if (status === "APPROVED") {
      await tx.quotationService.create({
        data: {
          quotationId: customService.quotationId,
          customServiceId: customServiceId,
          serviceId: 1, // Dummy service ID, not used when customServiceId is set
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
  });
}

/**
 * Send quotation PDF via email
 */
export async function sendQuotationEmail(
  quotationId: number,
  recipientEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) {
      throw new Error("User must be authenticated to send quotation")
    }

    // Get quotation with all related data (including custom services with full details)
    const quotation = await getQuotationFullById(quotationId.toString())

    if (!quotation) {
      return { success: false, error: "Quotation not found" }
    }

    if (quotation.workflowStatus !== "final") {
      return { success: false, error: "Only finalized quotations can be sent" }
    }

    // Generate PDF as base64
    const { generateQuotationPDFBase64 } = await import("./utils/pdfExport")
    const pdfBase64 = await generateQuotationPDFBase64(quotation as any)

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
        customerEmail: recipientEmail,
        clientCompany: quotation.Client?.company || "",
        totalAmount: quotation.totalPrice,
        pdfBase64: pdfBase64,
        quotationDate: quotation.created_at.toISOString(),
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

    // Check if quotationEmail model exists (Prisma client needs to be regenerated)
    if (!(prisma as any).quotationEmail) {
      console.error("QuotationEmail model not found. Please run: npx prisma generate")
      return { 
        success: false, 
        error: "Database model not available. Please regenerate Prisma client by running: npx prisma generate" 
      }
    }

    await (prisma as any).quotationEmail.create({
      data: {
        quotationId: quotation.id,
        recipientEmail: recipientEmail,
        sentById: user.id,
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error("Error sending quotation email:", error)
    return { success: false, error: error.message || "Failed to send email" }
  }
}

/**
 * Get email history for a quotation
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
  try {
    // Check if quotationEmail model exists (Prisma client needs to be regenerated)
    if (!(prisma as any).quotationEmail) {
      console.error("QuotationEmail model not found. Please run: npx prisma generate")
      return []
    }

    const emails = await (prisma as any).quotationEmail.findMany({
      where: { quotationId },
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

    return emails.map((email: any) => ({
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

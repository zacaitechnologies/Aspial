"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore } from "next/cache"

// Authentication functions
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return redirect("/login")
    }
    
    return user
  } catch (error: any) {
    // Handle redirect errors
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      // This is a redirect, not an error - don't log it
      throw error
    }
    console.error("Error in getCurrentUser:", error)
    throw new Error("Authentication failed")
  }
}

// Client CRUD operations
export async function getAllClients() {
  try {
    await getCurrentUser() // Ensure user is authenticated
    
    const clients = await prisma.client.findMany({
      include: {
        quotations: {
          select: {
            id: true,
            totalPrice: true,
          }
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
      console.log("No clients found in database - returning empty array");
      return [];
    }
    
    // Transform data to match the expected interface
    return clients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone || undefined,
      company: client.company || undefined,
      address: client.address || undefined,
      notes: client.notes || undefined,
      industry: client.industry || undefined,
      yearlyRevenue: client.yearlyRevenue || undefined,
      membershipType: client.membershipType,
      quotationsCount: client.quotations.length,
      totalValue: client.quotations.reduce((sum: number, q: { totalPrice: number }) => sum + q.totalPrice, 0),
      created_at: client.created_at.toISOString(),
      createdById: client.createdById,
      createdBy: client.createdBy ? {
        id: client.createdBy.id,
        firstName: client.createdBy.firstName,
        lastName: client.createdBy.lastName,
        email: client.createdBy.email,
      } : undefined,
    }))
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in getAllClients:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`Failed to fetch clients: ${error.message}`)
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
  } = {}
) {
  const skip = (page - 1) * pageSize
  const {
    searchTerm,
    industry,
    membershipType,
    sortBy = 'created_at',
    sortDirection = 'desc',
  } = filters

  // Build where clause
  const where: any = {}

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

  // Handle sorting: totalValue is a computed field, so we need to fetch all matching records,
  // compute it, sort in memory, then paginate
  const isTotalValueSort = sortBy === 'totalValue'
  
  let total: number
  let clients: any[]
  
  if (isTotalValueSort) {
    // For totalValue sorting, we need to fetch all matching records, compute totalValue,
    // sort in memory, then paginate
    total = await prisma.client.count({ where })
    
    const allClients = await prisma.client.findMany({
      where,
      include: {
        quotations: {
          select: {
            id: true,
            totalPrice: true,
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
    })
    
    // Transform and sort in memory
    const transformed = allClients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone || undefined,
      company: client.company || undefined,
      address: client.address || undefined,
      notes: client.notes || undefined,
      industry: client.industry || undefined,
      yearlyRevenue: client.yearlyRevenue || undefined,
      membershipType: client.membershipType,
      quotationsCount: client.quotations.length,
      totalValue: client.quotations.reduce((sum: number, q: { totalPrice: number }) => sum + q.totalPrice, 0),
      created_at: client.created_at.toISOString(),
      createdById: client.createdById,
      createdBy: client.createdBy ? {
        id: client.createdBy.id,
        firstName: client.createdBy.firstName,
        lastName: client.createdBy.lastName,
        email: client.createdBy.email,
      } : undefined,
    }))
    
    // Sort by totalValue
    transformed.sort((a, b) => {
      const comparison = a.totalValue - b.totalValue
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    // Apply pagination
    clients = transformed.slice(skip, skip + pageSize)
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
              totalPrice: true,
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

  // Transform data (if not already transformed)
  const transformedClients = isTotalValueSort ? clients : clients.map(client => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone || undefined,
    company: client.company || undefined,
    address: client.address || undefined,
    notes: client.notes || undefined,
    industry: client.industry || undefined,
    yearlyRevenue: client.yearlyRevenue || undefined,
    membershipType: client.membershipType,
    quotationsCount: client.quotations.length,
    totalValue: client.quotations.reduce((sum: number, q: { totalPrice: number }) => sum + q.totalPrice, 0),
    created_at: client.created_at.toISOString(),
    createdById: client.createdById,
    createdBy: client.createdBy ? {
      id: client.createdBy.id,
      firstName: client.createdBy.firstName,
      lastName: client.createdBy.lastName,
      email: client.createdBy.email,
    } : undefined,
  }))

  return {
    data: transformedClients,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

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
    // Disable server-side caching for real-time data
    unstable_noStore()

    // Use cached auth - deduplicates within same request
    await getCachedUser()

    // Return fresh data without server-side caching
    return await _getClientsPaginatedInternal(page, pageSize, filters)
  } catch (error: any) {
    if (isRedirectError(error)) throw error
    console.error('Error in getClientsPaginated:', error)
    throw new Error(`Failed to fetch clients: ${error.message}`)
  }
}

export async function getClientById(id: string) {
  try {
    await getCurrentUser() // Ensure user is authenticated
    
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
          }
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
    
    return client
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in getClientById:", error)
    throw new Error("Failed to fetch client")
  }
}

export async function createCustomerClient(data: {
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  notes?: string
  industry?: string
  yearlyRevenue?: number
  membershipType: "MEMBER" | "NON_MEMBER"
}) {
  try {
    const supabaseUser = await getCurrentUser() // Ensure user is authenticated
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
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        address: data.address,
        notes: data.notes,
        industry: data.industry,
        yearlyRevenue: data.yearlyRevenue,
        membershipType: data.membershipType,
        createdById: dbUser.id,
      } as any
    })
    
    revalidatePath("/clients")
    return client
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in createClient:", error)
    throw error
  }
}

export async function updateClient(id: string, data: {
  name?: string
  email?: string
  phone?: string
  company?: string
  address?: string
  notes?: string
  industry?: string
  yearlyRevenue?: number
  membershipType?: "MEMBER" | "NON_MEMBER"
}) {
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
      throw new Error("You can only edit clients that you created")
    }
    
    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        address: data.address,
        notes: data.notes,
        industry: data.industry,
        yearlyRevenue: data.yearlyRevenue,
        membershipType: data.membershipType,
        updated_at: new Date(),
      }
    })
    
    revalidatePath("/clients")
    revalidatePath(`/clients/${id}`)
    return updatedClient
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in updateClient:", error)
    throw error
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
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in deleteClient:", error)
    throw error
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
  } catch (error) {
    console.error('Error getting current user ID:', error)
    return null
  }
}

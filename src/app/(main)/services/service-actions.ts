"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { CreateServiceData, UpdateServiceData, CreateServiceTagData, UpdateServiceTagData, Service, ServiceTag } from "./types"

// Helper function to transform Prisma service data to match our Service type
function transformService(service: any): Service {
  return {
    ...service,
    tags: service.ServiceToTag?.map((st: any) => st.service_tags) || []
  }
}

// Helper function to transform Prisma service tag data to match our ServiceTag type
function transformServiceTag(tag: any): ServiceTag {
  return {
    ...tag,
    services: tag.ServiceToTag?.map((st: any) => st.Services) || []
  }
}

// Service Tag Actions
export async function createServiceTag(data: CreateServiceTagData): Promise<ServiceTag> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  const tag = await prisma.serviceTag.create({
    data: {
      name: data.name,
      color: data.color || "#3B82F6",
    },
    include: {
      ServiceToTag: {
        include: {
          Services: true
        }
      }
    },
  })
  
  return transformServiceTag(tag)
}

export async function getAllServiceTags(): Promise<ServiceTag[]> {
  const tags = await prisma.serviceTag.findMany({
    include: {
      ServiceToTag: {
        include: {
          Services: true
        }
      }
    },
    orderBy: { name: 'asc' },
  })
  
  return tags.map(transformServiceTag)
}

export async function getServiceTagById(id: number): Promise<ServiceTag | null> {
  const tag = await prisma.serviceTag.findUnique({
    where: { id },
    include: {
      ServiceToTag: {
        include: {
          Services: true
        }
      }
    },
  })
  
  return tag ? transformServiceTag(tag) : null
}

export async function updateServiceTag(id: number, data: UpdateServiceTagData): Promise<ServiceTag> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  const tag = await prisma.serviceTag.update({
    where: { id },
    data,
    include: {
      ServiceToTag: {
        include: {
          Services: true
        }
      }
    },
  })
  
  return transformServiceTag(tag)
}

export async function deleteServiceTag(id: number): Promise<void> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  await prisma.serviceTag.delete({
    where: { id },
  })
}

// Service Actions
export async function createService(data: CreateServiceData): Promise<Service> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  const { tagIds, ...serviceData } = data
  
  const service = await prisma.services.create({
    data: {
      ...serviceData,
      ServiceToTag: tagIds && tagIds.length > 0 ? {
        create: tagIds.map(tagId => ({
          A: tagId  // A is the ServiceTag id in the join table
        }))
      } : undefined,
    },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
  })
  
  return transformService(service)
}

export async function getAllServices(): Promise<Service[]> {
  const services = await prisma.services.findMany({
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
    orderBy: { name: 'asc' },
  })
  
  return services.map(transformService)
}

export async function getServiceById(id: number): Promise<Service | null> {
  const service = await prisma.services.findUnique({
    where: { id },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
  })
  
  return service ? transformService(service) : null
}

export async function updateService(id: number, data: UpdateServiceData): Promise<Service> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  const { tagIds, ...serviceData } = data
  
  // Update the service with new tags
  // First delete all existing tag relations, then create new ones
  const service = await prisma.services.update({
    where: { id },
    data: {
      ...serviceData,
      ServiceToTag: {
        deleteMany: {}, // Delete all existing tag relations for this service
        create: tagIds && tagIds.length > 0 
          ? tagIds.map(tagId => ({
              A: tagId  // A is the ServiceTag id in the join table
            }))
          : [],
      },
    },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
  })
  
  return transformService(service)
}

export async function deleteService(id: number): Promise<void> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  await prisma.services.delete({
    where: { id },
  })
}

// Get services by tag
export async function getServicesByTag(tagId: number): Promise<Service[]> {
  const services = await prisma.services.findMany({
    where: {
      ServiceToTag: {
        some: {
          A: tagId,
        },
      },
    },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
    orderBy: { name: 'asc' },
  })
  
  return services.map(transformService)
}

// Search services by name or description
export async function searchServices(query: string): Promise<Service[]> {
  const services = await prisma.services.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
    orderBy: { name: 'asc' },
  })
  
  return services.map(transformService)
}

// Check if current user is admin
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const user = await getCachedUser()
    
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
    
    if (!userWithRoles) {
      return false
    }
    
    return userWithRoles.userRoles.some((userRole) => userRole.role.slug === "admin")
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}

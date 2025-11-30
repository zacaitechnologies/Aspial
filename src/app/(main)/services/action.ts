"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore } from "next/cache"

// Helper function to transform Prisma service data to include tags
function transformService(service: any) {
  return {
    ...service,
    tags: service.ServiceToTag?.map((st: any) => st.service_tags) || []
  }
}

export async function getAllServices() {
  const services = await prisma.services.findMany({
    orderBy: { created_at: "desc" },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    }
  })
  
  return services.map(transformService)
}

// Internal function - not cached, used by cached version
async function _getServicesPaginatedInternal(
  page: number = 1,
  pageSize: number = 12,
  filters: {
    searchQuery?: string
  } = {}
) {
  const skip = (page - 1) * pageSize
  const { searchQuery } = filters

  // Build where clause
  const where: any = {}
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
    ]
  }

  // Execute count and findMany in parallel for better performance
  const [total, services] = await Promise.all([
    prisma.services.count({ where }),
    prisma.services.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        ServiceToTag: {
          include: {
            service_tags: true
          }
        }
      },
      skip,
      take: pageSize,
    }),
  ])

  return {
    data: services.map(transformService),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getServicesPaginated(
  page: number = 1,
  pageSize: number = 12,
  filters: {
    searchQuery?: string
  } = {}
) {
  // Disable server-side caching for real-time data
  unstable_noStore()

  // Use cached auth - deduplicates within same request
  await getCachedUser()

  // Return fresh data without server-side caching
  return await _getServicesPaginatedInternal(page, pageSize, filters)
}

export async function searchServices(query: string) {
  const services = await prisma.services.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { created_at: "desc" },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    }
  })
  
  return services.map(transformService)
}

export async function addService(data: {
  name: string
  description: string
  basePrice: number
}) {
  return await prisma.services.create({
    data,
  })
}

export async function editServiceById(
  id: string,
  data: {
    name: string
    description: string
    basePrice: number
  },
) {
  return await prisma.services.update({
    where: { id: Number.parseInt(id) },
    data,
  })
}

export async function deleteServiceById(id: string) {
  return await prisma.services.delete({
    where: { id: Number.parseInt(id) },
  })
} 
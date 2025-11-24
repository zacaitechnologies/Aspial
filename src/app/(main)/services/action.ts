"use server"

import { prisma } from "@/lib/prisma"

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

export async function getServicesPaginated(
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

  // Get total count
  const total = await prisma.services.count({ where })

  // Get paginated data
  const services = await prisma.services.findMany({
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
  })

  return {
    data: services.map(transformService),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
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
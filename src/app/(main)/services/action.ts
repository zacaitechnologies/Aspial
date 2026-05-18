"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { unstable_cache, revalidateTag } from "next/cache"

type HiddenFilter = "visible" | "hidden" | "all"

// Helper function to transform Prisma service data to include tags
function transformService(service: any) {
  return {
    ...service,
    tags: service.ServiceToTag?.map((st: any) => st.service_tags) || []
  }
}

export async function getAllServices() {
  const services = await prisma.services.findMany({
    where: { hidden: false },
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
    hiddenFilter?: HiddenFilter
  } = {}
) {
  const skip = (page - 1) * pageSize
  const { searchQuery, hiddenFilter = "visible" } = filters

  // Build where clause
  const where: any = {}
  if (hiddenFilter === "visible") where.hidden = false
  else if (hiddenFilter === "hidden") where.hidden = true
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
    hiddenFilter?: HiddenFilter
  } = {}
) {
  const user = await getCachedUser()
  // Non-admins are pinned to "visible" regardless of what the client requested.
  let effectiveHiddenFilter: HiddenFilter = "visible"
  if (user?.id) {
    const isAdmin = await getCachedIsUserAdmin(user.id)
    if (isAdmin && filters.hiddenFilter) {
      effectiveHiddenFilter = filters.hiddenFilter
    }
  }
  const effectiveFilters = { ...filters, hiddenFilter: effectiveHiddenFilter }
  return await unstable_cache(
    () => _getServicesPaginatedInternal(page, pageSize, effectiveFilters),
    [
      "services-paginated",
      String(page),
      String(pageSize),
      effectiveFilters.searchQuery ?? "",
      effectiveHiddenFilter,
    ],
    { revalidate: 30, tags: ["services"] }
  )()
}

export async function searchServices(query: string) {
  const services = await prisma.services.findMany({
    where: {
      hidden: false,
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
  const result = await prisma.services.create({
    data,
  })
  revalidateTag("services", { expire: 0 })
  return result
}

export async function editServiceById(
  id: string,
  data: {
    name: string
    description: string
    basePrice: number
  },
) {
  const result = await prisma.services.update({
    where: { id: Number.parseInt(id) },
    data,
  })
  revalidateTag("services", { expire: 0 })
  return result
}

export async function deleteServiceById(id: string) {
  const result = await prisma.services.delete({
    where: { id: Number.parseInt(id) },
  })
  revalidateTag("services", { expire: 0 })
  return result
} 
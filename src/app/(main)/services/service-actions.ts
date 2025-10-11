"use server"

import { prisma } from "@/lib/prisma"
import { CreateServiceData, UpdateServiceData, CreateServiceTagData, UpdateServiceTagData, Service, ServiceTag } from "./types"

// Service Tag Actions
export async function createServiceTag(data: CreateServiceTagData): Promise<ServiceTag> {
  return await prisma.serviceTag.create({
    data: {
      name: data.name,
      color: data.color || "#3B82F6",
    },
  })
}

export async function getAllServiceTags(): Promise<ServiceTag[]> {
  return await prisma.serviceTag.findMany({
    orderBy: { name: 'asc' },
    include: {
      services: true
    }
  }) as any
}

export async function getServiceTagById(id: number): Promise<ServiceTag | null> {
  return await prisma.serviceTag.findUnique({
    where: { id },
    include: {
      services: true
    }
  }) as any
}

export async function updateServiceTag(id: number, data: UpdateServiceTagData): Promise<ServiceTag> {
  return await prisma.serviceTag.update({
    where: { id },
    data,
  })
}

export async function deleteServiceTag(id: number): Promise<void> {
  await prisma.serviceTag.delete({
    where: { id },
  })
}

// Service Actions
export async function createService(data: CreateServiceData): Promise<Service> {
  const { tagIds, ...serviceData } = data
  
  return await prisma.services.create({
    data: {
      ...serviceData,
      tags: tagIds && tagIds.length > 0 ? {
        connect: tagIds.map(tagId => ({ id: tagId }))
      } : undefined,
    },
    include: {
      tags: true
    }
  }) as any
}

export async function getAllServices(): Promise<Service[]> {
  return await prisma.services.findMany({
    orderBy: { name: 'asc' },
    include: {
      tags: true
    }
  }) as any
}

export async function getServiceById(id: number): Promise<Service | null> {
  return await prisma.services.findUnique({
    where: { id },
    include: {
      tags: true
    }
  }) as any
}

export async function updateService(id: number, data: UpdateServiceData): Promise<Service> {
  const { tagIds, ...serviceData } = data
  
  // Get current service to find existing tags
  const currentService = await prisma.services.findUnique({
    where: { id },
    include: { tags: true }
  })
  
  if (!currentService) {
    throw new Error('Service not found')
  }
  
  // Update service and handle tag relations
  return await prisma.services.update({
    where: { id },
    data: {
      ...serviceData,
      tags: {
        disconnect: currentService.tags.map(tag => ({ id: tag.id })),
        connect: tagIds && tagIds.length > 0 ? tagIds.map(tagId => ({ id: tagId })) : []
      }
    },
    include: {
      tags: true
    }
  }) as any
}

export async function deleteService(id: number): Promise<void> {
  await prisma.services.delete({
    where: { id },
  })
}

// Get services by tag
export async function getServicesByTag(tagId: number): Promise<Service[]> {
  return await prisma.services.findMany({
    where: {
      tags: {
        some: {
          id: tagId,
        },
      },
    },
    include: {
      tags: true
    },
    orderBy: { name: 'asc' },
  }) as any
}

// Search services by name or description
export async function searchServices(query: string): Promise<Service[]> {
  return await prisma.services.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
  })
}

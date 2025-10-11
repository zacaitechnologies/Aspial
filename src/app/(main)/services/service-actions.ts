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
  })
}

export async function getServiceTagById(id: number): Promise<ServiceTag | null> {
  return await prisma.serviceTag.findUnique({
    where: { id },
  })
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
      ServiceTags: tagIds && tagIds.length > 0 ? {
        create: tagIds.map(tagId => ({
          service_tags: {
            connect: { id: tagId }
          }
        }))
      } : undefined,
    },
  })
}

export async function getAllServices(): Promise<Service[]> {
  return await prisma.services.findMany({
    orderBy: { name: 'asc' },
  })
}

export async function getServiceById(id: number): Promise<Service | null> {
  return await prisma.services.findUnique({
    where: { id },
  })
}

export async function updateService(id: number, data: UpdateServiceData): Promise<Service> {
  const { tagIds, ...serviceData } = data
  
  // First, delete all existing tag relations
  await prisma.serviceTags.deleteMany({
    where: {
      B: id,
    },
  })
  
  // Then update the service and create new tag relations
  return await prisma.services.update({
    where: { id },
    data: {
      ...serviceData,
      ServiceTags: tagIds && tagIds.length > 0 ? {
        create: tagIds.map(tagId => ({
          service_tags: {
            connect: { id: tagId }
          }
        }))
      } : undefined,
    },
  })
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
      ServiceTags: {
        some: {
          A: tagId,
        },
      },
    },
    orderBy: { name: 'asc' },
  })
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

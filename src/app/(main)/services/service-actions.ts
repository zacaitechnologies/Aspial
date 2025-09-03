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
      tags: tagIds && tagIds.length > 0 ? {
        connect: tagIds.map(tagId => ({ id: tagId }))
      } : undefined,
    },
    include: {
      tags: true,
    },
  })
}

export async function getAllServices(): Promise<Service[]> {
  return await prisma.services.findMany({
    include: {
      tags: true,
    },
    orderBy: { name: 'asc' },
  })
}

export async function getServiceById(id: number): Promise<Service | null> {
  return await prisma.services.findUnique({
    where: { id },
    include: {
      tags: true,
    },
  })
}

export async function updateService(id: number, data: UpdateServiceData): Promise<Service> {
  const { tagIds, ...serviceData } = data
  
  // First, disconnect all existing tags
  await prisma.services.update({
    where: { id },
    data: {
      tags: {
        set: [], // Disconnect all tags
      },
    },
  })
  
  // Then update the service and connect new tags
  return await prisma.services.update({
    where: { id },
    data: {
      ...serviceData,
      tags: tagIds && tagIds.length > 0 ? {
        connect: tagIds.map(tagId => ({ id: tagId }))
      } : undefined,
    },
    include: {
      tags: true,
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
      tags: {
        some: {
          id: tagId,
        },
      },
    },
    include: {
      tags: true,
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
    include: {
      tags: true,
    },
    orderBy: { name: 'asc' },
  })
}

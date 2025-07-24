"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function getAllServices() {
  return await prisma.services.findMany({
    orderBy: { created_at: "desc" },
  })
}

export async function searchServices(query: string) {
  return await prisma.services.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { created_at: "desc" },
  })
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
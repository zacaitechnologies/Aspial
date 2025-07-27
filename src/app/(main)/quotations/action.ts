"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function getAllQuotations() {
  return await prisma.quotation.findMany({
    include: {
      services: {
        include: {
          service: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  })
}

export async function createQuotation(data: {
  name: string
  description: string
  totalPrice: number
  serviceIds: string[]
  createdById: string
}) {
  const quotation = await prisma.quotation.create({
    data: {
      name: data.name,
      description: data.description,
      totalPrice: data.totalPrice,
      createdById: data.createdById,
      services: {
        create: data.serviceIds.map((serviceId) => ({
          serviceId: Number.parseInt(serviceId),
        })),
      },
    },
  })
  return quotation
}

export async function editQuotationById(
  id: string,
  data: {
    name: string
    description: string
    totalPrice: number
    status: any
  },
) {
  return await prisma.quotation.update({
    where: { id: Number.parseInt(id) },
    data,
  })
}

export async function deleteQuotationById(id: string) {
  return await prisma.quotation.delete({
    where: { id: Number.parseInt(id) },
  })
} 
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
  discountValue?: number
  discountType?: "percentage" | "fixed"
}) {
  const quotation = await prisma.quotation.create({
    data: {
      name: data.name,
      description: data.description,
      totalPrice: data.totalPrice,
      createdById: data.createdById,
      discountValue: data.discountValue || null,
      discountType: data.discountType || null,
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
    discountValue?: number
    discountType?: "percentage" | "fixed"
    serviceIds?: string[]
  },
) {
  await prisma.quotationService.deleteMany({
    where: { quotationId: Number.parseInt(id) },
  });

  return await prisma.quotation.update({
    where: { id: Number.parseInt(id) },
    data: {
      name: data.name,
      description: data.description,
      totalPrice: data.totalPrice,
      status: data.status,
      discountValue: data.discountValue || null,
      discountType: data.discountType || null,
      services: data.serviceIds ? {
        create: data.serviceIds.map((serviceId) => ({
          serviceId: Number.parseInt(serviceId),
        })),
      } : undefined,
    },
  });
}

export async function deleteQuotationById(id: string) {
  return await prisma.quotation.delete({
    where: { id: Number.parseInt(id) },
  })
} 
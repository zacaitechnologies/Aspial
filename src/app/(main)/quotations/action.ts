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
      projects: true, // Include projects to check if one exists
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
  // First, get the current quotation to check if it has a project
  const currentQuotation = await prisma.quotation.findUnique({
    where: { id: Number.parseInt(id) },
    include: { projects: true }
  });

  // Delete existing quotation services
  await prisma.quotationService.deleteMany({
    where: { quotationId: Number.parseInt(id) },
  });

  // Update the quotation
  const updatedQuotation = await prisma.quotation.update({
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

  // Update the associated project if it exists
  if (currentQuotation && currentQuotation.projects.length > 0) {
    const project = currentQuotation.projects[0];
    await prisma.project.update({
      where: { id: project.id },
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  return updatedQuotation;
}

export async function deleteQuotationById(id: string) {
  // First, delete any associated projects
  await prisma.project.deleteMany({
    where: { quotationId: Number.parseInt(id) },
  });

  // Then delete the quotation
  return await prisma.quotation.delete({
    where: { id: Number.parseInt(id) },
  })
} 
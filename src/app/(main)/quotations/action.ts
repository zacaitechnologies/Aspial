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
      createdBy: true, // Include the createdBy relation
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
  duration?: number
  startDate?: string
}) {
  // Calculate end date if start date and duration are provided
  let endDate: Date | undefined = undefined;
  if (data.startDate && data.duration) {
    const startDate = new Date(data.startDate);
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.duration);
  }

  const quotation = await prisma.quotation.create({
    data: {
      name: data.name,
      description: data.description,
      totalPrice: data.totalPrice,
      createdById: data.createdById,
      discountValue: data.discountValue || null,
      discountType: data.discountType || null,
      duration: data.duration || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: endDate,

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
    duration?: number
    startDate?: string
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

  // Calculate end date if start date and duration are provided
  let endDate: Date | undefined = undefined;
  if (data.startDate && data.duration) {
    const startDate = new Date(data.startDate);
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.duration);
  }

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
      duration: data.duration || null,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: endDate,
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
    const startDate = project.startDate || new Date();
    let endDate: Date | undefined = undefined;
    
    if (data.duration) {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + data.duration);
    }
    
    await prisma.project.update({
      where: { id: project.id },
      data: {
        name: data.name,
        description: data.description,
        startDate: startDate,
        endDate: endDate,
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
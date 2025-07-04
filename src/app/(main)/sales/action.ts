"use server";

import { PrismaClient, Services } from "@prisma/client";

const prisma = new PrismaClient();

// Services
export async function getAllServices() {
  const data = await prisma.services.findMany({
    orderBy: {
      id: "asc",
    },
  });
  return data;
}

export async function addService(service: {
  name: string;
  description: string;
  basePrice: number;
}) {
  return await prisma.services.create({ data: service });
}

export async function editServiceById(
  serviceId: string,
  updatedFields: {
    name?: string;
    description?: string;
    basePrice?: number;
  }
) {
  try {
    const data = await prisma.services.update({
      where: {
        id: parseInt(serviceId),
      },
      data: updatedFields,
    });
    return data;
  } catch (error) {
    console.error("Error updating service:", error);
    throw new Error("Failed to update service");
  }
}

export async function deleteServiceById(serviceId: string) {
  try {
    const data = await prisma.services.delete({
      where: {
        id: parseInt(serviceId),
      },
    });
    return data;
  } catch (error) {
    console.error("Error deleting itinerary:", error);
    throw new Error("Failed to delete itinerary");
  }
}

// Quotation
export async function createQuotation(quotation: {
  name: string;
  description: string;
  totalPrice: number;
  serviceIds: string[];
}) {
  try {
    const { serviceIds, ...quotationData } = quotation;
    
    const data = await prisma.quotation.create({
      data: {
        ...quotationData,
        services: {
          connect: serviceIds.map(id => ({ id: parseInt(id) }))
        }
      },
    });
    return data;
  } catch (error) {
    console.error("Error creating quotation:", error);
    throw new Error("Failed to create quotation");
  }
}

export async function getAllQuotations() {
  const data = await prisma.quotation.findMany({
    orderBy: {
      id: "asc",
    },
  });
  return data;
}

export async function editQuotationById(
  quotationId: string,
  updatedFields: {
    name?: string;
    description?: string;
    totalPrice?: number;
    status?: string;
  }
) {
  try {
    const data = await prisma.quotation.update({
      where: {
        id: parseInt(quotationId),
      },
      data: updatedFields,
    });
    return data;
  } catch (error) {
    console.error("Error updating quotation:", error);
    throw new Error("Failed to update quotation");
  }
}

export async function deleteQuotationById(quotationId: string) {
  try {
    const data = await prisma.quotation.delete({
      where: {
        id: parseInt(quotationId),
      },
    });
    return data;
  } catch (error) {
    console.error("Error deleting quotation:", error);
    throw new Error("Failed to delete quotation");
  }
}
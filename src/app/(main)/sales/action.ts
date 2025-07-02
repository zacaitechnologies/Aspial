"use server";

import { PrismaClient, Services } from "@prisma/client";

const prisma = new PrismaClient();

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

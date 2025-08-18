"use server"

import { prisma } from "@/lib/prisma"

export async function getAllQuotations(userId?: string) {
  if (!userId) {
    return await prisma.quotation.findMany({
      include: {
        services: {
          include: {
            service: true,
          },
        },
        projects: true,
        createdBy: true,
        Client: true,
      },
      orderBy: { created_at: "desc" },
    })
  }

  // Check if user is admin
  const userWithRoles = await prisma.user.findUnique({
    where: { supabase_id: userId },
    include: { userRoles: { include: { role: true } } },
  })

  const isAdmin = userWithRoles?.userRoles.some((userRole) => userRole.role.slug === "admin") || false

  if (isAdmin) {
    // Admin can see all quotations
    return await prisma.quotation.findMany({
      include: {
        services: {
          include: {
            service: true,
          },
        },
        projects: true,
        createdBy: true,
        Client: true,
      },
      orderBy: { created_at: "desc" },
    })
  }

  // Non-admin users can only see their own quotations
  return await prisma.quotation.findMany({
    where: {
      createdById: userId
    },
    include: {
      services: {
        include: {
          service: true,
        },
      },
      projects: true,
      createdBy: true,
      Client: true,
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
  clientId?: string
  newClient?: {
    name: string
    email: string
    phone?: string
    company?: string
    address?: string
    notes?: string
  }
}) {
  // Calculate end date if start date and duration are provided
  let endDate: Date | undefined = undefined;
  if (data.startDate && data.duration) {
    const startDate = new Date(data.startDate);
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.duration);
  }

  return await prisma.$transaction(async (tx) => {
    let finalClientId = data.clientId;

    // If creating a new client, create it first
    if (data.newClient && !data.clientId) {
      const newClient = await tx.client.create({
        data: {
          name: data.newClient.name,
          email: data.newClient.email,
          phone: data.newClient.phone,
          company: data.newClient.company,
          address: data.newClient.address,
          notes: data.newClient.notes,
        }
      });
      finalClientId = newClient.id;
    }

    const quotation = await tx.quotation.create({
      data: {
        name: data.name,
        description: data.description,
        totalPrice: data.totalPrice,
        createdById: data.createdById,
        clientId: finalClientId,
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
      include: {
        Client: true,
        services: {
          include: {
            service: true,
          },
        },
        createdBy: true,
      },
    })
    return quotation
  });
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
    clientId?: string
    newClient?: {
      name: string
      email: string
      phone?: string
      company?: string
      address?: string
      notes?: string
    }
  },
) {
  return await prisma.$transaction(async (tx) => {
    // First, get the current quotation to check if it has a project
    const currentQuotation = await tx.quotation.findUnique({
      where: { id: Number.parseInt(id) },
      include: { projects: true }
    });

    // Delete existing quotation services
    await tx.quotationService.deleteMany({
      where: { quotationId: Number.parseInt(id) },
    });

    // Calculate end date if start date and duration are provided
    let endDate: Date | undefined = undefined;
    if (data.startDate && data.duration) {
      const startDate = new Date(data.startDate);
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + data.duration);
    }

    let finalClientId = data.clientId;

    // If creating a new client, create it first
    if (data.newClient && !data.clientId) {
      const newClient = await tx.client.create({
        data: {
          name: data.newClient.name,
          email: data.newClient.email,
          phone: data.newClient.phone,
          company: data.newClient.company,
          address: data.newClient.address,
          notes: data.newClient.notes,
        }
      });
      finalClientId = newClient.id;
    }

    // Update the quotation
    const updatedQuotation = await tx.quotation.update({
      where: { id: Number.parseInt(id) },
      data: {
        name: data.name,
        description: data.description,
        totalPrice: data.totalPrice,
        status: data.status,
        clientId: finalClientId,
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
      
      await tx.project.update({
        where: { id: project.id },
        data: {
          name: data.name,
          description: data.description,
          clientId: finalClientId,
          startDate: startDate,
          endDate: endDate,
        },
      });
    }

    return updatedQuotation;
  });
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

export async function getAllClientsForQuotation() {
  return await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
    },
    orderBy: {
      name: "asc"
    }
  })
} 
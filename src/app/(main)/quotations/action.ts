"use server"

import { prisma } from "@/lib/prisma"
import { isUserAdmin } from "../projects/permissions"

export async function getAllQuotations(userId?: string) {
  // Everyone can see all quotations regardless of who created them
  return await prisma.quotation.findMany({
    include: {
      services: {
        include: {
          service: true,
        },
      },
      project: true,
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
  status?: "draft" | "accepted"
  discountValue?: number
  discountType?: "percentage" | "fixed"
  duration?: number
  startDate?: string
  clientId?: string
  projectId?: number
  newClient?: {
    name: string
    email: string
    phone?: string
    company?: string
    address?: string
    notes?: string
    industry?: string
    yearlyRevenue?: string
    membershipType?: string
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
          industry: data.newClient.industry,
          yearlyRevenue: data.newClient.yearlyRevenue ? parseFloat(data.newClient.yearlyRevenue) : null,
          membershipType: data.newClient.membershipType as "MEMBER" | "NON_MEMBER" || "NON_MEMBER",
        }
      });
      finalClientId = newClient.id;
    }

    // Ensure we have a client ID
    if (!finalClientId) {
      throw new Error("Client ID is required");
    }

    const quotation = await tx.quotation.create({
      data: {
        name: data.name,
        description: data.description,
        totalPrice: data.totalPrice,
        createdById: data.createdById,
        status: data.status || "accepted", // Use provided status or default to accepted
        clientId: finalClientId,
        projectId: data.projectId || null,
        discountValue: data.discountValue || null,
        discountType: data.discountType || null,
        duration: data.duration || 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: endDate || new Date(),

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
    projectId?: number
    newClient?: {
      name: string
      email: string
      phone?: string
      company?: string
      address?: string
      notes?: string
      industry?: string
      yearlyRevenue?: string
      membershipType?: string
    }
  },
) {
  return await prisma.$transaction(async (tx) => {
    // First, get the current quotation to check if it has a project
    const currentQuotation = await tx.quotation.findUnique({
      where: { id: Number.parseInt(id) },
      include: { project: true }
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
          industry: data.newClient.industry,
          yearlyRevenue: data.newClient.yearlyRevenue ? parseFloat(data.newClient.yearlyRevenue) : null,
          membershipType: data.newClient.membershipType as "MEMBER" | "NON_MEMBER" || "NON_MEMBER",
        }
      });
      finalClientId = newClient.id;
    }

    // Ensure we have a client ID
    if (!finalClientId) {
      throw new Error("Client ID is required");
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
        projectId: data.projectId || null,
        discountValue: data.discountValue || null,
        discountType: data.discountType || null,
        duration: data.duration || 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: endDate || new Date(),
        services: data.serviceIds ? {
          create: data.serviceIds.map((serviceId) => ({
            serviceId: Number.parseInt(serviceId),
          })),
        } : undefined,
      },
    });

    // Update the associated project if it exists
    if (currentQuotation && currentQuotation.project) {
      const project = currentQuotation.project;
      const startDate = project.startDate || new Date();
      let endDate: Date | undefined = undefined;
      
      if (data.duration) {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + data.duration);
      }
      
      // Get client information for the project update
      let clientName: string | undefined = undefined;
      if (finalClientId) {
        const client = await tx.client.findUnique({
          where: { id: finalClientId },
          select: { company: true, name: true }
        });
        clientName = client?.company || client?.name;
      }
      
      await tx.project.update({
        where: { id: project.id },
        data: {
          name: data.name,
          description: data.description,
          clientId: finalClientId,
          clientName: clientName,
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
    where: { quotations: { some: { id: Number.parseInt(id) } } },
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

// Optimized function for getting projects for quotations - shows projects immediately with minimal data
export async function getProjectsForQuotationOptimized(userId?: string) {
  if (!userId) {
    return []
  }

  const isAdmin = await isUserAdmin(userId);
  
  if (isAdmin) {
    // For admins: load only essential data for quotation selection
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        Client: {
          select: {
            name: true,
          }
        },
      },
      orderBy: { created_at: "desc" },
    });

    return projects;
  }

  // For non-admins: load only projects they have access to with minimal data
  const userPermissions = await prisma.projectPermission.findMany({
    where: { 
      userId, 
      OR: [
        { isOwner: true },
        { canView: true }
      ]
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          Client: {
            select: {
              name: true,
            }
          },
        },
      },
    },
    orderBy: {
      project: { created_at: "desc" },
    },
  });

  return userPermissions.map((permission) => permission.project);
}

// Optimized function for getting clients for quotations - shows clients immediately with minimal data
export async function getClientsForQuotationOptimized() {
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
  });
}

// Get client details including membership status
export async function getClientById(clientId: string) {
  return await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      membershipType: true,
    }
  });
}

// Update client membership status
export async function updateClientMembershipStatus(clientId: string, membershipType: "MEMBER" | "NON_MEMBER") {
  return await prisma.client.update({
    where: { id: clientId },
    data: { membershipType },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      membershipType: true,
    }
  });
}


// Create a new custom service
export async function createCustomService(data: {
  name: string;
  description: string;
  price: number;
  createdById: string;
  quotationId: number;
}) {
  return await prisma.customService.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      createdById: data.createdById,
      quotationId: data.quotationId,
      status: "PENDING",
    },
  });
}

// Get custom services for a quotation
export async function getCustomServicesByQuotationId(quotationId: number) {
  return await prisma.customService.findMany({
    where: {
      quotationId: quotationId,
    },
    include: {
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
} 
"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { isRedirectError } from "next/dist/client/components/redirect-error"

// Authentication functions
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return redirect("/login")
    }
    
    return user
  } catch (error: any) {
    // Handle redirect errors
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      // This is a redirect, not an error - don't log it
      throw error
    }
    console.error("Error in getCurrentUser:", error)
    throw new Error("Authentication failed")
  }
}

// Client CRUD operations
export async function getAllClients() {
  try {
    await getCurrentUser() // Ensure user is authenticated
    
    const clients = await prisma.client.findMany({
      include: {
        quotations: {
          select: {
            id: true,
            totalPrice: true,
          }
        },
        projects: {
          select: {
            id: true,
          }
        }
      },
      orderBy: {
        created_at: "desc"
      }
    })
    
    // Handle empty database gracefully
    if (!clients || clients.length === 0) {
      console.log("No clients found in database - returning empty array");
      return [];
    }
    
    // Transform data to match the expected interface
    return clients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone || undefined,
      company: client.company || undefined,
      address: client.address || undefined,
      notes: client.notes || undefined,
      industry: client.industry || undefined,
      yearlyRevenue: client.yearlyRevenue || undefined,
      membershipType: client.membershipType,
      quotationsCount: client.quotations.length,
      totalValue: client.quotations.reduce((sum, q) => sum + q.totalPrice, 0),
      created_at: client.created_at.toISOString()
    }))
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in getAllClients:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`Failed to fetch clients: ${error.message}`)
  }
}

export async function getClientById(id: string) {
  try {
    await getCurrentUser() // Ensure user is authenticated
    
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        quotations: {
          select: {
            id: true,
            name: true,
            totalPrice: true,
            status: true,
            created_at: true,
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            created_at: true,
          }
        }
      }
    })
    
    if (!client) {
      throw new Error("Client not found")
    }
    
    return client
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in getClientById:", error)
    throw new Error("Failed to fetch client")
  }
}

export async function createCustomerClient(data: {
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  notes?: string
  industry?: string
  yearlyRevenue?: number
  membershipType: "MEMBER" | "NON_MEMBER"
}) {
  try {
    await getCurrentUser() // Ensure user is authenticated
    
    const client = await prisma.client.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        address: data.address,
        notes: data.notes,
        industry: data.industry,
        yearlyRevenue: data.yearlyRevenue,
        membershipType: data.membershipType,
      }
    })
    
    revalidatePath("/clients")
    return client
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in createClient:", error)
    throw error
  }
}

export async function updateClient(id: string, data: {
  name?: string
  email?: string
  phone?: string
  company?: string
  address?: string
  notes?: string
  industry?: string
  yearlyRevenue?: number
  membershipType?: "MEMBER" | "NON_MEMBER"
}) {
  try {
    await getCurrentUser() // Ensure user is authenticated
    
    const client = await prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        address: data.address,
        notes: data.notes,
        industry: data.industry,
        yearlyRevenue: data.yearlyRevenue,
        membershipType: data.membershipType,
        updated_at: new Date(),
      }
    })
    
    revalidatePath("/clients")
    revalidatePath(`/clients/${id}`)
    return client
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in updateClient:", error)
    throw error
  }
}

export async function deleteClient(id: string) {
  try {
    await getCurrentUser() // Ensure user is authenticated
    
    await prisma.client.delete({
      where: { id }
    })
    
    revalidatePath("/clients")
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in deleteClient:", error)
    throw error
  }
}

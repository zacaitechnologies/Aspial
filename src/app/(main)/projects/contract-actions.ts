"use server"

import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { revalidateTag } from "next/cache"

const CONTRACTS_BUCKET = "contracts"

export interface ContractWithUploader {
  id: string
  projectId: number
  fileName: string
  filePath: string
  uploadedBy: string
  createdAt: Date
  updatedAt: Date
  uploader: {
    firstName: string
    lastName: string
    email: string
  }
}

/**
 * Upload a contract file to Supabase storage and save metadata to database
 */
export async function uploadContract(
  projectId: number,
  formData: FormData
): Promise<{ success: boolean; error?: string; contract?: ContractWithUploader }> {
  try {
    // Create Supabase client first
    const supabase = await createClient()

    // Verify user is authenticated with Supabase (this ensures JWT is valid)
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !supabaseUser) {
      console.error("Authentication error:", authError)
      return { success: false, error: "User not authenticated. Please log in again." }
    }

    // Also check cached user for database operations
    const user = await getCachedUser()
    if (!user) {
      return { success: false, error: "User not found in database" }
    }

    // Verify the Supabase user ID matches the cached user ID
    if (user.id !== supabaseUser.id) {
      return { success: false, error: "User ID mismatch" }
    }

    const file = formData.get("file") as File
    if (!file) {
      return { success: false, error: "No file provided" }
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { success: false, error: "File size exceeds 10MB limit" }
    }

    // Use original filename
    const fileName = file.name

    // Upload file to Supabase storage (client is now authenticated)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error("Error uploading contract:", uploadError)
      
      // Provide more specific error messages
      if (uploadError.message.includes("row-level security") || uploadError.message.includes("RLS")) {
        return { success: false, error: "Permission denied. Please check your storage policies." }
      }
      if (uploadError.message.includes("JWT") || uploadError.message.includes("token")) {
        return { success: false, error: "Authentication expired. Please refresh the page and try again." }
      }
      
      return { success: false, error: `Failed to upload file: ${uploadError.message}` }
    }

    // Save contract metadata to database
    const contract = await prisma.contract.create({
      data: {
        projectId,
        fileName,
        filePath: uploadData.path,
        uploadedBy: user.id,
      },
      include: {
        uploader: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Invalidate cache
    revalidateTag('projects')

    return { success: true, contract }
  } catch (error: any) {
    console.error("Error uploading contract:", error)
    return { success: false, error: error.message || "Failed to upload contract" }
  }
}

/**
 * Get all contracts for a project
 */
export async function getProjectContracts(
  projectId: number
): Promise<ContractWithUploader[]> {
  try {
    const contracts = await prisma.contract.findMany({
      where: { projectId },
      include: {
        uploader: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return contracts
  } catch (error) {
    console.error("Error fetching contracts:", error)
    return []
  }
}

/**
 * Get public URL for a contract file
 */
export async function getContractUrl(filePath: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = supabase.storage.from(CONTRACTS_BUCKET).getPublicUrl(filePath)
    return data.publicUrl
  } catch (error) {
    console.error("Error getting contract URL:", error)
    return null
  }
}

/**
 * Delete a contract file and its metadata
 */
export async function deleteContract(
  contractId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get contract to check permissions and get file path
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        project: {
          include: {
            permissions: {
              where: { userId },
            },
          },
        },
      },
    })

    if (!contract) {
      return { success: false, error: "Contract not found" }
    }

    // Check if user has permission (owner or admin)
    const isOwner = contract.project.permissions.some(
      (p: { userId: string; isOwner: boolean }) => p.userId === userId && p.isOwner
    )

    // Check if user is admin (you may need to import isUserAdmin)
    const { isUserAdmin } = await import("./permissions")
    const isAdmin = await isUserAdmin(userId)

    if (!isOwner && !isAdmin) {
      return { success: false, error: "Insufficient permissions to delete contract" }
    }

    // Delete file from Supabase storage
    const supabase = await createClient()
    
    // Verify authentication before delete
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !supabaseUser) {
      return { success: false, error: "User not authenticated. Please log in again." }
    }

    const { error: deleteError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .remove([contract.filePath])

    if (deleteError) {
      console.error("Error deleting contract file:", deleteError)
      // Continue to delete database record even if file deletion fails
    }

    // Delete contract metadata from database
    await prisma.contract.delete({
      where: { id: contractId },
    })

    // Invalidate cache
    revalidateTag('projects')

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting contract:", error)
    return { success: false, error: error.message || "Failed to delete contract" }
  }
}


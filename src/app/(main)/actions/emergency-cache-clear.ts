"use server"

import { clearAllAdminCache } from "@/lib/admin-cache"
import { revalidatePath } from "next/cache"
import { getCachedUser } from "@/lib/auth-cache"
import { prisma } from "@/lib/prisma"

/**
 * EMERGENCY: Force clear all role caches
 * This should only be called in development or by admins in emergencies
 */
export async function emergencyClearAllCaches() {
  try {
    // Verify admin access
    const user = await getCachedUser()
    
    const userWithRoles = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    const isAdmin = userWithRoles?.userRoles.some((userRole) => userRole.role.slug === "admin")
    
    if (!isAdmin) {
      return {
        success: false,
        error: "Admin access required"
      }
    }
    
    // Clear all role caches
    await clearAllAdminCache()
    
    // Revalidate all critical paths
    revalidatePath("/", "layout")
    revalidatePath("/projects", "layout")
    revalidatePath("/quotations", "layout")
    revalidatePath("/invoices", "layout")
    revalidatePath("/receipts", "layout")
    revalidatePath("/clients", "layout")
    revalidatePath("/services", "layout")
    revalidatePath("/appointment-bookings", "layout")
    revalidatePath("/time-tracking", "layout")
    revalidatePath("/user-management", "layout")
    
    console.log("🚨 EMERGENCY: All caches cleared by admin")
    
    return {
      success: true,
      message: "All caches cleared successfully"
    }
  } catch (error: any) {
    console.error("Error clearing caches:", error)
    return {
      success: false,
      error: error.message || "Failed to clear caches"
    }
  }
}


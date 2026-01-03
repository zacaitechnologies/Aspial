"use server"

import { 
  getCachedIsUserAdmin, 
  getCachedIsUserBrandAdvisor, 
  getCachedIsUserOperationUser,
  getCachedUserRole,
  clearAdminCache,
  clearAllAdminCache
} from "@/lib/admin-cache"
import { prisma } from "@/lib/prisma"

/**
 * Clear cache for a specific user
 */
export async function clearUserCache(userId: string) {
  await clearAdminCache(userId)
  return { success: true, message: 'Cache cleared for user' }
}

/**
 * Clear all user caches (admin only)
 */
export async function clearAllCaches() {
  await clearAllAdminCache()
  return { success: true, message: 'All caches cleared' }
}

/**
 * Debug action to get raw user role data from database
 * NEVER cache this - always fetch fresh data
 */
export async function debugGetUserRoles(userId: string) {
  try {
    // First try to find by supabase_id
    let user = await prisma.user.findUnique({
      where: { supabase_id: userId },
      include: { 
        userRoles: { 
          include: { role: true } 
        },
        staffRole: true
      },
    })

    // If not found, try by id
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          userRoles: { 
            include: { role: true } 
          },
          staffRole: true
        },
      })
    }

    return {
      found: !!user,
      searchedBy: user ? (user.supabase_id === userId ? 'supabase_id' : 'id') : null,
      userId: user?.id,
      supabaseId: user?.supabase_id,
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      staffRole: user?.staffRole,
      userRoles: user?.userRoles.map(ur => ({
        id: ur.id,
        roleId: ur.roleId,
        role: {
          id: ur.role.id,
          slug: ur.role.slug,
          description: ur.role.description
        }
      })),
      roleSlugs: user?.userRoles.map(ur => ur.role.slug) || []
    }
  } catch (error: any) {
    return {
      error: error.message,
      found: false
    }
  }
}

/**
 * Server action to check if a user is an admin (with caching)
 * Use this in client components instead of calling isUserAdmin directly
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  return await getCachedIsUserAdmin(userId)
}

/**
 * Server action to check if a user is a brand-advisor (with caching)
 */
export async function checkIsBrandAdvisor(userId: string): Promise<boolean> {
  return await getCachedIsUserBrandAdvisor(userId)
}

/**
 * Server action to check if a user is an operation-user (with caching)
 */
export async function checkIsOperationUser(userId: string): Promise<boolean> {
  return await getCachedIsUserOperationUser(userId)
}

/**
 * Server action to get user's role (with caching)
 */
export async function getUserRole(userId: string): Promise<string | null> {
  return await getCachedUserRole(userId)
}

/**
 * Server action to check if user has full access (admin or brand-advisor)
 * Use this where brand-advisor should have same permissions as admin
 */
export async function checkHasFullAccess(userId: string): Promise<boolean> {
  const [isAdmin, isBrandAdvisor] = await Promise.all([
    getCachedIsUserAdmin(userId),
    getCachedIsUserBrandAdvisor(userId)
  ])
  return isAdmin || isBrandAdvisor
}


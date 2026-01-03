"use server"

import { 
  getCachedIsUserAdmin, 
  getCachedIsUserBrandAdvisor, 
  getCachedIsUserOperationUser,
  getCachedUserRole
} from "@/lib/admin-cache"

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


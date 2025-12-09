"use server"

import { isUserAdmin } from "@/app/(main)/projects/permissions"

// Cache for isUserAdmin checks - shared across all pages
const adminCache = new Map<string, { isAdmin: boolean; timestamp: number }>()
const ADMIN_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Cached version of isUserAdmin that reduces database queries
 * Cache duration: 5 minutes
 */
export async function getCachedIsUserAdmin(userId: string): Promise<boolean> {
  const now = Date.now()
  const cached = adminCache.get(userId)
  
  if (cached && now - cached.timestamp < ADMIN_CACHE_DURATION) {
    return cached.isAdmin
  }
  
  const isAdmin = await isUserAdmin(userId)
  adminCache.set(userId, { isAdmin, timestamp: now })
  return isAdmin
}

/**
 * Clear the admin cache for a specific user (useful when roles change)
 */
export async function clearAdminCache(userId: string): Promise<void> {
  adminCache.delete(userId)
}

/**
 * Clear all admin cache entries
 */
export async function clearAllAdminCache(): Promise<void> {
  adminCache.clear()
}


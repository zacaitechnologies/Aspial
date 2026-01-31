"use server"

import { isUserAdmin, isUserAdminWithExists, isUserBrandAdvisor, isUserOperationUser, getUserRole } from "@/app/(main)/projects/permissions"

// Cache for role checks - shared across all pages
const roleCache = new Map<string, { 
  isAdmin: boolean
  isBrandAdvisor: boolean
  isOperationUser: boolean
  role: string | null
  timestamp: number 
}>()
const ROLE_CACHE_DURATION = 30 * 1000 // 30 seconds (reduced from 5 minutes)

/**
 * Cached version of isUserAdmin that reduces database queries.
 * Only caches when the user exists in Prisma, so "not admin" for missing users is not cached
 * (avoids stale false when user was just created/linked).
 */
export async function getCachedIsUserAdmin(userId: string): Promise<boolean> {
  const now = Date.now()
  const cached = roleCache.get(userId)
  
  if (cached && now - cached.timestamp < ROLE_CACHE_DURATION) {
    return cached.isAdmin
  }
  
  const { isAdmin, userExists } = await isUserAdminWithExists(userId)
  // Only cache when user exists in DB so we re-check next time if they were just created/linked
  if (userExists) {
    const isBrandAdvisor = await isUserBrandAdvisor(userId)
    const isOperationUser = await isUserOperationUser(userId)
    const role = await getUserRole(userId)
    roleCache.set(userId, { 
      isAdmin, 
      isBrandAdvisor,
      isOperationUser,
      role,
      timestamp: now 
    })
  }
  return isAdmin
}

/**
 * Cached version of isUserBrandAdvisor
 */
export async function getCachedIsUserBrandAdvisor(userId: string): Promise<boolean> {
  const now = Date.now()
  const cached = roleCache.get(userId)
  
  if (cached && now - cached.timestamp < ROLE_CACHE_DURATION) {
    return cached.isBrandAdvisor
  }
  
  const isAdmin = await isUserAdmin(userId)
  const isBrandAdvisor = await isUserBrandAdvisor(userId)
  const isOperationUser = await isUserOperationUser(userId)
  const role = await getUserRole(userId)
  
  roleCache.set(userId, { 
    isAdmin, 
    isBrandAdvisor,
    isOperationUser,
    role,
    timestamp: now 
  })
  return isBrandAdvisor
}

/**
 * Cached version of isUserOperationUser
 */
export async function getCachedIsUserOperationUser(userId: string): Promise<boolean> {
  const now = Date.now()
  const cached = roleCache.get(userId)
  
  if (cached && now - cached.timestamp < ROLE_CACHE_DURATION) {
    return cached.isOperationUser
  }
  
  const isAdmin = await isUserAdmin(userId)
  const isBrandAdvisor = await isUserBrandAdvisor(userId)
  const isOperationUser = await isUserOperationUser(userId)
  const role = await getUserRole(userId)
  
  roleCache.set(userId, { 
    isAdmin, 
    isBrandAdvisor,
    isOperationUser,
    role,
    timestamp: now 
  })
  return isOperationUser
}

/**
 * Cached version of getUserRole
 */
export async function getCachedUserRole(userId: string): Promise<string | null> {
  const now = Date.now()
  const cached = roleCache.get(userId)
  
  if (cached && now - cached.timestamp < ROLE_CACHE_DURATION) {
    return cached.role
  }
  
  const isAdmin = await isUserAdmin(userId)
  const isBrandAdvisor = await isUserBrandAdvisor(userId)
  const isOperationUser = await isUserOperationUser(userId)
  const role = await getUserRole(userId)
  
  roleCache.set(userId, { 
    isAdmin, 
    isBrandAdvisor,
    isOperationUser,
    role,
    timestamp: now 
  })
  return role
}

/**
 * Clear the role cache for a specific user (useful when roles change)
 */
export async function clearAdminCache(userId: string): Promise<void> {
  roleCache.delete(userId)
}

/**
 * Clear all role cache entries
 */
export async function clearAllAdminCache(): Promise<void> {
  roleCache.clear()
}


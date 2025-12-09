"use server"

import { getCachedIsUserAdmin } from "@/lib/admin-cache"

/**
 * Server action to check if a user is an admin (with caching)
 * Use this in client components instead of calling isUserAdmin directly
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  return await getCachedIsUserAdmin(userId)
}


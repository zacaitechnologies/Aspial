"use client"

import { clearAllProjectCaches } from "@/app/(main)/projects/hooks/useProjectCache"

/**
 * Clears all application caches from localStorage
 * This should be called on logout to prevent data leakage between accounts
 */
export function clearAllClientCaches(): void {
	try {
		// Clear project caches (memory + localStorage + mount tracking)
		clearAllProjectCaches()
		
		// Get all localStorage keys
		const keysToRemove: string[] = []
		
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			if (key) {
				// Clear quotation caches
				if (key.startsWith('quotation-cache-')) {
					keysToRemove.push(key)
				}
				// Clear quotations list caches
				if (key.startsWith('quotations-cache')) {
					keysToRemove.push(key)
				}
				// Clear invoice caches
				if (key.startsWith('invoice-cache')) {
					keysToRemove.push(key)
				}
				// Clear receipt caches
				if (key.startsWith('receipt-cache')) {
					keysToRemove.push(key)
				}
				// Clear client caches
				if (key.startsWith('client-cache')) {
					keysToRemove.push(key)
				}
				// Clear service caches
				if (key.startsWith('service-cache')) {
					keysToRemove.push(key)
				}
				// Clear any other app-specific caches
				if (key.startsWith('aspial-')) {
					keysToRemove.push(key)
				}
			}
		}
		
		// Remove all identified cache keys
		keysToRemove.forEach(key => {
			localStorage.removeItem(key)
		})
		
		// SECURITY: Also clear sessionStorage
		sessionStorage.clear()
		
		console.log(`🧹 Cleared ${keysToRemove.length} cached items from localStorage`)
		console.log('🔒 Cleared all sessionStorage for security')
	} catch (error) {
		console.error('Error clearing client caches:', error)
	}
}

/**
 * Clears module-level memory caches
 * Note: This is a best-effort operation since module-level caches 
 * are typically cleared when the page navigates away
 */
export function clearAllMemoryCaches(): void {
	// Memory caches will be cleared when the user navigates to /logout
	// and the page reloads, but we can dispatch an event for components to listen to
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('app:logout'))
	}
}

/**
 * Comprehensive cache clear for logout
 */
export function clearAllCachesOnLogout(): void {
	clearAllClientCaches()
	clearAllMemoryCaches()
	console.log('✅ All client-side caches cleared for logout')
}


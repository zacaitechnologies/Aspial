"use client"

import { useState, useEffect, useCallback } from "react"
import { getReceiptById, getReceiptFullById } from "../action"

interface UseReceiptCacheReturn {
	receipt: any | null
	isLoading: boolean
	onRefresh: () => Promise<void>
	invalidateCache: () => void
}

interface UseReceiptCacheOptions {
	fetchFullData?: boolean // If true, fetches full data including custom services with complete details
}

const MEMORY_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for active session
const LOCALSTORAGE_MAX_AGE = 30 * 60 * 1000 // 30 minutes max for localStorage

// ✅ MODULE-LEVEL MEMORY CACHE (fast access during session) - per receipt
const memoryReceiptCache: { [key: string]: {
	receipt: any
	timestamp: number
}} = {}
const loadingStates: { [key: string]: boolean } = {}

// ✅ LOCALSTORAGE HELPERS (persistent across browser restarts)
const getStorageKey = (cacheKey: string) => `receipt-cache-${cacheKey}`

const loadFromLocalStorage = (cacheKey: string) => {
	try {
		const stored = localStorage.getItem(getStorageKey(cacheKey))
		if (stored) {
			return JSON.parse(stored)
		}
	} catch (error) {
		console.error('Error reading receipt from localStorage:', error)
	}
	return null
}

const saveToLocalStorage = (cacheKey: string, data: any) => {
	try {
		localStorage.setItem(getStorageKey(cacheKey), JSON.stringify(data))
	} catch (error) {
		console.error('Error saving receipt to localStorage:', error)
	}
}

export function useReceiptCache(
	receiptId: string | undefined,
	options: UseReceiptCacheOptions = {}
): UseReceiptCacheReturn {
	const { fetchFullData = false } = options
	const cacheKey = `${receiptId}${fetchFullData ? '-full' : ''}`
	
	const [receipt, setReceipt] = useState<any | null>(() => {
		if (!receiptId) return null
		// Only access memory cache during SSR, localStorage will be checked after mount
		return memoryReceiptCache[cacheKey]?.receipt || null
	})
	
	// Only show loading if we don't have cached data
	const [isLoading, setIsLoading] = useState<boolean>(() => {
		if (!receiptId) return false
		// During SSR, assume loading if no memory cache
		return !memoryReceiptCache[cacheKey]
	})
	
	// Check localStorage after component mounts (client-side only)
	useEffect(() => {
		if (!receiptId) return
		
		// Try localStorage first, then memory cache
		const stored = loadFromLocalStorage(cacheKey)
		if (stored) {
			memoryReceiptCache[cacheKey] = stored
			setReceipt(stored.receipt)
			setIsLoading(false)
		} else if (memoryReceiptCache[cacheKey]) {
			// We have memory cache, no need to show loading
			setIsLoading(false)
		}
	}, [receiptId, cacheKey])
	
	const loadReceipt = useCallback(async (forceRefresh = false) => {
		if (!receiptId) {
			setIsLoading(false)
			return
		}

		const now = Date.now()
		
		// STALE-WHILE-REVALIDATE PATTERN
		if (!forceRefresh) {
			// Check memory cache first (fastest)
			const memCached = memoryReceiptCache[cacheKey]
			if (memCached && now - memCached.timestamp < MEMORY_CACHE_DURATION) {
				console.log(`✅ MEMORY CACHE HIT [Receipt ${receiptId}] - Instant load (Age: ${Math.floor((now - memCached.timestamp) / 1000)}s)`)
				setReceipt(memCached.receipt)
				setIsLoading(false)
				return
			}
			
			// Check localStorage (persistent)
			const stored = loadFromLocalStorage(cacheKey)
			if (stored && now - stored.timestamp < LOCALSTORAGE_MAX_AGE) {
				const age = Math.floor((now - stored.timestamp) / 1000)
				console.log(`📦 LOCALSTORAGE HIT [Receipt ${receiptId}] - Showing stale data (Age: ${age}s) while revalidating...`)
				
				// Show cached data immediately
				setReceipt(stored.receipt)
				memoryReceiptCache[cacheKey] = stored
				setIsLoading(false)
				
				// Continue to fetch fresh data in background (don't return!)
			}
		}
		
		// Prevent duplicate simultaneous loads
		if (loadingStates[cacheKey]) {
			console.log(`⏳ RECEIPT [${receiptId}]: Already loading, skipping duplicate request`)
			return
		}
		
		const age = memoryReceiptCache[cacheKey] ? Math.floor((now - memoryReceiptCache[cacheKey].timestamp) / 1000) : 0
		console.log(`🔄 FETCHING FRESH DATA [Receipt ${receiptId}] from API (Previous age: ${age}s)`)
		loadingStates[cacheKey] = true
		
		// Only show loading spinner if we don't have ANY cached data
		if (!memoryReceiptCache[cacheKey]) {
			setIsLoading(true)
		}
		
		try {
			const receiptData = fetchFullData 
				? await getReceiptFullById(receiptId)
				: await getReceiptById(receiptId)
				
			if (receiptData) {
				const freshTimestamp = Date.now()
				const cacheData = {
					receipt: receiptData,
					timestamp: freshTimestamp
				}
				
				// Update all caches
				memoryReceiptCache[cacheKey] = cacheData
				saveToLocalStorage(cacheKey, cacheData)
				
				// Update component state
				setReceipt(receiptData)
				console.log(`✅ FRESH DATA LOADED [Receipt ${receiptId}] and cached (Memory + localStorage)`)
			}
		} catch (error) {
			console.error("Error loading receipt:", error)
			// If we have cached data, keep showing it (graceful degradation)
		} finally {
			setIsLoading(false)
			loadingStates[cacheKey] = false
		}
	}, [receiptId, cacheKey, fetchFullData])

	const onRefresh = useCallback(async () => {
		console.log(`RECEIPT [${receiptId}]: Force refresh requested`)
		await loadReceipt(true)
	}, [loadReceipt, receiptId])

	const invalidateCache = useCallback(() => {
		console.log(`🔄 RECEIPT [${receiptId}]: Cache invalidated (Memory + localStorage)`)
		delete memoryReceiptCache[cacheKey]
		try {
			localStorage.removeItem(getStorageKey(cacheKey))
		} catch (error) {
			console.error('Error clearing receipt from localStorage:', error)
		}
	}, [receiptId, cacheKey])

	useEffect(() => {
		loadReceipt()
	}, [loadReceipt])

	return {
		receipt,
		isLoading,
		onRefresh,
		invalidateCache
	}
}


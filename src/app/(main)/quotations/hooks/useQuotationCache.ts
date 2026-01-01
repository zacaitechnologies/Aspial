"use client"

import { useState, useEffect, useCallback } from "react"
import { getQuotationById } from "../action"

interface UseQuotationCacheReturn {
	quotation: any | null
	isLoading: boolean
	onRefresh: () => Promise<void>
	invalidateCache: () => void
}

const MEMORY_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for active session
const LOCALSTORAGE_MAX_AGE = 30 * 60 * 1000 // 30 minutes max for localStorage

// ✅ MODULE-LEVEL MEMORY CACHE (fast access during session) - per quotation
const memoryQuotationCache: { [key: string]: {
	quotation: any
	timestamp: number
}} = {}
const loadingStates: { [key: string]: boolean } = {}

// ✅ LOCALSTORAGE HELPERS (persistent across browser restarts)
const getStorageKey = (cacheKey: string) => `quotation-cache-${cacheKey}`

const loadFromLocalStorage = (cacheKey: string) => {
	try {
		const stored = localStorage.getItem(getStorageKey(cacheKey))
		if (stored) {
			return JSON.parse(stored)
		}
	} catch (error) {
		console.error('Error reading quotation from localStorage:', error)
	}
	return null
}

const saveToLocalStorage = (cacheKey: string, data: any) => {
	try {
		localStorage.setItem(getStorageKey(cacheKey), JSON.stringify(data))
	} catch (error) {
		console.error('Error saving quotation to localStorage:', error)
	}
}

export function useQuotationCache(quotationId: string | undefined): UseQuotationCacheReturn {
	const cacheKey = `${quotationId}`
	
	const [quotation, setQuotation] = useState<any | null>(() => {
		if (!quotationId) return null
		// Only access memory cache during SSR, localStorage will be checked after mount
		return memoryQuotationCache[cacheKey]?.quotation || null
	})
	
	// Only show loading if we don't have cached data
	const [isLoading, setIsLoading] = useState<boolean>(() => {
		if (!quotationId) return false
		// During SSR, assume loading if no memory cache
		return !memoryQuotationCache[cacheKey]
	})
	
	// Check localStorage after component mounts (client-side only)
	useEffect(() => {
		if (!quotationId) return
		
		// Try localStorage first, then memory cache
		const stored = loadFromLocalStorage(cacheKey)
		if (stored) {
			memoryQuotationCache[cacheKey] = stored
			setQuotation(stored.quotation)
			setIsLoading(false)
		} else if (memoryQuotationCache[cacheKey]) {
			// We have memory cache, no need to show loading
			setIsLoading(false)
		}
	}, [quotationId, cacheKey])
	
	const loadQuotation = useCallback(async (forceRefresh = false) => {
		if (!quotationId) {
			setIsLoading(false)
			return
		}

		const now = Date.now()
		
		// STALE-WHILE-REVALIDATE PATTERN
		if (!forceRefresh) {
			// Check memory cache first (fastest)
			const memCached = memoryQuotationCache[cacheKey]
			if (memCached && now - memCached.timestamp < MEMORY_CACHE_DURATION) {
				console.log(`✅ MEMORY CACHE HIT [Quotation ${quotationId}] - Instant load (Age: ${Math.floor((now - memCached.timestamp) / 1000)}s)`)
				setQuotation(memCached.quotation)
				setIsLoading(false)
				return
			}
			
			// Check localStorage (persistent)
			const stored = loadFromLocalStorage(cacheKey)
			if (stored && now - stored.timestamp < LOCALSTORAGE_MAX_AGE) {
				const age = Math.floor((now - stored.timestamp) / 1000)
				console.log(`📦 LOCALSTORAGE HIT [Quotation ${quotationId}] - Showing stale data (Age: ${age}s) while revalidating...`)
				
				// Show cached data immediately
				setQuotation(stored.quotation)
				memoryQuotationCache[cacheKey] = stored
				setIsLoading(false)
				
				// Continue to fetch fresh data in background (don't return!)
			}
		}
		
		// Prevent duplicate simultaneous loads
		if (loadingStates[cacheKey]) {
			console.log(`⏳ QUOTATION [${quotationId}]: Already loading, skipping duplicate request`)
			return
		}
		
		const age = memoryQuotationCache[cacheKey] ? Math.floor((now - memoryQuotationCache[cacheKey].timestamp) / 1000) : 0
		console.log(`🔄 FETCHING FRESH DATA [Quotation ${quotationId}] from API (Previous age: ${age}s)`)
		loadingStates[cacheKey] = true
		
		// Only show loading spinner if we don't have ANY cached data
		if (!memoryQuotationCache[cacheKey]) {
			setIsLoading(true)
		}
		
		try {
			const quotationData = await getQuotationById(quotationId)
			if (quotationData) {
				const freshTimestamp = Date.now()
				const cacheData = {
					quotation: quotationData,
					timestamp: freshTimestamp
				}
				
				// Update all caches
				memoryQuotationCache[cacheKey] = cacheData
				saveToLocalStorage(cacheKey, cacheData)
				
				// Update component state
				setQuotation(quotationData)
				console.log(`✅ FRESH DATA LOADED [Quotation ${quotationId}] and cached (Memory + localStorage)`)
			}
		} catch (error) {
			console.error("Error loading quotation:", error)
			// If we have cached data, keep showing it (graceful degradation)
		} finally {
			setIsLoading(false)
			loadingStates[cacheKey] = false
		}
	}, [quotationId, cacheKey])

	const onRefresh = useCallback(async () => {
		console.log(`QUOTATION [${quotationId}]: Force refresh requested`)
		await loadQuotation(true)
	}, [loadQuotation, quotationId])

	const invalidateCache = useCallback(() => {
		console.log(`🔄 QUOTATION [${quotationId}]: Cache invalidated (Memory + localStorage)`)
		delete memoryQuotationCache[cacheKey]
		try {
			localStorage.removeItem(getStorageKey(cacheKey))
		} catch (error) {
			console.error('Error clearing quotation from localStorage:', error)
		}
	}, [quotationId, cacheKey])

	useEffect(() => {
		loadQuotation()
	}, [loadQuotation])

	return {
		quotation,
		isLoading,
		onRefresh,
		invalidateCache
	}
}


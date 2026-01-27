"use client"

import { useState, useEffect, useCallback } from "react"
import { getAllQuotations } from "../action"
import { QuotationWithServices } from "../types"

interface UseQuotationsCacheReturn {
	quotations: QuotationWithServices[]
	isLoading: boolean
	onRefresh: () => Promise<void>
	invalidateCache: () => void
}

const MEMORY_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for active session
const LOCALSTORAGE_MAX_AGE = 30 * 60 * 1000 // 30 minutes max for localStorage

// ✅ MODULE-LEVEL MEMORY CACHE (fast access during session)
let memoryCachedQuotations: QuotationWithServices[] = []
let memoryCacheTimestamp = 0
let isLoadingQuotations = false

// ✅ LOCALSTORAGE HELPERS (persistent across browser restarts)
const STORAGE_KEY = 'quotations-cache'
const STORAGE_TIMESTAMP_KEY = 'quotations-cache-timestamp'

const loadFromLocalStorage = (userId: string): { quotations: QuotationWithServices[]; timestamp: number } | null => {
	try {
		const cached = localStorage.getItem(`${STORAGE_KEY}-${userId}`)
		const timestamp = localStorage.getItem(`${STORAGE_TIMESTAMP_KEY}-${userId}`)
		
		if (cached && timestamp) {
			return {
				quotations: JSON.parse(cached) as QuotationWithServices[],
				timestamp: parseInt(timestamp, 10)
			}
		}
	} catch (error: unknown) {
		// Gate logging by environment
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.error('Error reading quotations from localStorage:', error)
		}
	}
	return null
}

const saveToLocalStorage = (userId: string, quotations: QuotationWithServices[], timestamp: number) => {
	try {
		localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(quotations))
		localStorage.setItem(`${STORAGE_TIMESTAMP_KEY}-${userId}`, timestamp.toString())
	} catch (error: unknown) {
		// Gate logging by environment
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.error('Error saving quotations to localStorage:', error)
		}
	}
}

export function useQuotationsCache(userId: string | undefined): UseQuotationsCacheReturn {
	const [quotations, setQuotations] = useState<QuotationWithServices[]>(() => {
		if (!userId) return []
		
		// Try localStorage first, then memory cache
		const stored = loadFromLocalStorage(userId)
		if (stored) {
			memoryCachedQuotations = stored.quotations
			memoryCacheTimestamp = stored.timestamp
			return stored.quotations
		}
		return memoryCachedQuotations || []
	})
	
	const [isLoading, setIsLoading] = useState(true)
	
	const loadQuotations = useCallback(async (forceRefresh = false) => {
		if (!userId) {
			setIsLoading(false)
			return
		}

		const now = Date.now()
		
		// STALE-WHILE-REVALIDATE PATTERN
		if (!forceRefresh) {
			// Check memory cache first (fastest)
			if (now - memoryCacheTimestamp < MEMORY_CACHE_DURATION) {
				const age = Math.floor((now - memoryCacheTimestamp) / 1000)
				// Gate logging by environment
				if (process.env.NODE_ENV === 'development') {
					// eslint-disable-next-line no-console
					console.log(`✅ MEMORY CACHE HIT [Quotations] - Instant load (Age: ${age}s)`)
				}
				setQuotations(memoryCachedQuotations)
				setIsLoading(false)
				return
			}
			
			// Check localStorage (persistent)
			const stored = loadFromLocalStorage(userId)
			if (stored && now - stored.timestamp < LOCALSTORAGE_MAX_AGE) {
				const age = Math.floor((now - stored.timestamp) / 1000)
				// Gate logging by environment
				if (process.env.NODE_ENV === 'development') {
					// eslint-disable-next-line no-console
					console.log(`📦 LOCALSTORAGE HIT [Quotations] - Showing stale data (Age: ${age}s) while revalidating...`)
				}
				
				// Show cached data immediately
				setQuotations(stored.quotations)
				memoryCachedQuotations = stored.quotations
				memoryCacheTimestamp = stored.timestamp
				setIsLoading(false)
				
				// Continue to fetch fresh data in background (don't return!)
			}
		}
		
		// Prevent duplicate simultaneous loads
		if (isLoadingQuotations) {
			// Gate logging by environment
			if (process.env.NODE_ENV === 'development') {
				// eslint-disable-next-line no-console
				console.log(`⏳ QUOTATIONS: Already loading, skipping duplicate request`)
			}
			return
		}
		
		const age = memoryCacheTimestamp > 0 ? Math.floor((now - memoryCacheTimestamp) / 1000) : 0
		// Gate logging by environment
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.log(`🔄 FETCHING FRESH DATA [Quotations] from API (Previous age: ${age}s)`)
		}
		isLoadingQuotations = true
		
		// Only show loading spinner if we don't have ANY cached data
		if (memoryCachedQuotations.length === 0) {
			setIsLoading(true)
		}
		
		try {
			const quotationsData = await getAllQuotations(userId)
			const freshTimestamp = Date.now()
			
			// Update all caches
			memoryCachedQuotations = quotationsData as QuotationWithServices[]
			memoryCacheTimestamp = freshTimestamp
			saveToLocalStorage(userId, quotationsData as QuotationWithServices[], freshTimestamp)
			
			// Update component state
			setQuotations(quotationsData as QuotationWithServices[])
			// Gate logging by environment
			if (process.env.NODE_ENV === 'development') {
				// eslint-disable-next-line no-console
				console.log(`✅ FRESH DATA LOADED [Quotations] and cached (Memory + localStorage)`)
			}
		} catch (error: unknown) {
			// Gate logging by environment
			if (process.env.NODE_ENV === 'development') {
				// eslint-disable-next-line no-console
				console.error("Error loading quotations:", error)
			}
			// If we have cached data, keep showing it (graceful degradation)
		} finally {
			setIsLoading(false)
			isLoadingQuotations = false
		}
	}, [userId])

	const onRefresh = useCallback(async () => {
		// Gate logging by environment
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.log(`QUOTATIONS: Force refresh requested`)
		}
		await loadQuotations(true)
	}, [loadQuotations])

	const invalidateCache = useCallback(() => {
		// Gate logging by environment
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.log(`🔄 QUOTATIONS: Cache invalidated (Memory + localStorage)`)
		}
		memoryCachedQuotations = []
		memoryCacheTimestamp = 0
		if (userId) {
			try {
				localStorage.removeItem(`${STORAGE_KEY}-${userId}`)
				localStorage.removeItem(`${STORAGE_TIMESTAMP_KEY}-${userId}`)
			} catch (error: unknown) {
				// Gate logging by environment
				if (process.env.NODE_ENV === 'development') {
					// eslint-disable-next-line no-console
					console.error('Error clearing quotations from localStorage:', error)
				}
			}
		}
	}, [userId])

	useEffect(() => {
		loadQuotations()
	}, [loadQuotations])

	return {
		quotations,
		isLoading,
		onRefresh,
		invalidateCache
	}
}


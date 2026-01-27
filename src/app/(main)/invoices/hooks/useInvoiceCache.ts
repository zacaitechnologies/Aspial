"use client"

import { useState, useEffect, useCallback } from "react"
import { getInvoiceById, getInvoiceFullById } from "../action"
import type { InvoiceWithQuotation } from "../types"
import type { Prisma } from "@prisma/client"

type InvoiceData = Prisma.InvoiceGetPayload<{
	include: {
		quotation: {
			include: {
				services: {
					include: {
						service: true
					}
				}
				project: true
				createdBy: true
				Client: true
				customServices: {
					include: {
						createdBy: {
							select: {
								firstName: true
								lastName: true
								email: true
							}
						}
						reviewedBy: {
							select: {
								firstName: true
								lastName: true
								email: true
							}
						}
					}
				}
			}
		}
		createdBy: true
	}
}>

interface UseInvoiceCacheReturn {
	invoice: InvoiceData | InvoiceWithQuotation | null
	isLoading: boolean
	onRefresh: () => Promise<void>
	invalidateCache: () => void
}

interface UseInvoiceCacheOptions {
	fetchFullData?: boolean // If true, fetches full data including custom services with complete details
}

const MEMORY_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for active session
const LOCALSTORAGE_MAX_AGE = 30 * 60 * 1000 // 30 minutes max for localStorage

// ✅ MODULE-LEVEL MEMORY CACHE (fast access during session) - per invoice
const memoryInvoiceCache: { [key: string]: {
	invoice: InvoiceData | InvoiceWithQuotation
	timestamp: number
}} = {}
const loadingStates: { [key: string]: boolean } = {}

// ✅ LOCALSTORAGE HELPERS (persistent across browser restarts)
const getStorageKey = (cacheKey: string) => `invoice-cache-${cacheKey}`

const loadFromLocalStorage = (cacheKey: string) => {
	try {
		const stored = localStorage.getItem(getStorageKey(cacheKey))
		if (stored) {
			return JSON.parse(stored)
		}
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Error reading invoice from localStorage:', error)
		}
	}
	return null
}

const saveToLocalStorage = (cacheKey: string, data: { invoice: InvoiceData | InvoiceWithQuotation; timestamp: number }) => {
	try {
		localStorage.setItem(getStorageKey(cacheKey), JSON.stringify(data))
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Error saving invoice to localStorage:', error)
		}
	}
}

export function useInvoiceCache(
	invoiceId: string | undefined,
	options: UseInvoiceCacheOptions = {}
): UseInvoiceCacheReturn {
	const { fetchFullData = false } = options
	const cacheKey = `${invoiceId}${fetchFullData ? '-full' : ''}`
	
	const [invoice, setInvoice] = useState<InvoiceData | InvoiceWithQuotation | null>(() => {
		if (!invoiceId) return null
		// Only access memory cache during SSR, localStorage will be checked after mount
		return memoryInvoiceCache[cacheKey]?.invoice || null
	})
	
	// Only show loading if we don't have cached data
	const [isLoading, setIsLoading] = useState<boolean>(() => {
		if (!invoiceId) return false
		// During SSR, assume loading if no memory cache
		return !memoryInvoiceCache[cacheKey]
	})
	
	// Check localStorage after component mounts (client-side only)
	useEffect(() => {
		if (!invoiceId) return
		
		// Try localStorage first, then memory cache
		const stored = loadFromLocalStorage(cacheKey)
		if (stored) {
			memoryInvoiceCache[cacheKey] = stored
			setInvoice(stored.invoice)
			setIsLoading(false)
		} else if (memoryInvoiceCache[cacheKey]) {
			// We have memory cache, no need to show loading
			setIsLoading(false)
		}
	}, [invoiceId, cacheKey])
	
	const loadInvoice = useCallback(async (forceRefresh = false) => {
		if (!invoiceId) {
			setIsLoading(false)
			return
		}

		const now = Date.now()
		
		// STALE-WHILE-REVALIDATE PATTERN
		if (!forceRefresh) {
			// Check memory cache first (fastest)
			const memCached = memoryInvoiceCache[cacheKey]
			if (memCached && now - memCached.timestamp < MEMORY_CACHE_DURATION) {
				if (process.env.NODE_ENV === 'development') {
					console.log(`✅ MEMORY CACHE HIT [Invoice ${invoiceId}] - Instant load (Age: ${Math.floor((now - memCached.timestamp) / 1000)}s)`)
				}
				setInvoice(memCached.invoice)
				setIsLoading(false)
				return
			}
			
			// Check localStorage (persistent)
			const stored = loadFromLocalStorage(cacheKey)
			if (stored && now - stored.timestamp < LOCALSTORAGE_MAX_AGE) {
				const age = Math.floor((now - stored.timestamp) / 1000)
				console.log(`📦 LOCALSTORAGE HIT [Invoice ${invoiceId}] - Showing stale data (Age: ${age}s) while revalidating...`)
				
				// Show cached data immediately
				setInvoice(stored.invoice)
				memoryInvoiceCache[cacheKey] = stored
				setIsLoading(false)
				
				// Continue to fetch fresh data in background (don't return!)
			}
		}
		
		// Prevent duplicate simultaneous loads
		if (loadingStates[cacheKey]) {
			if (process.env.NODE_ENV === 'development') {
				console.log(`⏳ INVOICE [${invoiceId}]: Already loading, skipping duplicate request`)
			}
			return
		}
		
		const age = memoryInvoiceCache[cacheKey] ? Math.floor((now - memoryInvoiceCache[cacheKey].timestamp) / 1000) : 0
		if (process.env.NODE_ENV === 'development') {
			console.log(`🔄 FETCHING FRESH DATA [Invoice ${invoiceId}] from API (Previous age: ${age}s)`)
		}
		loadingStates[cacheKey] = true
		
		// Only show loading spinner if we don't have ANY cached data
		if (!memoryInvoiceCache[cacheKey]) {
			setIsLoading(true)
		}
		
		try {
			const invoiceData = fetchFullData 
				? await getInvoiceFullById(invoiceId)
				: await getInvoiceById(invoiceId)
				
			if (invoiceData) {
				const freshTimestamp = Date.now()
				const cacheData = {
					invoice: invoiceData,
					timestamp: freshTimestamp
				}
				
				// Update all caches
				memoryInvoiceCache[cacheKey] = cacheData as typeof memoryInvoiceCache[string]
				saveToLocalStorage(cacheKey, cacheData as any)
				
				// Update component state
				setInvoice(invoiceData as any)
				if (process.env.NODE_ENV === 'development') {
					console.log(`✅ FRESH DATA LOADED [Invoice ${invoiceId}] and cached (Memory + localStorage)`)
				}
			}
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error loading invoice:", error)
			}
			// If we have cached data, keep showing it (graceful degradation)
		} finally {
			setIsLoading(false)
			loadingStates[cacheKey] = false
		}
	}, [invoiceId, cacheKey, fetchFullData])

	const onRefresh = useCallback(async () => {
		if (process.env.NODE_ENV === 'development') {
			console.log(`INVOICE [${invoiceId}]: Force refresh requested`)
		}
		await loadInvoice(true)
	}, [loadInvoice, invoiceId])

	const invalidateCache = useCallback(() => {
		if (process.env.NODE_ENV === 'development') {
			console.log(`🔄 INVOICE [${invoiceId}]: Cache invalidated (Memory + localStorage)`)
		}
		delete memoryInvoiceCache[cacheKey]
		try {
			localStorage.removeItem(getStorageKey(cacheKey))
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Error clearing invoice from localStorage:', error)
			}
		}
	}, [invoiceId, cacheKey])

	useEffect(() => {
		loadInvoice()
	}, [loadInvoice])

	return {
		invoice,
		isLoading,
		onRefresh,
		invalidateCache
	}
}


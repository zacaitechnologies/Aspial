'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePaginatedDataOptions<T, F = any> {
	fetchFn: (page: number, pageSize: number, filters: F) => Promise<{
		data: T[]
		total: number
		page: number
		pageSize: number
		totalPages: number
	}>
	initialPage?: number
	initialPageSize?: number
	filters?: F
	cacheTime?: number
}

interface UsePaginatedDataReturn<T> {
	data: T[]
	isLoading: boolean
	page: number
	pageSize: number
	total: number
	totalPages: number
	goToPage: (page: number) => void
	setPageSize: (size: number) => void
	refresh: () => Promise<void>
	invalidateCache: () => void
}

interface CacheEntry<T> {
	data: T[]
	total: number
	totalPages: number
	timestamp: number
}

const CACHE_DURATION = 3 * 60 * 1000 // 3 minutes

/**
 * Generic hook for paginated data with caching
 * Features:
 * - Optimistic page switching (instant UI update)
 * - Smart caching per page
 * - Loading states within content
 */
export function usePaginatedData<T, F = any>({
	fetchFn,
	initialPage = 1,
	initialPageSize = 10,
	filters,
	cacheTime = CACHE_DURATION,
}: UsePaginatedDataOptions<T, F>): UsePaginatedDataReturn<T> {
	const [data, setData] = useState<T[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [page, setPage] = useState(initialPage)
	const [pageSize, setPageSizeState] = useState(initialPageSize)
	const [total, setTotal] = useState(0)
	const [totalPages, setTotalPages] = useState(0)

	const cacheRef = useRef(new Map<string, CacheEntry<T>>())
	const loadingRef = useRef(false)

	const getCacheKey = useCallback(
		(p: number, ps: number, f: F) => {
			return `${p}_${ps}_${JSON.stringify(f)}`
		},
		[]
	)

	// Silent prefetch - doesn't update UI state, only caches data
	const prefetchPage = useCallback(
		async (targetPage: number, targetPageSize: number) => {
			const cacheKey = getCacheKey(targetPage, targetPageSize, filters as F)
			const now = Date.now()

			// Check if already cached and fresh
			const cached = cacheRef.current.get(cacheKey)
			if (cached && now - cached.timestamp < cacheTime) {
				return // Already have fresh data
			}

			// Silently fetch and cache (don't update UI state)
			try {
				const result = await fetchFn(targetPage, targetPageSize, filters as F)
				cacheRef.current.set(cacheKey, {
					data: result.data,
					total: result.total,
					totalPages: result.totalPages,
					timestamp: now,
				})
			} catch (error) {
				// Silent fail for prefetch
				console.debug('Prefetch failed:', error)
			}
		},
		[fetchFn, filters, cacheTime, getCacheKey]
	)

	const loadData = useCallback(
		async (targetPage: number, targetPageSize: number, forceRefresh = false) => {
			const cacheKey = getCacheKey(targetPage, targetPageSize, filters as F)
			const now = Date.now()

			// Check cache first
			const cached = cacheRef.current.get(cacheKey)
			if (!forceRefresh && cached && now - cached.timestamp < cacheTime) {
				console.log(`✅ CACHE HIT - Page ${targetPage}`)
				setData(cached.data)
				setTotal(cached.total)
				setTotalPages(cached.totalPages)
				setIsLoading(false)
				return
			}

			// Prevent duplicate requests
			if (loadingRef.current) {
				return
			}

			console.log(`❌ CACHE MISS - Loading page ${targetPage}`)
			loadingRef.current = true
			setIsLoading(true)

			try {
				const result = await fetchFn(targetPage, targetPageSize, filters as F)

				// Update cache
				cacheRef.current.set(cacheKey, {
					data: result.data,
					total: result.total,
					totalPages: result.totalPages,
					timestamp: now,
				})

				// Update state
				setData(result.data)
				setTotal(result.total)
				setTotalPages(result.totalPages)
			} catch (error) {
				console.error('Error loading data:', error)
			} finally {
				setIsLoading(false)
				loadingRef.current = false
			}
		},
		[fetchFn, filters, cacheTime, getCacheKey]
	)

	const goToPage = useCallback(
		(newPage: number) => {
			// Optimistic page update - change page immediately (this updates the UI instantly)
			setPage(newPage)
			
			// Check cache first for instant UI update
			const cacheKey = getCacheKey(newPage, pageSize, filters as F)
			const cached = cacheRef.current.get(cacheKey)
			const now = Date.now()
			
			if (cached && now - cached.timestamp < cacheTime) {
				// We have fresh cached data - show it immediately, no loading, no fetch
				setData(cached.data)
				setTotal(cached.total)
				setTotalPages(cached.totalPages)
				setIsLoading(false)
				
				// Prefetch adjacent pages in background for faster future navigation
				if (newPage > 1) {
					prefetchPage(newPage - 1, pageSize)
				}
				if (newPage < totalPages) {
					prefetchPage(newPage + 1, pageSize)
				}
				
				return
			}
			
			// No cache or stale cache - fetch data
			loadData(newPage, pageSize)
		},
		[loadData, pageSize, getCacheKey, filters, cacheTime, totalPages, prefetchPage]
	)

	const setPageSize = useCallback(
		(newSize: number) => {
			setPageSizeState(newSize)
			setPage(1) // Reset to first page
			loadData(1, newSize)
		},
		[loadData]
	)

	const refresh = useCallback(async () => {
		await loadData(page, pageSize, true)
	}, [loadData, page, pageSize])

	const invalidateCache = useCallback(() => {
		console.log('🔄 Cache invalidated')
		cacheRef.current.clear()
	}, [])

	// Initial load
	useEffect(() => {
		loadData(initialPage, initialPageSize)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []) // Only run on mount
	
	// Reload when filters or pageSize change (but not when page changes - that's handled by goToPage)
	useEffect(() => {
		// Reset to page 1 when filters change
		setPage(1)
		loadData(1, pageSize, true) // Force refresh when filters change
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(filters), pageSize])

	return {
		data,
		isLoading,
		page,
		pageSize,
		total,
		totalPages,
		goToPage,
		setPageSize,
		refresh,
		invalidateCache,
	}
}


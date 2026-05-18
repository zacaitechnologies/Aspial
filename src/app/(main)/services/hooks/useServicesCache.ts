"use client"

import { useState, useEffect, useCallback } from "react"
import { getServicesPaginated } from "../action"
import { HiddenFilter, Service } from "../types"

interface UseServicesPaginatedReturn {
  services: Service[]
  isLoading: boolean
  page: number
  pageSize: number
  total: number
  totalPages: number
  onRefresh: () => Promise<void>
  goToPage: (page: number) => void
  setPageSize: (size: number) => void
  invalidateCache: () => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

interface CacheEntry {
  data: Service[]
  total: number
  totalPages: number
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
let isCurrentlyLoading = false

export function useServicesPaginated(
  initialPage: number = 1,
  initialPageSize: number = 12,
  searchQuery?: string,
  hiddenFilter: HiddenFilter = "visible"
): UseServicesPaginatedReturn {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const loadServices = useCallback(
    async (targetPage: number, targetPageSize: number, forceRefresh = false) => {
      const cacheKey = `${targetPage}_${targetPageSize}_${searchQuery || ''}_${hiddenFilter}`
      const now = Date.now()

      // Check cache
      const cached = cache.get(cacheKey)
      if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
        setServices(cached.data)
        setTotal(cached.total)
        setTotalPages(cached.totalPages)
        setIsLoading(false)
        return
      }

      if (isCurrentlyLoading) {
        return
      }

      isCurrentlyLoading = true
      setIsLoading(true)

      try {
        const result = await getServicesPaginated(targetPage, targetPageSize, {
          searchQuery,
          hiddenFilter,
        })

        // Update cache
        cache.set(cacheKey, {
          data: result.data,
          total: result.total,
          totalPages: result.totalPages,
          timestamp: now,
        })

        setServices(result.data)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      } catch (error) {
        console.error('Error loading services:', error)
      } finally {
        setIsLoading(false)
        isCurrentlyLoading = false
      }
    },
    [searchQuery, hiddenFilter]
  )

  const goToPage = useCallback(
    (newPage: number) => {
      setPage(newPage)
      loadServices(newPage, pageSize)
    },
    [loadServices, pageSize]
  )

  const setPageSize = useCallback(
    (newSize: number) => {
      setPageSizeState(newSize)
      setPage(1)
      loadServices(1, newSize)
    },
    [loadServices]
  )

  const onRefresh = useCallback(async () => {
    await loadServices(page, pageSize, true)
  }, [loadServices, page, pageSize])

  const invalidateCache = useCallback(() => {
    cache.clear()
  }, [])

  useEffect(() => {
    loadServices(page, pageSize)
  }, [loadServices, page, pageSize])

  return {
    services,
    isLoading,
    page,
    pageSize,
    total,
    totalPages,
    onRefresh,
    goToPage,
    setPageSize,
    invalidateCache,
  }
}

// Keep the old hook for backward compatibility
export function useServicesCache(hiddenFilter: HiddenFilter = "visible") {
  const result = useServicesPaginated(1, 1000, undefined, hiddenFilter) // Large page size for "all"
  return {
    services: result.services,
    isLoading: result.isLoading,
    onRefresh: result.onRefresh,
    invalidateCache: result.invalidateCache,
  }
}

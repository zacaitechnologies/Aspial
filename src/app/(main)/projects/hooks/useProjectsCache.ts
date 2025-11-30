"use client"

import { useState, useEffect, useCallback } from "react"
import { getProjectsPaginated } from "../action"
import { ProjectWithQuotation } from "../types"

interface UseProjectsPaginatedReturn {
  projects: ProjectWithQuotation[]
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

const CACHE_DURATION = 10 * 1000 // 10 seconds cache - reduced for real-time updates

// Cache structure: Map<cacheKey, {data, timestamp}>
interface CacheEntry {
  data: any
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
let isCurrentlyLoading: boolean = false

export function useProjectsPaginated(
  userId: string | undefined,
  initialPage: number = 1,
  initialPageSize: number = 10,
  searchQuery?: string,
  statusFilter?: string
): UseProjectsPaginatedReturn {
  const [projects, setProjects] = useState<ProjectWithQuotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  const loadProjects = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    const cacheKey = `${userId}_${page}_${pageSize}_${searchQuery || ''}_${statusFilter || 'all'}`
    const now = Date.now()
    
    // Check if cache is still valid
    const cachedEntry = cache.get(cacheKey)
    if (!forceRefresh && cachedEntry && now - cachedEntry.timestamp < CACHE_DURATION) {
      console.log("✅ PROJECTS CACHE HIT - Page " + page)
      setProjects(cachedEntry.data.projects)
      setTotal(cachedEntry.data.total)
      setTotalPages(cachedEntry.data.totalPages)
      setIsLoading(false)
      return
    }
    
    // Prevent duplicate simultaneous loads
    if (isCurrentlyLoading) {
      console.log("⏳ PROJECTS: Already loading, skipping duplicate request")
      return
    }
    
    console.log("❌ PROJECTS CACHE MISS - Loading page " + page)
    isCurrentlyLoading = true
    setIsLoading(true)
    try {
      const result = await getProjectsPaginated(
        userId,
        page,
        pageSize,
        searchQuery,
        statusFilter
      )
      
      // Update cache
      cache.set(cacheKey, {
        data: result,
        timestamp: now
      })
      
      // Update component state
      setProjects(result.projects as any)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (error) {
      console.error("Error loading projects:", error)
    } finally {
      setIsLoading(false)
      isCurrentlyLoading = false
    }
  }, [userId, page, pageSize, searchQuery, statusFilter])

  const onRefresh = useCallback(async () => {
    console.log("PROJECTS: Force refresh requested")
    await loadProjects(true)
  }, [loadProjects])

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size)
    setPage(1) // Reset to first page when changing page size
  }, [])

  const invalidateCache = useCallback(() => {
    console.log("🔄 PROJECTS: Cache invalidated")
    cache.clear()
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    projects,
    isLoading,
    page,
    pageSize,
    total,
    totalPages,
    onRefresh,
    goToPage,
    setPageSize: handleSetPageSize,
    invalidateCache
  }
}


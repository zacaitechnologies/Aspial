"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getAllProjectsOptimized } from "../action"
import { ProjectWithQuotation } from "../types"

interface UseProjectsCacheReturn {
  projects: ProjectWithQuotation[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  invalidateCache: () => void
}

const CACHE_DURATION = 3 * 60 * 1000 // 3 minutes cache

// ✅ MODULE-LEVEL CACHE (persists across component unmounts)
let cachedProjects: ProjectWithQuotation[] = []
let cacheTimestamp: number = 0
let isCurrentlyLoading: boolean = false

export function useProjectsCache(userId: string | undefined): UseProjectsCacheReturn {
  const [projects, setProjects] = useState<ProjectWithQuotation[]>(cachedProjects)
  const [isLoading, setIsLoading] = useState(true)
  
  const loadProjects = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    const now = Date.now()
    
    // Check if cache is still valid
    if (!forceRefresh && now - cacheTimestamp < CACHE_DURATION) {
      console.log("✅ PROJECTS CACHE HIT - Skipping API call (Age: " + Math.floor((now - cacheTimestamp) / 1000) + "s)")
      setProjects(cachedProjects)
      setIsLoading(false)
      return
    }
    
    // Prevent duplicate simultaneous loads (React Strict Mode)
    if (isCurrentlyLoading) {
      console.log("⏳ PROJECTS: Already loading, skipping duplicate request")
      return
    }
    
    console.log("❌ PROJECTS CACHE MISS - Loading from API (Cache age: " + Math.floor((now - cacheTimestamp) / 1000) + "s)")
    isCurrentlyLoading = true
    setIsLoading(true)
    try {
      const loadedProjects = await getAllProjectsOptimized(userId)
      // Update module-level cache
      cachedProjects = loadedProjects as any
      cacheTimestamp = now
      // Update component state
      setProjects(cachedProjects)
    } catch (error) {
      console.error("Error loading projects:", error)
    } finally {
      setIsLoading(false)
      isCurrentlyLoading = false
    }
  }, [userId])

  const onRefresh = useCallback(async () => {
    console.log("PROJECTS: Force refresh requested")
    await loadProjects(true)
  }, [loadProjects])

  const invalidateCache = useCallback(() => {
    console.log("🔄 PROJECTS: Cache invalidated")
    cacheTimestamp = 0
    cachedProjects = []
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    projects,
    isLoading,
    onRefresh,
    invalidateCache
  }
}


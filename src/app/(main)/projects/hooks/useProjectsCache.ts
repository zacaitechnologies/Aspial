"use client"

import { useState, useEffect, useCallback } from "react"
import { getAllProjectsOptimized } from "../action"
import { ProjectWithQuotation } from "../types"

interface UseProjectsCacheReturn {
  projects: ProjectWithQuotation[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  invalidateCache: () => void
}

const MEMORY_CACHE_DURATION = 3 * 60 * 1000 // 3 minutes for active session
const LOCALSTORAGE_MAX_AGE = 30 * 60 * 1000 // 30 minutes max for localStorage
const STORAGE_KEY = 'projects-cache'
const STORAGE_TIMESTAMP_KEY = 'projects-cache-timestamp'

// ✅ MODULE-LEVEL MEMORY CACHE (fast access during session)
let memoryCachedProjects: ProjectWithQuotation[] = []
let memoryCacheTimestamp: number = 0
let isCurrentlyLoading: boolean = false

// ✅ LOCALSTORAGE HELPERS (persistent across browser restarts)
const loadFromLocalStorage = () => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY)
    
    if (cached && timestamp) {
      return {
        projects: JSON.parse(cached) as ProjectWithQuotation[],
        timestamp: parseInt(timestamp)
      }
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error)
  }
  return null
}

const saveToLocalStorage = (projects: ProjectWithQuotation[], timestamp: number) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, timestamp.toString())
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

export function useProjectsCache(userId: string | undefined): UseProjectsCacheReturn {
  const [projects, setProjects] = useState<ProjectWithQuotation[]>(() => {
    // Initialize with localStorage if available
    const stored = loadFromLocalStorage()
    if (stored && stored.projects.length > 0) {
      memoryCachedProjects = stored.projects
      memoryCacheTimestamp = stored.timestamp
      return stored.projects
    }
    return memoryCachedProjects
  })
  const [isLoading, setIsLoading] = useState(true)
  
  const loadProjects = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    const now = Date.now()
    
    // STALE-WHILE-REVALIDATE PATTERN
    if (!forceRefresh) {
      // Check memory cache first (fastest)
      if (now - memoryCacheTimestamp < MEMORY_CACHE_DURATION) {
        console.log("✅ MEMORY CACHE HIT - Instant load (Age: " + Math.floor((now - memoryCacheTimestamp) / 1000) + "s)")
        setProjects(memoryCachedProjects)
        setIsLoading(false)
        return
      }
      
      // Check localStorage (persistent)
      const stored = loadFromLocalStorage()
      if (stored && now - stored.timestamp < LOCALSTORAGE_MAX_AGE) {
        const age = Math.floor((now - stored.timestamp) / 1000)
        console.log("📦 LOCALSTORAGE HIT - Showing stale data (Age: " + age + "s) while revalidating...")
        
        // Show cached data immediately
        setProjects(stored.projects)
        memoryCachedProjects = stored.projects
        memoryCacheTimestamp = stored.timestamp
        setIsLoading(false)
        
        // Continue to fetch fresh data in background (don't return!)
      }
    }
    
    // Prevent duplicate simultaneous loads
    if (isCurrentlyLoading) {
      console.log("⏳ PROJECTS: Already loading, skipping duplicate request")
      return
    }
    
    const age = memoryCacheTimestamp > 0 ? Math.floor((now - memoryCacheTimestamp) / 1000) : 0
    console.log("🔄 FETCHING FRESH DATA from API (Previous age: " + age + "s)")
    isCurrentlyLoading = true
    
    // Only show loading spinner if we don't have ANY cached data
    if (projects.length === 0) {
      setIsLoading(true)
    }
    
    try {
      const loadedProjects = await getAllProjectsOptimized(userId)
      const freshTimestamp = Date.now()
      
      // Update all caches
      memoryCachedProjects = loadedProjects as any
      memoryCacheTimestamp = freshTimestamp
      saveToLocalStorage(memoryCachedProjects, freshTimestamp)
      
      // Update component state
      setProjects(memoryCachedProjects)
      console.log("✅ FRESH DATA LOADED and cached (Memory + localStorage)")
    } catch (error) {
      console.error("Error loading projects:", error)
      // If we have cached data, keep showing it (graceful degradation)
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
    console.log("🔄 PROJECTS: Cache invalidated (Memory + localStorage)")
    memoryCacheTimestamp = 0
    memoryCachedProjects = []
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY)
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
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


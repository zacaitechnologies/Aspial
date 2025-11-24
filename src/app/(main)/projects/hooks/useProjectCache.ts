"use client"

import { useState, useEffect, useCallback } from "react"
import { getProjectById } from "../action"

interface UseProjectCacheReturn {
  project: any | null
  collaborators: any[]
  taskStats: any | null
  userPermission: any | null
  isLoading: boolean
  onRefresh: () => Promise<void>
  invalidateCache: () => void
}

const MEMORY_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for active session
const LOCALSTORAGE_MAX_AGE = 30 * 60 * 1000 // 30 minutes max for localStorage

// ✅ MODULE-LEVEL MEMORY CACHE (fast access during session) - per project
const memoryProjectCache: { [key: string]: {
  project: any
  collaborators: any[]
  taskStats: any
  userPermission: any
  timestamp: number
}} = {}
const loadingStates: { [key: string]: boolean } = {}

// ✅ LOCALSTORAGE HELPERS (persistent across browser restarts)
const getStorageKey = (cacheKey: string) => `project-cache-${cacheKey}`

const loadFromLocalStorage = (cacheKey: string) => {
  try {
    const stored = localStorage.getItem(getStorageKey(cacheKey))
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error reading project from localStorage:', error)
  }
  return null
}

const saveToLocalStorage = (cacheKey: string, data: any) => {
  try {
    localStorage.setItem(getStorageKey(cacheKey), JSON.stringify(data))
  } catch (error) {
    console.error('Error saving project to localStorage:', error)
  }
}

export function useProjectCache(userId: string | undefined, projectId: string | undefined): UseProjectCacheReturn {
  const cacheKey = `${userId}-${projectId}`
  
  const [project, setProject] = useState<any | null>(() => {
    // Try localStorage first, then memory cache
    const stored = loadFromLocalStorage(cacheKey)
    if (stored) {
      memoryProjectCache[cacheKey] = stored
      return stored.project
    }
    return memoryProjectCache[cacheKey]?.project || null
  })
  
  const [collaborators, setCollaborators] = useState<any[]>(() => {
    const stored = loadFromLocalStorage(cacheKey)
    if (stored) return stored.collaborators
    return memoryProjectCache[cacheKey]?.collaborators || []
  })
  
  const [taskStats, setTaskStats] = useState<any | null>(() => {
    const stored = loadFromLocalStorage(cacheKey)
    if (stored) return stored.taskStats
    return memoryProjectCache[cacheKey]?.taskStats || null
  })
  
  const [userPermission, setUserPermission] = useState<any | null>(() => {
    const stored = loadFromLocalStorage(cacheKey)
    if (stored) return stored.userPermission
    return memoryProjectCache[cacheKey]?.userPermission || null
  })
  
  const [isLoading, setIsLoading] = useState(true)
  
  const loadProject = useCallback(async (forceRefresh = false) => {
    if (!userId || !projectId) {
      setIsLoading(false)
      return
    }

    const now = Date.now()
    
    // STALE-WHILE-REVALIDATE PATTERN
    if (!forceRefresh) {
      // Check memory cache first (fastest)
      const memCached = memoryProjectCache[cacheKey]
      if (memCached && now - memCached.timestamp < MEMORY_CACHE_DURATION) {
        console.log(`✅ MEMORY CACHE HIT [${projectId}] - Instant load (Age: ${Math.floor((now - memCached.timestamp) / 1000)}s)`)
        setProject(memCached.project)
        setCollaborators(memCached.collaborators)
        setTaskStats(memCached.taskStats)
        setUserPermission(memCached.userPermission)
        setIsLoading(false)
        return
      }
      
      // Check localStorage (persistent)
      const stored = loadFromLocalStorage(cacheKey)
      if (stored && now - stored.timestamp < LOCALSTORAGE_MAX_AGE) {
        const age = Math.floor((now - stored.timestamp) / 1000)
        console.log(`📦 LOCALSTORAGE HIT [${projectId}] - Showing stale data (Age: ${age}s) while revalidating...`)
        
        // Show cached data immediately
        setProject(stored.project)
        setCollaborators(stored.collaborators)
        setTaskStats(stored.taskStats)
        setUserPermission(stored.userPermission)
        memoryProjectCache[cacheKey] = stored
        setIsLoading(false)
        
        // Continue to fetch fresh data in background (don't return!)
      }
    }
    
    // Prevent duplicate simultaneous loads
    if (loadingStates[cacheKey]) {
      console.log(`⏳ PROJECT [${projectId}]: Already loading, skipping duplicate request`)
      return
    }
    
    const age = memoryProjectCache[cacheKey] ? Math.floor((now - memoryProjectCache[cacheKey].timestamp) / 1000) : 0
    console.log(`🔄 FETCHING FRESH DATA [${projectId}] from API (Previous age: ${age}s)`)
    loadingStates[cacheKey] = true
    
    // Only show loading spinner if we don't have ANY cached data
    if (!project) {
      setIsLoading(true)
    }
    
    try {
      const projectData = await getProjectById(userId, projectId)
      if (projectData) {
        const freshTimestamp = Date.now()
        const cacheData = {
          project: projectData.project,
          collaborators: projectData.collaborators,
          taskStats: projectData.taskStats,
          userPermission: projectData.userPermission,
          timestamp: freshTimestamp
        }
        
        // Update all caches
        memoryProjectCache[cacheKey] = cacheData
        saveToLocalStorage(cacheKey, cacheData)
        
        // Update component state
        setProject(projectData.project)
        setCollaborators(projectData.collaborators)
        setTaskStats(projectData.taskStats)
        setUserPermission(projectData.userPermission)
        console.log(`✅ FRESH DATA LOADED [${projectId}] and cached (Memory + localStorage)`)
      }
    } catch (error) {
      console.error("Error loading project:", error)
      // If we have cached data, keep showing it (graceful degradation)
    } finally {
      setIsLoading(false)
      loadingStates[cacheKey] = false
    }
  }, [userId, projectId, cacheKey])

  const onRefresh = useCallback(async () => {
    console.log(`PROJECT [${projectId}]: Force refresh requested`)
    await loadProject(true)
  }, [loadProject, projectId])

  const invalidateCache = useCallback(() => {
    console.log(`🔄 PROJECT [${projectId}]: Cache invalidated (Memory + localStorage)`)
    delete memoryProjectCache[cacheKey]
    try {
      localStorage.removeItem(getStorageKey(cacheKey))
    } catch (error) {
      console.error('Error clearing project from localStorage:', error)
    }
  }, [projectId, cacheKey])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  return {
    project,
    collaborators,
    taskStats,
    userPermission,
    isLoading,
    onRefresh,
    invalidateCache
  }
}


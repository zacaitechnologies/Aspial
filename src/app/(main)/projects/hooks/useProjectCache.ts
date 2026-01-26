"use client"

import { useState, useEffect, useCallback } from "react"
import { getProjectById } from "../action"
import { ProjectWithDetails } from "../types"

interface UseProjectCacheReturn {
  project: ProjectWithDetails['project'] | null
  collaborators: ProjectWithDetails['collaborators']
  taskStats: ProjectWithDetails['taskStats'] | null
  complaints: ProjectWithDetails['complaints']
  userPermission: ProjectWithDetails['userPermission']
  isLoading: boolean
  onRefresh: () => Promise<void>
  invalidateCache: () => void
}

const MEMORY_CACHE_DURATION = 30 * 1000 // 30 seconds for active session (permissions can change)
const LOCALSTORAGE_MAX_AGE = 2 * 60 * 1000 // 2 minutes max for localStorage (reduced for permission freshness)

// ✅ MODULE-LEVEL MEMORY CACHE (fast access during session) - per project
const memoryProjectCache: { [key: string]: {
  project: ProjectWithDetails['project']
  collaborators: ProjectWithDetails['collaborators']
  taskStats: ProjectWithDetails['taskStats']
  complaints: ProjectWithDetails['complaints']
  userPermission: ProjectWithDetails['userPermission']
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

const saveToLocalStorage = (cacheKey: string, data: { project: ProjectWithDetails['project']; collaborators: ProjectWithDetails['collaborators']; taskStats: ProjectWithDetails['taskStats']; complaints: ProjectWithDetails['complaints']; userPermission: ProjectWithDetails['userPermission']; timestamp: number }) => {
  try {
    localStorage.setItem(getStorageKey(cacheKey), JSON.stringify(data))
  } catch (error) {
    console.error('Error saving project to localStorage:', error)
  }
}

// Track if this is the first mount for each cache key (to force fresh data on login)
const mountedKeys: { [key: string]: boolean } = {}

/**
 * Clear all project caches (memory + localStorage) and reset mount tracking
 * Should be called on logout to ensure fresh data on next login
 */
export function clearAllProjectCaches() {
  // Clear memory caches
  Object.keys(memoryProjectCache).forEach(key => delete memoryProjectCache[key])
  Object.keys(loadingStates).forEach(key => delete loadingStates[key])
  Object.keys(mountedKeys).forEach(key => delete mountedKeys[key])
  
  // Clear localStorage project caches
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('project-cache-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`🧹 Cleared ${keysToRemove.length} project caches and reset mount tracking`)
  } catch (error) {
    console.error('Error clearing project caches from localStorage:', error)
  }
}

export function useProjectCache(userId: string | undefined, projectId: string | undefined): UseProjectCacheReturn {
  const cacheKey = `${userId}-${projectId}`
  
  // Check if this is the first time mounting with this cache key
  const isFirstMount = !mountedKeys[cacheKey]
  
  const [project, setProject] = useState<ProjectWithDetails['project'] | null>(() => {
    // Try localStorage first, then memory cache
    const stored = loadFromLocalStorage(cacheKey)
    if (stored) {
      memoryProjectCache[cacheKey] = stored
      return stored.project
    }
    return memoryProjectCache[cacheKey]?.project || null
  })
  
  const [collaborators, setCollaborators] = useState<ProjectWithDetails['collaborators']>(() => {
    const stored = loadFromLocalStorage(cacheKey)
    if (stored) return stored.collaborators
    return memoryProjectCache[cacheKey]?.collaborators || []
  })
  
  const [taskStats, setTaskStats] = useState<ProjectWithDetails['taskStats'] | null>(() => {
    const stored = loadFromLocalStorage(cacheKey)
    if (stored) return stored.taskStats
    return memoryProjectCache[cacheKey]?.taskStats || null
  })
  
  const [userPermission, setUserPermission] = useState<ProjectWithDetails['userPermission']>(() => {
    const stored = loadFromLocalStorage(cacheKey)
    if (stored) return stored.userPermission
    return memoryProjectCache[cacheKey]?.userPermission || null
  })
  
  const [complaints, setComplaints] = useState<ProjectWithDetails['complaints']>(() => {
    const stored = loadFromLocalStorage(cacheKey)
    if (stored) return stored.complaints
    return memoryProjectCache[cacheKey]?.complaints || []
  })
  
  const [isLoading, setIsLoading] = useState(true)
  
  const loadProject = useCallback(async (forceRefresh = false) => {
    if (!userId || !projectId) {
      setIsLoading(false)
      return
    }

    const now = Date.now()
    
    // Check if this is first mount - always fetch fresh data on first mount
    // This ensures fresh permissions when user logs in or switches accounts
    const needsFreshData = isFirstMount || forceRefresh
    
    // Mark as mounted after first load
    if (isFirstMount) {
      mountedKeys[cacheKey] = true
      console.log(`🔑 FIRST MOUNT [${projectId}]: Will fetch fresh permissions`)
    }
    
    // STALE-WHILE-REVALIDATE PATTERN (but bypass cache on first mount)
    if (!needsFreshData) {
      // Check memory cache first (fastest)
      const memCached = memoryProjectCache[cacheKey]
      if (memCached && now - memCached.timestamp < MEMORY_CACHE_DURATION) {
        console.log(`✅ MEMORY CACHE HIT [${projectId}] - Instant load (Age: ${Math.floor((now - memCached.timestamp) / 1000)}s)`)
        setProject(memCached.project)
        setCollaborators(memCached.collaborators)
        setTaskStats(memCached.taskStats)
        setComplaints(memCached.complaints)
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
          complaints: projectData.complaints,
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
        setComplaints(projectData.complaints)
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
    complaints,
    userPermission,
    isLoading,
    onRefresh,
    invalidateCache
  }
}


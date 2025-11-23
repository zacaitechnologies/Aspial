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

const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes cache

// ✅ MODULE-LEVEL CACHE (persists across component unmounts) - per project
const projectCache: { [key: string]: {
  project: any
  collaborators: any[]
  taskStats: any
  userPermission: any
  timestamp: number
}} = {}
const loadingStates: { [key: string]: boolean } = {}

export function useProjectCache(userId: string | undefined, projectId: string | undefined): UseProjectCacheReturn {
  const cacheKey = `${userId}-${projectId}`
  const cached = projectCache[cacheKey]
  
  const [project, setProject] = useState<any | null>(cached?.project || null)
  const [collaborators, setCollaborators] = useState<any[]>(cached?.collaborators || [])
  const [taskStats, setTaskStats] = useState<any | null>(cached?.taskStats || null)
  const [userPermission, setUserPermission] = useState<any | null>(cached?.userPermission || null)
  const [isLoading, setIsLoading] = useState(true)
  
  const loadProject = useCallback(async (forceRefresh = false) => {
    if (!userId || !projectId) {
      setIsLoading(false)
      return
    }

    const now = Date.now()
    const cached = projectCache[cacheKey]
    
    // Check if cache is still valid
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ PROJECT [${projectId}] CACHE HIT - Skipping API call (Age: ${Math.floor((now - cached.timestamp) / 1000)}s)`)
      setProject(cached.project)
      setCollaborators(cached.collaborators)
      setTaskStats(cached.taskStats)
      setUserPermission(cached.userPermission)
      setIsLoading(false)
      return
    }
    
    // Prevent duplicate simultaneous loads (React Strict Mode)
    if (loadingStates[cacheKey]) {
      console.log(`⏳ PROJECT [${projectId}]: Already loading, skipping duplicate request`)
      return
    }
    
    console.log(`❌ PROJECT [${projectId}] CACHE MISS - Loading from API`)
    loadingStates[cacheKey] = true
    setIsLoading(true)
    try {
      const projectData = await getProjectById(userId, projectId)
      if (projectData) {
        // Update module-level cache
        projectCache[cacheKey] = {
          project: projectData.project,
          collaborators: projectData.collaborators,
          taskStats: projectData.taskStats,
          userPermission: projectData.userPermission,
          timestamp: now
        }
        // Update component state
        setProject(projectData.project)
        setCollaborators(projectData.collaborators)
        setTaskStats(projectData.taskStats)
        setUserPermission(projectData.userPermission)
      }
    } catch (error) {
      console.error("Error loading project:", error)
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
    console.log(`🔄 PROJECT [${projectId}]: Cache invalidated`)
    delete projectCache[cacheKey]
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


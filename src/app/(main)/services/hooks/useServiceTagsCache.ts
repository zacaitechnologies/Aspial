"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getAllServiceTags } from "../service-actions"
import { ServiceTag } from "../types"

interface UseServiceTagsCacheReturn {
  tags: ServiceTag[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  invalidateCache: () => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

export function useServiceTagsCache(): UseServiceTagsCacheReturn {
  const [tags, setTags] = useState<ServiceTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const cacheTimestamp = useRef<number>(0)
  

  const loadTags = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    
    // Check if cache is still valid
    if (!forceRefresh && now - cacheTimestamp.current < CACHE_DURATION && tags.length > 0) {
      console.log("SERVICE TAGS CACHE HIT ✅ Skipping API call")
      return
    }
    console.log("SERVICE TAGS CACHE MISS ❌ Loading from API")
    setIsLoading(true)
    try {
      const loadedTags = await getAllServiceTags()
      setTags(loadedTags)
      cacheTimestamp.current = now
    } catch (error) {
      console.error("Error loading service tags:", error)
    } finally {
      setIsLoading(false)
    }
  }, [tags.length])

  const onRefresh = useCallback(async () => {
    await loadTags(true)
  }, [loadTags])

  const invalidateCache = useCallback(() => {
    cacheTimestamp.current = 0
  }, [])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  return {
    tags,
    isLoading,
    onRefresh,
    invalidateCache
  }
}

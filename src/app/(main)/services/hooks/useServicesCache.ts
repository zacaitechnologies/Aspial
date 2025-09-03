"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getAllServices } from "../service-actions"
import { Service } from "../types"

interface UseServicesCacheReturn {
  services: Service[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  invalidateCache: () => void
}

export function useServicesCache(): UseServicesCacheReturn {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const cacheTimestamp = useRef<number>(0)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

  const loadServices = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    
    // Check if cache is still valid
    if (!forceRefresh && now - cacheTimestamp.current < CACHE_DURATION && services.length > 0) {
      return
    }

    setIsLoading(true)
    try {
      const loadedServices = await getAllServices()
      setServices(loadedServices)
      cacheTimestamp.current = now
    } catch (error) {
      console.error("Error loading services:", error)
    } finally {
      setIsLoading(false)
    }
  }, [services.length])

  const onRefresh = useCallback(async () => {
    await loadServices(true)
  }, [loadServices])

  const invalidateCache = useCallback(() => {
    cacheTimestamp.current = 0
  }, [])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  return {
    services,
    isLoading,
    onRefresh,
    invalidateCache
  }
}

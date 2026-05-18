"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useServicesCache } from "../hooks/useServicesCache"
import { useServiceTagsCache } from "../hooks/useServiceTagsCache"
import { HiddenFilter } from "../types"

interface ServicesCacheContextType {
  services: ReturnType<typeof useServicesCache>
  serviceTags: ReturnType<typeof useServiceTagsCache>
  invalidateAllCaches: () => void
  hiddenFilter: HiddenFilter
  setHiddenFilter: (filter: HiddenFilter) => void
}

const ServicesCacheContext = createContext<ServicesCacheContextType | undefined>(undefined)

export function ServicesCacheProvider({ children }: { children: ReactNode }) {
  const [hiddenFilter, setHiddenFilter] = useState<HiddenFilter>("visible")
  const services = useServicesCache(hiddenFilter)
  const serviceTags = useServiceTagsCache()

  const invalidateAllCaches = () => {
    services.invalidateCache()
    serviceTags.invalidateCache()
  }

  return (
    <ServicesCacheContext.Provider value={{ services, serviceTags, invalidateAllCaches, hiddenFilter, setHiddenFilter }}>
      {children}
    </ServicesCacheContext.Provider>
  )
}

export function useServicesCacheContext() {
  const context = useContext(ServicesCacheContext)
  if (context === undefined) {
    throw new Error("useServicesCacheContext must be used within a ServicesCacheProvider")
  }
  return context
}

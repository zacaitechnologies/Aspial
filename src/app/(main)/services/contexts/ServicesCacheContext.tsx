"use client"

import { createContext, useContext, ReactNode } from "react"
import { useServicesCache } from "../hooks/useServicesCache"
import { useServiceTagsCache } from "../hooks/useServiceTagsCache"

interface ServicesCacheContextType {
  services: ReturnType<typeof useServicesCache>
  serviceTags: ReturnType<typeof useServiceTagsCache>
  invalidateAllCaches: () => void
}

const ServicesCacheContext = createContext<ServicesCacheContextType | undefined>(undefined)

export function ServicesCacheProvider({ children }: { children: ReactNode }) {
  const services = useServicesCache()
  const serviceTags = useServiceTagsCache()

  const invalidateAllCaches = () => {
    services.invalidateCache()
    serviceTags.invalidateCache()
  }

  return (
    <ServicesCacheContext.Provider value={{ services, serviceTags, invalidateAllCaches }}>
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

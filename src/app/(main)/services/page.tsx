"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ServiceTagManager from "./components/ServiceTagManager"
import ServicesList from "./components/ServicesList"
import { ServicesCacheProvider, useServicesCacheContext } from "./contexts/ServicesCacheContext"

function ServicesPageContent() {
  const [activeTab, setActiveTab] = useState("services")
  const { services, serviceTags, invalidateAllCaches } = useServicesCacheContext()

  // Invalidate cache when switching tabs to ensure fresh data if needed
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Invalidate cache when switching tabs to ensure fresh data if needed
    if (value === "services") {
      services.invalidateCache()
    } else if (value === "tags") {
      serviceTags.invalidateCache()
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-white shadow-sm border">
            <TabsTrigger 
              value="services" 
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200"
            >
              Services
            </TabsTrigger>
            <TabsTrigger 
              value="tags" 
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200"
            >
              Service Tags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-0">
            <ServicesList 
              services={services.services} 
              isLoading={services.isLoading} 
              onRefresh={services.onRefresh} 
            />
          </TabsContent>

          <TabsContent value="tags" className="space-y-0">
            <ServiceTagManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function ServicesPage() {
  return (
    <ServicesCacheProvider>
      <ServicesPageContent />
    </ServicesCacheProvider>
  )
}

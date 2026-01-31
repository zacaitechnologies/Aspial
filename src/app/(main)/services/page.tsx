"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ServiceTagManager from "./components/ServiceTagManager"
import ServicesList from "./components/ServicesList"
import { ServicesCacheProvider, useServicesCacheContext } from "./contexts/ServicesCacheContext"
import { checkIsOperationUser, checkIsAdmin } from "../actions/admin-actions"
import { useSession } from "../contexts/SessionProvider"
import AccessDenied from "../components/AccessDenied"

function ServicesPageContent() {
  const { enhancedUser } = useSession()
  const [activeTab, setActiveTab] = useState("services")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOperationUser, setIsOperationUser] = useState<boolean | null>(null)
  const { services, serviceTags, invalidateAllCaches } = useServicesCacheContext()

  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!enhancedUser?.id) return
      const [adminStatus, operationUserStatus] = await Promise.all([
        checkIsAdmin(enhancedUser.id),
        checkIsOperationUser(enhancedUser.id)
      ])
      setIsAdmin(adminStatus)
      setIsOperationUser(operationUserStatus)
    }
    fetchAdminStatus()
  }, [enhancedUser?.id])

  if (isOperationUser === null) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20 text-primary">
          <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-lg font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  if (isOperationUser) {
    return <AccessDenied />
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          <div className="relative">
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} bg-transparent border-primary border-1 transition-all duration-300 ease-in-out`}>
              <TabsTrigger 
                value="services" 
                className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
              >
                Services
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger 
                  value="tags" 
                  className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
                >
                  Service Tags
                </TabsTrigger>
              )}
            </TabsList>
            {/* Sliding indicator */}
            <div 
              className={`absolute top-1 h-[calc(100%-8px)] bg-secondary transition-all duration-300 ease-in-out rounded-md z-0 ${
                isAdmin 
                  ? (activeTab === "services" ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+2px)] w-[calc(50%-4px)]")
                  : "left-1 w-[calc(100%-8px)]"
              }`}
            />
          </div>

          <TabsContent value="services" className="space-y-0">
            <ServicesList 
              services={services.services} 
              isLoading={services.isLoading} 
              onRefresh={services.onRefresh}
              isAdmin={isAdmin}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="tags" className="space-y-0">
              <ServiceTagManager />
            </TabsContent>
          )}
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

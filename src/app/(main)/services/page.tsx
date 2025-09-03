"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ServiceTagManager from "./components/ServiceTagManager"
import ServicesList from "./components/ServicesList"

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState("services")

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Services Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="tags">Service Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          <ServicesList />
        </TabsContent>

        <TabsContent value="tags" className="space-y-6">
          <ServiceTagManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}

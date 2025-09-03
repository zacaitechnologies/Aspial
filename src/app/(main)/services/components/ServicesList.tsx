"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, Trash2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getAllServices, deleteService, searchServices } from "../service-actions"
import { Service } from "../types"
import ServiceForm from "./ServiceForm"

export default function ServicesList() {
  const [services, setServices] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [editingService, setEditingService] = useState<Service | null>(null)

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      const loadedServices = await getAllServices()
      setServices(loadedServices)
    } catch (error) {
      console.error("Error loading services:", error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadServices()
      return
    }

    try {
      const searchResults = await searchServices(searchQuery)
      setServices(searchResults)
    } catch (error) {
      console.error("Error searching services:", error)
    }
  }

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm("Are you sure you want to delete this service?")) return
    
    try {
      await deleteService(serviceId)
      await loadServices()
    } catch (error) {
      console.error("Error deleting service:", error)
    }
  }

  const handleEditService = (service: Service) => {
    setEditingService(service)
  }

  const handleServiceSuccess = () => {
    setEditingService(null)
    loadServices()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Services</h2>
        <ServiceForm onSuccess={handleServiceSuccess} />
      </div>

      {/* Search Bar */}
      <div className="flex space-x-2">
        <Input
          placeholder="Search services by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
        {searchQuery && (
          <Button variant="outline" onClick={() => {
            setSearchQuery("")
            loadServices()
          }}>
            Clear
          </Button>
        )}
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{service.name}</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditService(service)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteService(service.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">
                ${service.basePrice.toFixed(2)}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 line-clamp-2">
                {service.description}
              </p>
              
              {/* Tags */}
              {service.tags && service.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {service.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      style={{ backgroundColor: tag.color, color: 'white' }}
                      className="px-2 py-1 text-xs"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-4">
                Created: {new Date(service.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? "No services found matching your search." : "No services created yet."}
        </div>
      )}

      {/* Edit Service Dialog */}
      {editingService && (
        <ServiceForm
          service={editingService}
          onSuccess={handleServiceSuccess}
          trigger={<div style={{ display: 'none' }} />}
        />
      )}
    </div>
  )
}

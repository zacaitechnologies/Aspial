"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { StudioForm } from "@/app/(main)/components/equipment-bookings/studio-form"
import { EquipmentForm } from "@/app/(main)/components/equipment-bookings/equipment-form"
import { deleteStudio, deleteEquipment } from "@/app/(main)/equipment-bookings/actions"
import { Edit, Trash2, Plus } from "lucide-react"

interface Studio {
  id: number
  name: string
  location: string
  capacity: number
  description: string | null
  isActive: boolean
  equipment: Equipment[]
}

interface Equipment {
  id: number
  name: string
  type: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  condition: string
  isAvailable: boolean
  studioId: number | null
  studio?: { name: string } | null
}

interface AdminDashboardProps {
  studios: Studio[]
  equipment: Equipment[]
}

export function BookingDashboard({ studios, equipment }: AdminDashboardProps) {
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [showStudioForm, setShowStudioForm] = useState(false)
  const [showEquipmentForm, setShowEquipmentForm] = useState(false)

  const handleDeleteStudio = async (id: number) => {
    if (confirm("Are you sure you want to delete this studio?")) {
      await deleteStudio(id)
    }
  }

  const handleDeleteEquipment = async (id: number) => {
    if (confirm("Are you sure you want to delete this equipment?")) {
      await deleteEquipment(id)
    }
  }

  return (
    <Tabs defaultValue="studios" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="studios">Studios</TabsTrigger>
        <TabsTrigger value="equipment">Equipment</TabsTrigger>
      </TabsList>

      <TabsContent value="studios" className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Studios</h2>
          <Dialog open={showStudioForm} onOpenChange={setShowStudioForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Studio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>
                {selectedStudio ? "Edit Studio" : "Add New Studio"}
              </DialogTitle>
              <StudioForm
                studio={selectedStudio || undefined}
                onClose={() => {
                  setShowStudioForm(false)
                  setSelectedStudio(null)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Studios ({studios.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studios.map((studio) => (
                  <TableRow key={studio.id}>
                    <TableCell className="font-medium">{studio.name}</TableCell>
                    <TableCell>{studio.location}</TableCell>
                    <TableCell>{studio.capacity}</TableCell>
                    <TableCell>{studio.equipment.length} items</TableCell>
                    <TableCell>
                      <Badge variant={studio.isActive ? "default" : "secondary"}>
                        {studio.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedStudio(studio)
                            setShowStudioForm(true)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteStudio(studio.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="equipment" className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Equipment</h2>
          <Dialog open={showEquipmentForm} onOpenChange={setShowEquipmentForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>
                {selectedEquipment ? "Edit Equipment" : "Add New Equipment"}
              </DialogTitle>
              <EquipmentForm
                equipment={selectedEquipment || undefined}
                studios={studios.map((s) => ({ id: s.id, name: s.name }))}
                onClose={() => {
                  setShowEquipmentForm(false)
                  setSelectedEquipment(null)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Equipment ({equipment.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Brand/Model</TableHead>
                  <TableHead>Studio</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>
                      {item.brand && item.model ? `${item.brand} ${item.model}` : item.brand || item.model || "-"}
                    </TableCell>
                    <TableCell>{item.studio?.name || "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.condition === "Excellent"
                            ? "default"
                            : item.condition === "Good"
                              ? "secondary"
                              : item.condition === "Fair"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {item.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isAvailable ? "default" : "secondary"}>
                        {item.isAvailable ? "Available" : "In Use"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEquipment(item)
                            setShowEquipmentForm(true)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteEquipment(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

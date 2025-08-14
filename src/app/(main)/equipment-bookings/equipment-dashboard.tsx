"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { StudioForm } from "@/app/(main)/equipment-bookings/components/studio-form"
import { EquipmentForm } from "@/app/(main)/equipment-bookings/components/equipment-form"
import { BookingForm } from "@/app/(main)/equipment-bookings/components/booking-form"
import { StudioBookingForm } from "@/app/(main)/equipment-bookings/components/studio-booking-form"
import { deleteStudio, deleteEquipment, cancelBooking, cancelStudioBooking } from "@/app/(main)/equipment-bookings/actions"
import { Edit, Trash2, Plus, Calendar, MapPin, Users, Package, Clock } from "lucide-react"

interface Booking {
  id: number
  bookedBy: string
  startDate: string
  endDate: string
  purpose: string | null
  status: string
}

interface StudioBooking {
  id: number
  bookedBy: string
  startDate: string
  endDate: string
  purpose: string | null
  attendees: number
  status: string
}

interface Studio {
  id: number
  name: string
  location: string
  capacity: number
  description: string | null
  isActive: boolean
  bookings?: StudioBooking[]
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
  bookings?: Booking[]
}

interface AdminDashboardProps {
  studios: Studio[]
  equipment: Equipment[]
}

export function BookingDashboard({ studios, equipment }: AdminDashboardProps) {
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [selectedBookingEquipment, setSelectedBookingEquipment] = useState<Equipment | null>(null)
  const [selectedBookingStudio, setSelectedBookingStudio] = useState<Studio | null>(null)
  const [showStudioForm, setShowStudioForm] = useState(false)
  const [showEquipmentForm, setShowEquipmentForm] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [showStudioBookingForm, setShowStudioBookingForm] = useState(false)

  const handleRefresh = () => {
    window.location.reload()
  }

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

  const handleCancelBooking = async (bookingId: number) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      await cancelBooking(bookingId)
    }
  }

  const handleCancelStudioBooking = async (bookingId: number) => {
    if (confirm("Are you sure you want to cancel this studio booking?")) {
      await cancelStudioBooking(bookingId)
    }
  }

  return (
    <Tabs defaultValue="studios" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-card-background text-white">
                 <TabsTrigger 
           value="studios" 
           className="text-white data-[state=active]:bg-white data-[state=active]:text-card-background"
         >
           Studios
         </TabsTrigger>
         <TabsTrigger 
           value="equipment" 
           className="text-white data-[state=active]:bg-white data-[state=active]:text-card-background"
         >
           Equipment
         </TabsTrigger>
      </TabsList>

      <TabsContent value="studios" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-card-background">Studios ({studios.length})</h2>
          <Dialog open={showStudioForm} onOpenChange={setShowStudioForm}>
            <DialogTrigger asChild>
              <Button className="bg-card-background">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studios.map((studio) => (
            <Card key={studio.id} className="hover:shadow-lg transition-shadow gap-0">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{studio.name}</CardTitle>
                  <Badge variant={studio.isActive ? "default" : "secondary"}>
                    {studio.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm ">
                    <MapPin className="w-4 h-4 mr-2" />
                    {studio.location}
                  </div>
                  <div className="flex items-center text-sm ">
                    <Users className="w-4 h-4 mr-2" />
                    Capacity: {studio.capacity}
                  </div>
                  <div className="flex items-center text-sm ">
                    <Package className="w-4 h-4 mr-2" />
                    Location: {studio.location}
                  </div>
                </div>

                {studio.description && (
                  <p className="text-sm  line-clamp-2">{studio.description}</p>
                )}

                {studio.bookings && studio.bookings.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Current Bookings:</div>
                    {studio.bookings.map((booking) => (
                      <div key={booking.id} className="bg-muted p-2 rounded text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{booking.bookedBy}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelStudioBooking(booking.id)}
                            className="h-6 px-2 text-xs flex-shrink-0"
                          >
                            Cancel
                          </Button>
                        </div>
                        <div className="flex items-center ">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(booking.startDate).toLocaleDateString()} -{" "}
                          {new Date(booking.endDate).toLocaleDateString()}
                        </div>
                        {booking.purpose && <div className="">{booking.purpose}</div>}
                        <div className="">Attendees: {booking.attendees}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setSelectedBookingStudio(studio)
                      setShowStudioBookingForm(true)
                    }}
                    className="flex-1 min-w-0"
                  >
                    <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Book</span>
                  </Button>
                                     <Button
                     size="sm"
                     variant="outline"
                     onClick={() => {
                       setSelectedStudio(studio)
                       setShowStudioForm(true)
                     }}
                     className="flex-1 min-w-0 text-black"
                   >
                     <Edit className="w-4 h-4 mr-1 flex-shrink-0" />
                     <span className="truncate">Edit</span>
                   </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => handleDeleteStudio(studio.id)}
                    className="flex-1 min-w-0"
                  >
                    <Trash2 className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="equipment" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-card-background">Equipment ({equipment.length})</h2>
          <Dialog open={showEquipmentForm} onOpenChange={setShowEquipmentForm}>
            <DialogTrigger asChild>
              <Button className="bg-card-background">
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
                onClose={() => {
                  setShowEquipmentForm(false)
                  setSelectedEquipment(null)
                }}
                onSuccess={handleRefresh}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow gap-0">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <div className="flex gap-1">
                    <Badge variant={item.isAvailable ? "default" : "secondary"}>
                      {item.isAvailable ? "Available" : "In Use"}
                    </Badge>
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
                  </div>
                </div>
              </CardHeader>
                             <CardContent className="space-y-4">
                 <div className="space-y-2">
                   <div className="flex items-center text-sm ">
                     <Package className="w-4 h-4 mr-2" />
                     Type: {item.type}
                   </div>
                   {(item.brand || item.model) && (
                     <div className="flex items-center text-sm ">
                       <Package className="w-4 h-4 mr-2" />
                       Brand/Model: {item.brand && item.model ? `${item.brand} ${item.model}` : item.brand || item.model}
                     </div>
                   )}
                   {item.serialNumber && (
                     <div className="flex items-center text-sm ">
                       <Package className="w-4 h-4 mr-2" />
                       Serial: {item.serialNumber}
                     </div>
                   )}
                 </div>

                {item.bookings && item.bookings.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Current Bookings:</div>
                    {item.bookings.map((booking) => (
                      <div key={booking.id} className="bg-muted p-2 rounded text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{booking.bookedBy}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelBooking(booking.id)}
                            className="h-6 px-2 text-xs flex-shrink-0"
                          >
                            Cancel
                          </Button>
                        </div>
                        <div className="flex items-center ">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(booking.startDate).toLocaleDateString()} -{" "}
                          {new Date(booking.endDate).toLocaleDateString()}
                        </div>
                        {booking.purpose && <div className="">{booking.purpose}</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!item.isAvailable}
                    onClick={() => {
                      setSelectedBookingEquipment(item)
                      setShowBookingForm(true)
                    }}
                    className="flex-1 min-w-0"
                  >
                    <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Book</span>
                  </Button>
                                     <Button
                     size="sm"
                     variant="outline"
                     onClick={() => {
                       setSelectedEquipment(item)
                       setShowEquipmentForm(true)
                     }}
                     className="flex-1 min-w-0 text-black"
                   >
                     <Edit className="w-4 h-4 mr-1 flex-shrink-0" />
                     <span className="truncate">Edit</span>
                   </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => handleDeleteEquipment(item.id)}
                    className="flex-1 min-w-0"
                  >
                    <Trash2 className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
          <DialogContent>
            <DialogTitle>
              Book Equipment: {selectedBookingEquipment?.name}
            </DialogTitle>
            {selectedBookingEquipment && (
              <BookingForm
                equipment={selectedBookingEquipment}
                onClose={() => {
                  setShowBookingForm(false)
                  setSelectedBookingEquipment(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </TabsContent>

      <Dialog open={showStudioBookingForm} onOpenChange={setShowStudioBookingForm}>
        <DialogContent>
          <DialogTitle>
            Book Studio: {selectedBookingStudio?.name}
          </DialogTitle>
          {selectedBookingStudio && (
            <StudioBookingForm
              studio={selectedBookingStudio}
              onClose={() => {
                setShowStudioBookingForm(false)
                setSelectedBookingStudio(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}

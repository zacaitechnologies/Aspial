"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { StudioForm } from "@/app/(main)/equipment-bookings/components/studio-form"
import { EquipmentForm } from "@/app/(main)/equipment-bookings/components/equipment-form"
import { MultipleBookingForm } from "@/app/(main)/equipment-bookings/components/multiple-booking-form"
import { DatePicker } from "@/app/(main)/equipment-bookings/components/date-picker"
import { BookingList } from "@/app/(main)/equipment-bookings/components/booking-list"
import { deleteStudio, deleteEquipment, cancelBooking, cancelStudioBooking } from "@/app/(main)/equipment-bookings/actions"
import { useSession } from "@/app/(main)/contexts/SessionProvider"
import { Edit, Trash2, Plus, Calendar, MapPin, Users, Package, Clock, User } from "lucide-react"

interface Booking {
  id: number
  bookedBy: string
  startDate: Date
  endDate: Date
  purpose: string | null
  status: string
}

interface StudioBooking {
  id: number
  bookedBy: string
  startDate: Date
  endDate: Date
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
  isAdmin: boolean
}

export function BookingDashboard({ studios, equipment, isAdmin }: AdminDashboardProps) {
  const { enhancedUser } = useSession()
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [selectedBookingEquipment, setSelectedBookingEquipment] = useState<Equipment | null>(null)
  const [selectedBookingStudio, setSelectedBookingStudio] = useState<Studio | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<{ start: Date; end: Date }[]>([])
  const [showStudioForm, setShowStudioForm] = useState(false)
  const [showEquipmentForm, setShowEquipmentForm] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [activeTab, setActiveTab] = useState("booking")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Get user name for filtering bookings
  const userName = enhancedUser.profile 
    ? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim() 
    : enhancedUser.email || 'Unknown User'

  const handleRefresh = () => {
    window.location.reload()
  }

  // Get all user bookings for pagination
  const getAllUserBookings = () => {
    const equipmentBookings = equipment.flatMap(item => 
      item.bookings?.filter(booking => booking.bookedBy === userName).map(booking => ({
        ...booking,
        type: 'equipment' as const,
        itemName: item.name,
        itemType: item.type
      })) || []
    )
    
    const studioBookings = studios.flatMap(studio => 
      studio.bookings?.filter(booking => booking.bookedBy === userName).map(booking => ({
        ...booking,
        type: 'studio' as const,
        itemName: studio.name,
        itemLocation: studio.location
      })) || []
    )
    
    return [...equipmentBookings, ...studioBookings].sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
  }

  const allUserBookings = getAllUserBookings()
  const totalPages = Math.ceil(allUserBookings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBookings = allUserBookings.slice(startIndex, endIndex)

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

  const handleBookEquipment = (equipment: Equipment, slots: { start: Date; end: Date }[]) => {
    setSelectedBookingEquipment(equipment)
    setSelectedSlots(slots)
    setShowBookingForm(true)
  }

  const handleBookStudio = (studio: Studio, slots: { start: Date; end: Date }[]) => {
    setSelectedBookingStudio(studio)
    setSelectedSlots(slots)
    setShowBookingForm(true)
  }

  return (
    <Tabs defaultValue="booking" className="w-full" onValueChange={setActiveTab}>
      <div className="relative">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'} bg-transparent border-primary border-1 transition-all duration-300 ease-in-out`}>
          <TabsTrigger 
            value="booking" 
            className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
          >
            Bookings
          </TabsTrigger>
          <TabsTrigger 
            value="my-bookings" 
            className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
          >
            My Bookings
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger 
                value="studios" 
                className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
              >
                Studios
              </TabsTrigger>
              <TabsTrigger 
                value="equipment" 
                className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
              >
                Equipment
              </TabsTrigger>
            </>
          )}
        </TabsList>
        {/* Sliding indicator */}
        <div 
          className={`absolute top-1 h-[calc(100%-8px)] bg-secondary transition-all duration-300 ease-in-out rounded-md z-0 ${
            isAdmin ? (
              activeTab === "booking" ? "left-1 w-[calc(25%-4px)]" : 
              activeTab === "my-bookings" ? "left-[calc(25%+2px)] w-[calc(25%-4px)]" : 
              activeTab === "studios" ? "left-[calc(50%+2px)] w-[calc(25%-4px)]" : 
              "left-[calc(75%+2px)] w-[calc(25%-4px)]"
            ) : (
              activeTab === "booking" ? "left-1 w-[calc(50%-4px)]" : 
              "left-[calc(50%+2px)] w-[calc(50%-4px)]"
            )
          }`}
        />
      </div>

      <TabsContent value="booking" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Book Equipment & Studios</h2>
          <Button onClick={handleRefresh} variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="space-y-4">
          <div className="max-w-xs">
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>

          <BookingList
            selectedDate={selectedDate}
            equipment={equipment}
            studios={studios}
            onBookEquipment={handleBookEquipment}
            onBookStudio={handleBookStudio}
          />
        </div>
      </TabsContent>

      <TabsContent value="my-bookings" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            My Bookings
          </h2>
          <Button onClick={handleRefresh} variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="space-y-6">
          {/* Bookings List */}
          <div className="space-y-3">
            {currentBookings.map((booking) => (
              <Card key={booking.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {booking.type === 'equipment' ? (
                        <Package className="w-4 h-4" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                      <h4 className="font-semibold">{booking.itemName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {booking.type === 'equipment' ? 'Equipment' : 'Studio'}
                      </Badge>
                    </div>
                    {booking.type === 'equipment' && (
                      <p className="text-sm text-muted-foreground">{booking.itemType}</p>
                    )}
                    {booking.type === 'studio' && (
                      <p className="text-sm text-muted-foreground">{booking.itemLocation}</p>
                    )}
                    <div className="flex items-center text-sm mt-2">
                      <Clock className="w-4 h-4 mr-2" />
                      {new Date(booking.startDate).toLocaleDateString()} {new Date(booking.startDate).toLocaleTimeString()} - {new Date(booking.endDate).toLocaleTimeString()}
                    </div>
                    {booking.type === 'studio' && (
                      <div className="flex items-center text-sm mt-1">
                        <Users className="w-4 h-4 mr-2" />
                        {booking.attendees} attendees
                      </div>
                    )}
                    {booking.purpose && (
                      <p className="text-sm mt-1">{booking.purpose}</p>
                    )}
                  </div>
                  {(() => {
                    const now = new Date()
                    const bookingEndDate = new Date(booking.endDate)
                    const hasPassed = bookingEndDate < now
                    
                    return (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={hasPassed}
                        onClick={() => booking.type === 'equipment' ? handleCancelBooking(booking.id) : handleCancelStudioBooking(booking.id)}
                        title={hasPassed ? "Cannot cancel past bookings" : "Cancel booking"}
                      >
                        {hasPassed ? "Expired" : "Cancel"}
                      </Button>
                    )
                  })()}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}

          {/* Show message if no bookings */}
          {allUserBookings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>You don't have any bookings yet.</p>
              <p className="text-sm">Go to the Bookings tab to make your first booking!</p>
            </div>
          )}

          {/* Show booking count */}
          {allUserBookings.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, allUserBookings.length)} of {allUserBookings.length} bookings
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="studios" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Studios ({studios.length})</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studios.map((studio) => (
            <Card key={studio.id} className="card gap-0">
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



                <div className="flex flex-wrap gap-2 pt-2">
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
          <h2 className="text-2xl font-semibold">Equipment ({equipment.length})</h2>
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
            <Card key={item.id} className="card gap-0">
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



                <div className="flex flex-wrap gap-2 pt-2">
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


      </TabsContent>

              <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
          <DialogContent>
            <DialogTitle>
              Book {selectedBookingStudio ? 'Studio' : 'Equipment'}: {selectedBookingStudio?.name || selectedBookingEquipment?.name}
            </DialogTitle>
            {(selectedBookingStudio || selectedBookingEquipment) && selectedSlots.length > 0 && (
              <MultipleBookingForm
                item={selectedBookingStudio || selectedBookingEquipment!}
                slots={selectedSlots}
                isStudio={!!selectedBookingStudio}
                onClose={() => {
                  setShowBookingForm(false)
                  setSelectedBookingStudio(null)
                  setSelectedBookingEquipment(null)
                  setSelectedSlots([])
                }}
                onSuccess={handleRefresh}
              />
            )}
          </DialogContent>
        </Dialog>
    </Tabs>
  )
}

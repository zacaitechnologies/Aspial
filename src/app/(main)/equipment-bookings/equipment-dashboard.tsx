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
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

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
  
  // Confirmation dialog states
  const [showDeleteStudioDialog, setShowDeleteStudioDialog] = useState(false)
  const [showDeleteEquipmentDialog, setShowDeleteEquipmentDialog] = useState(false)
  const [showCancelBookingDialog, setShowCancelBookingDialog] = useState(false)
  const [showCancelStudioBookingDialog, setShowCancelStudioBookingDialog] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string; type: 'studio' | 'equipment' } | null>(null)
  const [bookingToCancel, setBookingToCancel] = useState<{ id: number; type: 'equipment' | 'studio' } | null>(null)

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

  const handleDeleteStudio = (id: number, name: string) => {
    setItemToDelete({ id, name, type: 'studio' })
    setShowDeleteStudioDialog(true)
  }

  const handleDeleteEquipment = (id: number, name: string) => {
    setItemToDelete({ id, name, type: 'equipment' })
    setShowDeleteEquipmentDialog(true)
  }

  const confirmDeleteStudio = async () => {
    if (itemToDelete && itemToDelete.type === 'studio') {
      await deleteStudio(itemToDelete.id)
      setShowDeleteStudioDialog(false)
      setItemToDelete(null)
    }
  }

  const confirmDeleteEquipment = async () => {
    if (itemToDelete && itemToDelete.type === 'equipment') {
      await deleteEquipment(itemToDelete.id)
      setShowDeleteEquipmentDialog(false)
      setItemToDelete(null)
    }
  }

  const handleCancelBooking = (bookingId: number) => {
    setBookingToCancel({ id: bookingId, type: 'equipment' })
    setShowCancelBookingDialog(true)
  }

  const handleCancelStudioBooking = (bookingId: number) => {
    setBookingToCancel({ id: bookingId, type: 'studio' })
    setShowCancelStudioBookingDialog(true)
  }

  const confirmCancelBooking = async () => {
    if (bookingToCancel && bookingToCancel.type === 'equipment') {
      await cancelBooking(bookingToCancel.id)
      setShowCancelBookingDialog(false)
      setBookingToCancel(null)
    }
  }

  const confirmCancelStudioBooking = async () => {
    if (bookingToCancel && bookingToCancel.type === 'studio') {
      await cancelStudioBooking(bookingToCancel.id)
      setShowCancelStudioBookingDialog(false)
      setBookingToCancel(null)
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
    <Tabs defaultValue="equipment-booking" className="w-full" onValueChange={setActiveTab}>
      <div className="relative">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'} bg-transparent border-primary border-1 transition-all duration-300 ease-in-out`}>
          <TabsTrigger 
            value="equipment-booking" 
            className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
          >
            Equipment Bookings
          </TabsTrigger>
          <TabsTrigger 
            value="studio-booking" 
            className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
          >
            Studio Bookings
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
              activeTab === "equipment-booking" ? "left-1 w-[calc(20%-4px)]" : 
              activeTab === "studio-booking" ? "left-[calc(20%+2px)] w-[calc(20%-4px)]" : 
              activeTab === "my-bookings" ? "left-[calc(40%+2px)] w-[calc(20%-4px)]" : 
              activeTab === "studios" ? "left-[calc(60%+2px)] w-[calc(20%-4px)]" : 
              "left-[calc(80%+2px)] w-[calc(20%-4px)]"
            ) : (
              activeTab === "equipment-booking" ? "left-1 w-[calc(33.33%-4px)]" : 
              activeTab === "studio-booking" ? "left-[calc(33.33%+2px)] w-[calc(33.33%-4px)]" : 
              "left-[calc(66.66%+2px)] w-[calc(33.33%-4px)]"
            )
          }`}
        />
      </div>

      <TabsContent value="equipment-booking" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Book Equipment</h2>
          <Button onClick={handleRefresh} className="text-white" style={{ backgroundColor: "#202F21" }}>
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
            studios={[]}
            onBookEquipment={handleBookEquipment}
            onBookStudio={handleBookStudio}
          />
        </div>
      </TabsContent>

      <TabsContent value="studio-booking" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Book Studios</h2>
          <Button onClick={handleRefresh} className="text-white" style={{ backgroundColor: "#202F21" }}>
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
            equipment={[]}
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
          <Button onClick={handleRefresh} className="text-white" style={{ backgroundColor: "#202F21" }}>
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="space-y-6">
          {/* Bookings Grid */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {currentBookings.map((booking) => {
              const now = new Date()
              const bookingEndDate = new Date(booking.endDate)
              const hasPassed = bookingEndDate < now
              
              return (
                <Card key={booking.id} className="card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {booking.type === 'equipment' ? (
                            <Package className="w-5 h-5" />
                          ) : (
                            <MapPin className="w-5 h-5" />
                          )}
                          {booking.itemName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="secondary"
                            className={booking.type === 'equipment' ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}
                          >
                            {booking.type === 'equipment' ? 'Equipment' : 'Studio'}
                          </Badge>
                          <Badge 
                            variant="secondary"
                            className={hasPassed ? "bg-gray-100 text-gray-800" : "bg-green-100 text-green-800"}
                          >
                            {hasPassed ? 'Expired' : 'Active'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={hasPassed}
                          onClick={() => booking.type === 'equipment' ? handleCancelBooking(booking.id) : handleCancelStudioBooking(booking.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title={hasPassed ? "Cannot cancel past bookings" : "Cancel booking"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {booking.type === 'equipment' && booking.itemType && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Type: {booking.itemType}
                      </p>
                    )}
                    {booking.type === 'studio' && booking.itemLocation && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Location: {booking.itemLocation}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">Start:</span>
                        <span className="ml-2">{new Date(booking.startDate).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">End:</span>
                        <span className="ml-2">{new Date(booking.endDate).toLocaleString()}</span>
                      </div>
                      {booking.type === 'studio' && booking.attendees && (
                        <div className="flex items-center text-sm">
                          <Users className="w-4 h-4 mr-2" />
                          <span className="font-medium">Attendees:</span>
                          <span className="ml-2">{booking.attendees}</span>
                        </div>
                      )}
                    </div>

                    {booking.purpose && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Purpose:</p>
                        <p className="text-sm text-muted-foreground">{booking.purpose}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
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
              <Button className="text-white" style={{ backgroundColor: "#202F21" }}>
                <Plus className="w-5 h-5 mr-2" />
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
                  <div>
                    <CardTitle className="text-lg">{studio.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="secondary"
                        className={studio.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                      >
                        {studio.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        <Users className="w-3 h-3 mr-1" />
                        {studio.capacity}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStudio(studio)
                        setShowStudioForm(true)
                      }}
                      title="Edit Studio"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost"
                      size="sm" 
                      onClick={() => handleDeleteStudio(studio.id, studio.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete Studio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm ">
                    <MapPin className="w-4 h-4 mr-2" />
                    {studio.location}
                  </div>
                </div>

                {studio.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{studio.description}</p>
                )}
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
              <Button className="text-white" style={{ backgroundColor: "#202F21" }}>
                <Plus className="w-5 h-5 mr-2" />
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
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="secondary"
                        className={item.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {item.isAvailable ? "Available" : "Maintenance"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          item.condition === "Excellent"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.condition === "Good"
                              ? "bg-blue-100 text-blue-800"
                              : item.condition === "Fair"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                        }
                      >
                        {item.condition}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedEquipment(item)
                        setShowEquipmentForm(true)
                      }}
                      title="Edit Equipment"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost"
                      size="sm" 
                      onClick={() => handleDeleteEquipment(item.id, item.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete Equipment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Package className="w-4 h-4 mr-2" />
                    Type: {item.type}
                  </div>
                  {(item.brand || item.model) && (
                    <div className="flex items-center text-sm">
                      <Package className="w-4 h-4 mr-2" />
                      Brand/Model: {item.brand && item.model ? `${item.brand} ${item.model}` : item.brand || item.model}
                    </div>
                  )}
                  {item.serialNumber && (
                    <div className="flex items-center text-sm">
                      <Package className="w-4 h-4 mr-2" />
                      Serial: {item.serialNumber}
                    </div>
                  )}
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

        {/* Confirmation Dialogs */}
        <ConfirmationDialog
          isOpen={showDeleteStudioDialog}
          onClose={() => {
            setShowDeleteStudioDialog(false)
            setItemToDelete(null)
          }}
          onConfirm={confirmDeleteStudio}
          title="Delete Studio"
          description={`Are you sure you want to delete "${itemToDelete?.name}"? This action will permanently delete the studio AND ALL ASSOCIATED BOOKINGS. This cannot be undone.`}
          confirmText="Delete Studio"
          cancelText="Cancel"
          variant="danger"
        />

        <ConfirmationDialog
          isOpen={showDeleteEquipmentDialog}
          onClose={() => {
            setShowDeleteEquipmentDialog(false)
            setItemToDelete(null)
          }}
          onConfirm={confirmDeleteEquipment}
          title="Delete Equipment"
          description={`Are you sure you want to delete "${itemToDelete?.name}"? This action will permanently delete the equipment AND ALL ASSOCIATED BOOKINGS. This cannot be undone.`}
          confirmText="Delete Equipment"
          cancelText="Cancel"
          variant="danger"
        />

        <ConfirmationDialog
          isOpen={showCancelBookingDialog}
          onClose={() => {
            setShowCancelBookingDialog(false)
            setBookingToCancel(null)
          }}
          onConfirm={confirmCancelBooking}
          title="Cancel Equipment Booking"
          description="Are you sure you want to cancel this equipment booking? This action cannot be undone."
          confirmText="Cancel Booking"
          cancelText="Keep Booking"
          variant="warning"
        />

        <ConfirmationDialog
          isOpen={showCancelStudioBookingDialog}
          onClose={() => {
            setShowCancelStudioBookingDialog(false)
            setBookingToCancel(null)
          }}
          onConfirm={confirmCancelStudioBooking}
          title="Cancel Studio Booking"
          description="Are you sure you want to cancel this studio booking? This action cannot be undone."
          confirmText="Cancel Booking"
          cancelText="Keep Booking"
          variant="warning"
        />
    </Tabs>
  )
}

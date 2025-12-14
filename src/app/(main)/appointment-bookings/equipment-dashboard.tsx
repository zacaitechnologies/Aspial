"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AppointmentForm } from "@/app/(main)/appointment-bookings/components/appointment-form"
import { AppointmentGrid } from "@/app/(main)/appointment-bookings/components/appointment-grid"
import { DatePicker } from "@/app/(main)/appointment-bookings/components/date-picker"
import { deleteAppointment, cancelAppointmentBooking } from "@/app/(main)/appointment-bookings/actions"
import { APPOINTMENT_TYPES } from "@/app/(main)/calander/constants"
import { useSession } from "@/app/(main)/contexts/SessionProvider"
import { Edit, Trash2, Plus, Calendar, Clock, User, Search, List, Users as UsersIcon } from "lucide-react"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Appointment {
  id: number
  name: string
  location: string | null
  brand: string | null
  description: string | null
  appointmentType: string
  isAvailable: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
  bookings?: AppointmentBooking[]
}

interface AppointmentBooking {
	id: number
	bookedBy: string
	startDate: Date
	endDate: Date
	purpose: string | null
	appointmentType: string
	status: string
	appointmentId: number | null
	attendees: number | null
	appointment?: {
		id: number
		name: string
		location: string | null
		brand: string | null
	} | null
	project?: {
		id: number
		name: string
		clientName: string | null
	} | null
}

interface AdminDashboardProps {
	appointments: Appointment[]
	bookings: AppointmentBooking[]
	isAdmin: boolean
	userProjectIds: number[]
}

export function BookingDashboard({ appointments, bookings, isAdmin, userProjectIds }: AdminDashboardProps) {
  const { enhancedUser } = useSession()
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [activeTab, setActiveTab] = useState("appointment-booking")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string>("all")
  
  // Confirmation dialog states
  const [showDeleteAppointmentDialog, setShowDeleteAppointmentDialog] = useState(false)
  const [showCancelBookingDialog, setShowCancelBookingDialog] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null)
  const [bookingToCancel, setBookingToCancel] = useState<{ id: number } | null>(null)

  // Get user name for filtering bookings
  const userName = enhancedUser?.profile 
    ? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim() 
    : enhancedUser?.email || 'Unknown User'

  const handleRefresh = () => {
    window.location.reload()
  }

  // Filter appointments based on search and filters
  const getFilteredAppointments = () => {
    return appointments.filter(appointment => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = appointment.name.toLowerCase().includes(query)
        const matchesLocation = appointment.location?.toLowerCase().includes(query) || false
        const matchesBrand = appointment.brand?.toLowerCase().includes(query) || false
        const matchesDescription = appointment.description?.toLowerCase().includes(query) || false
        
        if (!matchesName && !matchesLocation && !matchesBrand && !matchesDescription) {
          return false
        }
      }

      // Appointment type filter
      if (selectedAppointmentType !== "all" && appointment.appointmentType !== selectedAppointmentType) {
        return false
      }

      return true
    })
  }

  const filteredAppointments = getFilteredAppointments()

  // Filter states for My Bookings
  const [bookingSearchQuery, setBookingSearchQuery] = useState("")
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string>("all")
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all")

  // Get all user bookings for pagination
  const getAllUserBookings = () => {
    const userBookings = bookings.filter(booking => {
      const isUserBooking = booking.bookedBy === userName
      const isUserProjectBooking = booking.project && 
        userProjectIds.includes(booking.project.id)
      
      return isUserBooking || isUserProjectBooking
    }).map(booking => ({
      ...booking,
      itemName: booking.appointment?.name || 'Appointment',
      itemLocation: booking.appointment?.location,
      itemBrand: booking.appointment?.brand,
      project: booking.project
    }))
    
    return userBookings.sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
  }

  // Filter and sort user bookings
  const getFilteredUserBookings = () => {
    let filtered = getAllUserBookings()

    // Search filter
    if (bookingSearchQuery) {
      const query = bookingSearchQuery.toLowerCase()
      filtered = filtered.filter(booking => {
        const matchesName = booking.itemName?.toLowerCase().includes(query) || false
        const matchesLocation = booking.itemLocation?.toLowerCase().includes(query) || false
        const matchesPurpose = booking.purpose?.toLowerCase().includes(query) || false
        const matchesProject = booking.project?.name.toLowerCase().includes(query) || false
        
        return matchesName || matchesLocation || matchesPurpose || matchesProject
      })
    }

    // Appointment type filter
    if (bookingTypeFilter !== "all") {
      filtered = filtered.filter(booking => booking.appointmentType === bookingTypeFilter)
    }

    // Status filter
    if (bookingStatusFilter !== "all") {
      const now = new Date()
      filtered = filtered.filter(booking => {
        const bookingEndDate = new Date(booking.endDate)
        const hasPassed = bookingEndDate < now
        
        if (bookingStatusFilter === "active") {
          return !hasPassed
        } else if (bookingStatusFilter === "expired") {
          return hasPassed
        }
        return true
      })
    }

    return filtered
  }

  const allUserBookings = getFilteredUserBookings()
  const totalPages = Math.ceil(allUserBookings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBookings = allUserBookings.slice(startIndex, endIndex)

  const handleDeleteAppointment = (id: number, name: string) => {
    setItemToDelete({ id, name })
    setShowDeleteAppointmentDialog(true)
  }

  const confirmDeleteAppointment = async () => {
    if (itemToDelete) {
      await deleteAppointment(itemToDelete.id)
      setShowDeleteAppointmentDialog(false)
      setItemToDelete(null)
      handleRefresh()
    }
  }

  const handleCancelBooking = (bookingId: number) => {
    setBookingToCancel({ id: bookingId })
    setShowCancelBookingDialog(true)
  }

  const confirmCancelBooking = async () => {
    if (bookingToCancel) {
      await cancelAppointmentBooking(bookingToCancel.id)
      setShowCancelBookingDialog(false)
      setBookingToCancel(null)
      handleRefresh()
    }
  }

  return (
    <Tabs defaultValue="appointment-booking" className="w-full" onValueChange={setActiveTab}>
      <div className="relative">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} bg-transparent border-primary border-1 transition-all duration-300 ease-in-out`}>
          <TabsTrigger 
            value="appointment-booking" 
            className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
          >
            Book Appointments
          </TabsTrigger>
          <TabsTrigger 
            value="my-bookings" 
            className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
          >
            My Bookings
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger 
              value="manage-appointments" 
              className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
            >
              Manage Appointments
            </TabsTrigger>
          )}
        </TabsList>
        {/* Sliding indicator */}
        <div 
          className={`absolute top-1 h-[calc(100%-8px)] bg-secondary transition-all duration-300 ease-in-out rounded-md z-0 ${
            isAdmin ? (
              activeTab === "appointment-booking" ? "left-1 w-[calc(33.33%-4px)]" : 
              activeTab === "my-bookings" ? "left-[calc(33.33%+2px)] w-[calc(33.33%-4px)]" : 
              "left-[calc(66.66%+2px)] w-[calc(33.33%-4px)]"
            ) : (
              activeTab === "appointment-booking" ? "left-1 w-[calc(50%-4px)]" : 
              "left-[calc(50%+2px)] w-[calc(50%-4px)]"
            )
          }`}
          style={{ backgroundColor: "#202F21" }}
        />
      </div>

      {/* Book Appointments Tab */}
      <TabsContent value="appointment-booking" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Book Appointments</h2>
          <Button onClick={handleRefresh} className="text-white" style={{ backgroundColor: "#202F21" }}>
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters - Matching Clients Page Design */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: "#898D74" }} />
              <Input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-2"
                style={{ borderColor: "#BDC4A5" }}
              />
            </div>
            <Select value={selectedAppointmentType} onValueChange={setSelectedAppointmentType}>
              <SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
                <List className="w-4 h-4 mr-2" style={{ color: "#898D74" }} />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(APPOINTMENT_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="max-w-xs">
              <DatePicker
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredAppointments.length} of {appointments.length} appointments
            </div>
          </div>

          <AppointmentGrid
            appointments={filteredAppointments}
            selectedDate={selectedDate}
            onBookingComplete={handleRefresh}
          />
        </div>
      </TabsContent>

      {/* My Bookings Tab */}
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

        {/* Filters and Sorting - Matching Clients Page Design */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: "#898D74" }} />
              <Input
                type="text"
                placeholder="Search bookings..."
                value={bookingSearchQuery}
                onChange={(e) => setBookingSearchQuery(e.target.value)}
                className="pl-10 bg-white border-2"
                style={{ borderColor: "#BDC4A5" }}
              />
            </div>
            <Select value={bookingTypeFilter} onValueChange={setBookingTypeFilter}>
              <SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
                <List className="w-4 h-4 mr-2" style={{ color: "#898D74" }} />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(APPOINTMENT_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
              <SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
                <UsersIcon className="w-4 h-4 mr-2" style={{ color: "#898D74" }} />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="expired">Expired Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-6">
          {/* Bookings Grid */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {currentBookings.map((booking) => {
              const now = new Date()
              const bookingEndDate = new Date(booking.endDate)
              const hasPassed = bookingEndDate < now
              const appointmentConfig = APPOINTMENT_TYPES[booking.appointmentType as keyof typeof APPOINTMENT_TYPES] || APPOINTMENT_TYPES.OTHERS
              
              return (
                <Card key={booking.id} className="card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          {booking.itemName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={appointmentConfig.color}>
                            {appointmentConfig.label}
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
                          onClick={() => handleCancelBooking(booking.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title={hasPassed ? "Cannot cancel past bookings" : "Cancel booking"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {booking.itemLocation && (
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
                      {booking.attendees && (
                        <div className="flex items-center text-sm">
                          <User className="w-4 h-4 mr-2" />
                          <span className="font-medium">Attendees:</span>
                          <span className="ml-2">{booking.attendees}</span>
                        </div>
                      )}
                      {booking.project && (
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span className="font-medium">Project:</span>
                          <span className="ml-2">{booking.project.name} {booking.project.clientName ? `(${booking.project.clientName})` : ''}</span>
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
              <p className="text-sm">Go to the Book Appointments tab to make your first booking!</p>
            </div>
          )}

          {/* Show booking count */}
          {allUserBookings.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, allUserBookings.length)} of {allUserBookings.length} booking{allUserBookings.length !== 1 ? 's' : ''}
              {getAllUserBookings().length !== allUserBookings.length && (
                <span> (filtered from {getAllUserBookings().length} total)</span>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      {/* Admin: Manage Appointments Tab */}
      {isAdmin && (
        <TabsContent value="manage-appointments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Manage Appointments ({appointments.length})</h2>
            <Dialog open={showAppointmentForm} onOpenChange={setShowAppointmentForm}>
              <DialogTrigger asChild>
                <Button className="text-white" style={{ backgroundColor: "#202F21" }}>
                  <Plus className="w-5 h-5 mr-2" />
                  Add Appointment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>
                  {selectedAppointment ? "Edit Appointment" : "Add New Appointment"}
                </DialogTitle>
                <AppointmentForm
                  appointment={selectedAppointment || undefined}
                  onClose={() => {
                    setShowAppointmentForm(false)
                    setSelectedAppointment(null)
                  }}
                  onSuccess={handleRefresh}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appointments.map((appointment) => {
              const appointmentConfig = APPOINTMENT_TYPES[appointment.appointmentType as keyof typeof APPOINTMENT_TYPES] || APPOINTMENT_TYPES.OTHERS
              
              return (
                <Card key={appointment.id} className="card gap-0">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{appointment.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="secondary"
                            className={appointment.isAvailable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                          >
                            {appointment.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                          <Badge className={appointmentConfig.color}>
                            {appointmentConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAppointment(appointment)
                            setShowAppointmentForm(true)
                          }}
                          title="Edit Appointment"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm" 
                          onClick={() => handleDeleteAppointment(appointment.id, appointment.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete Appointment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {appointment.location && (
                      <div className="text-sm text-muted-foreground">
                        Location: {appointment.location}
                      </div>
                    )}
                    {appointment.brand && (
                      <div className="text-sm text-muted-foreground">
                        Brand: {appointment.brand}
                      </div>
                    )}
                    {appointment.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{appointment.description}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showDeleteAppointmentDialog}
        onClose={() => {
          setShowDeleteAppointmentDialog(false)
          setItemToDelete(null)
        }}
        onConfirm={confirmDeleteAppointment}
        title="Delete Appointment"
        description={`Are you sure you want to delete "${itemToDelete?.name}"? This action will permanently delete the appointment AND ALL ASSOCIATED BOOKINGS. This cannot be undone.`}
        confirmText="Delete Appointment"
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
        title="Cancel Booking"
        description="Are you sure you want to cancel this booking? This action cannot be undone."
        confirmText="Cancel Booking"
        cancelText="Keep Booking"
        variant="warning"
      />
    </Tabs>
  )
}

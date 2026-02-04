"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AppointmentForm } from "@/app/(main)/appointment-bookings/components/appointment-form"
import { AppointmentGrid } from "@/app/(main)/appointment-bookings/components/appointment-grid"
import AppointmentBookingEmailHistoryDialog from "@/app/(main)/appointment-bookings/components/AppointmentBookingEmailHistoryDialog"
import SendAppointmentReminderDialog from "@/app/(main)/appointment-bookings/components/SendAppointmentReminderDialog"
import EditAppointmentRemindersDialog from "@/app/(main)/appointment-bookings/components/EditAppointmentRemindersDialog"
import BookingDetailsDialog from "@/app/(main)/appointment-bookings/components/BookingDetailsDialog"
import { deleteAppointment, cancelAppointmentBooking } from "@/app/(main)/appointment-bookings/actions"
import { cn } from "@/lib/utils"
import { APPOINTMENT_TYPES } from "@/app/(main)/calander/constants"
import { useSession } from "@/app/(main)/contexts/SessionProvider"
import { Edit, Trash2, Plus, Calendar, Clock, User, Search, List, Users as UsersIcon, Mail, Send, Bell, Info } from "lucide-react"
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

export interface AppointmentBooking {
	id: number
	bookedBy: string
	startDate: Date
	endDate: Date
	purpose: string | null
	appointmentType: string
	status: string
	appointmentId: number | null
	attendees: number | null
	bookingName: string | null
	companyName: string | null
	contactNumber: string | null
	remarks: string | null
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
		Client?: {
			id: string
			name: string
			email: string
			phone: string | null
			company: string | null
		} | null
	} | null
	reminders?: {
		id: number
		offsetMinutes: number
		remindAt: Date
		status: string
	}[]
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
  // Fix hydration: use stable initial date
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Safety checks: ensure arrays are always defined
  const safeAppointments = Array.isArray(appointments) ? appointments : []
  const safeBookings = Array.isArray(bookings) ? bookings : []
  const safeUserProjectIds = Array.isArray(userProjectIds) ? userProjectIds : []
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string>("all")
  
  // Confirmation dialog states
  const [showDeleteAppointmentDialog, setShowDeleteAppointmentDialog] = useState(false)
  const [showCancelBookingDialog, setShowCancelBookingDialog] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null)
  const [bookingToCancel, setBookingToCancel] = useState<{ id: number } | null>(null)
  
  // Email history dialog state
  const [showEmailHistoryDialog, setShowEmailHistoryDialog] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null)
  
  // Send reminder dialog state
  const [showSendReminderDialog, setShowSendReminderDialog] = useState(false)
  const [selectedReminderBookingId, setSelectedReminderBookingId] = useState<number | null>(null)
  
  // Edit reminders dialog state
  const [showEditRemindersDialog, setShowEditRemindersDialog] = useState(false)
  const [selectedEditRemindersBookingId, setSelectedEditRemindersBookingId] = useState<number | null>(null)
  
  // Booking details dialog state
  const [showBookingDetailsDialog, setShowBookingDetailsDialog] = useState(false)
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<AppointmentBooking | null>(null)

  // Get user name for filtering bookings
  const userName = enhancedUser?.profile 
    ? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim() 
    : enhancedUser?.email || 'Unknown User'

  const handleRefresh = () => {
    window.location.reload()
  }

  // Filter appointments based on search and filters
  const getFilteredAppointments = () => {
    return safeAppointments.filter(appointment => {
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
    const userBookings = safeBookings.filter(booking => {
      const isUserBooking = booking.bookedBy === userName
      const isUserProjectBooking = booking.project && 
        safeUserProjectIds.includes(booking.project.id)
      
      return isUserBooking || isUserProjectBooking
    }).map(booking => ({
      ...booking,
      itemName: booking.project?.clientName || booking.appointment?.name || 'Appointment',
      itemLocation: booking.appointment?.location,
      itemBrand: booking.appointment?.brand,
      project: booking.project,
      reminders: Array.isArray(booking.reminders) ? booking.reminders : []
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
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} bg-transparent border-primary border transition-all duration-300 ease-in-out`}>
          <TabsTrigger 
            value="appointment-booking" 
            className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
          >
            Book Appointments
          </TabsTrigger>
          <TabsTrigger 
            value="my-bookings" 
            className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
          >
            My Bookings
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger 
              value="manage-appointments" 
              className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
            >
              Manage Appointments
            </TabsTrigger>
          )}
        </TabsList>
        {/* Sliding indicator */}
        <div 
          className={`absolute top-1 h-[calc(100%-8px)] bg-primary transition-all duration-300 ease-in-out rounded-md z-0 ${
            isAdmin ? (
              activeTab === "appointment-booking" ? "left-1 w-[calc(33.33%-4px)]" : 
              activeTab === "my-bookings" ? "left-[calc(33.33%+2px)] w-[calc(33.33%-4px)]" : 
              "left-[calc(66.66%+2px)] w-[calc(33.33%-4px)]"
            ) : (
              activeTab === "appointment-booking" ? "left-1 w-[calc(50%-4px)]" : 
              "left-[calc(50%+2px)] w-[calc(50%-4px)]"
            )
          }`}
        />
      </div>

      {/* Book Appointments Tab */}
      <TabsContent value="appointment-booking" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Book Appointments</h2>
          <Button onClick={handleRefresh} className="bg-primary text-primary-foreground">
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters - Matching Clients Page Design */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-2 border-accent"
              />
            </div>
            <Select value={selectedAppointmentType} onValueChange={setSelectedAppointmentType}>
              <SelectTrigger className="w-48 bg-background border-2 border-accent">
                <List className="w-4 h-4 mr-2 text-muted-foreground" />
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
          <div className="flex items-center justify-end">
            <div className="text-sm text-muted-foreground">
              Showing {filteredAppointments.length} of {safeAppointments.length} appointments
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
          <Button onClick={handleRefresh} className="bg-primary text-primary-foreground">
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters and Sorting - Matching Clients Page Design */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search bookings..."
                value={bookingSearchQuery}
                onChange={(e) => setBookingSearchQuery(e.target.value)}
                className="pl-10 bg-background border-2 border-accent"
              />
            </div>
            <Select value={bookingTypeFilter} onValueChange={setBookingTypeFilter}>
              <SelectTrigger className="w-48 bg-background border-2 border-accent">
                <List className="w-4 h-4 mr-2 text-muted-foreground" />
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
              <SelectTrigger className="w-48 bg-background border-2 border-accent">
                <UsersIcon className="w-4 h-4 mr-2 text-muted-foreground" />
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
                    <div className="flex items-center gap-2 mb-2 w-full">
                      <Calendar className="w-5 h-5 shrink-0" />
                      <h3 
                        className="text-lg font-semibold truncate flex-1 min-w-0" 
                        title={booking.itemName}
                      >
                        {booking.itemName}
                      </h3>
                      <div className="flex shrink-0 gap-1">
                        {booking.project && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReminderBookingId(booking.id)
                                setShowSendReminderDialog(true)
                              }}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Send reminder email"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEditRemindersBookingId(booking.id)
                                setShowEditRemindersDialog(true)
                              }}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              title="Edit reminders"
                            >
                              <Bell className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBookingForDetails(booking)
                            setShowBookingDetailsDialog(true)
                          }}
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="View booking details"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBookingId(booking.id)
                            setShowEmailHistoryDialog(true)
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="View email history"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
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
                    <div className="flex items-center gap-2">
                      <Badge className={appointmentConfig.color}>
                        {appointmentConfig.label}
                      </Badge>
                      <Badge 
                        variant="secondary"
                        className={hasPassed ? "bg-muted text-muted-foreground" : "bg-[var(--color-chart-3)] text-primary-foreground"}
                      >
                        {hasPassed ? 'Expired' : 'Active'}
                      </Badge>
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
                        <span className="ml-2">{new Date(booking.startDate).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">End:</span>
                        <span className="ml-2">{new Date(booking.endDate).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
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
                          <Calendar className="w-4 h-4 mr-2 shrink-0" />
                          <span className="font-medium shrink-0">Project:</span>
                          <span className="ml-2 truncate">{booking.project.clientName || booking.project.name}</span>
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
                <Button className="bg-primary text-primary-foreground">
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
            {safeAppointments.map((appointment) => {
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
                            className={appointment.isAvailable ? "bg-[var(--color-chart-3)] text-primary-foreground" : "bg-muted text-muted-foreground"}
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

      {/* Email History Dialog */}
      {selectedBookingId && (
        <AppointmentBookingEmailHistoryDialog
          isOpen={showEmailHistoryDialog}
          onOpenChange={(open) => {
            setShowEmailHistoryDialog(open)
            if (!open) {
              setSelectedBookingId(null)
            }
          }}
          appointmentBookingId={selectedBookingId}
        />
      )}

      {/* Send Reminder Dialog */}
      {selectedReminderBookingId && (
        <SendAppointmentReminderDialog
          isOpen={showSendReminderDialog}
          onOpenChange={(open) => {
            setShowSendReminderDialog(open)
            if (!open) {
              setSelectedReminderBookingId(null)
            }
          }}
          appointmentBookingId={selectedReminderBookingId}
          onSuccess={() => {
            handleRefresh()
          }}
        />
      )}

      {/* Edit Reminders Dialog */}
      {selectedEditRemindersBookingId && (
        <EditAppointmentRemindersDialog
          isOpen={showEditRemindersDialog}
          onOpenChange={(open) => {
            setShowEditRemindersDialog(open)
            if (!open) {
              setSelectedEditRemindersBookingId(null)
            }
          }}
          appointmentBookingId={selectedEditRemindersBookingId}
          onSuccess={() => {
            // Don't refresh or navigate - just show toast (handled in dialog)
            // Dialog stays open and user stays on "My Appointments" tab
          }}
        />
      )}

      {/* Booking Details Dialog */}
      <BookingDetailsDialog
        isOpen={showBookingDetailsDialog}
        onOpenChange={(open) => {
          setShowBookingDetailsDialog(open)
          if (!open) {
            setSelectedBookingForDetails(null)
          }
        }}
        booking={selectedBookingForDetails}
      />
    </Tabs>
  )
}

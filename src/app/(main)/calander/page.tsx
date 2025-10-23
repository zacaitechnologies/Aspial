"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Users, Filter } from "lucide-react"
import { CalendarDay } from "./components/CalendarDay"
import { BookingDetailsDialog } from "./components/BookingDetailsDialog"
import { DateEventsDialog } from "./components/DateEventsDialog"
import { DatePicker } from "./components/DatePicker"
import { useSession } from "../contexts/SessionProvider"
import { fetchAllBookings, CalendarBooking } from "./actions"


const bookingTypes = {
	equipment: { color: "bg-[var(--color-primary)]", label: "Equipment" },
	studio: { color: "bg-[var(--color-accent)]", label: "Studio" },
	task: { color: "bg-yellow-500", label: "Task" },
}

export default function OrganizationCalendar() {
	const { enhancedUser } = useSession()
	const [currentDate, setCurrentDate] = useState(new Date())
	const [bookings, setBookings] = useState<CalendarBooking[]>([])
	const [filterType, setFilterType] = useState<string>("all")
	const [hoveredDate, setHoveredDate] = useState<string>("")
	const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
	const [selectedDate, setSelectedDate] = useState<string>("")
	const [isDateEventsDialogOpen, setIsDateEventsDialogOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	// Get user name for filtering bookings
	const userName = enhancedUser?.profile 
		? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim()
		: enhancedUser?.email || ''

	// Load all bookings on component mount
	useEffect(() => {
		const loadBookings = async () => {
			setIsLoading(true)
			try {
				if (enhancedUser?.id && userName) {
					const fetchedBookings = await fetchAllBookings(enhancedUser.id, userName)
					setBookings(fetchedBookings)
				}
			} catch (error) {
				console.error('Error loading bookings:', error)
			} finally {
				setIsLoading(false)
			}
		}
		
		if (enhancedUser?.id && userName) {
			loadBookings()
		}
	}, [enhancedUser?.id, userName])

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const getBookingsForDate = (date: string) => {
    return bookings.filter((booking) => booking.date === date && (filterType === "all" || booking.type === filterType))
  }

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate)
  }

  const handleBookingClick = (booking: CalendarBooking) => {
    setSelectedBooking(booking)
    setIsDetailsDialogOpen(true)
  }

  const handleBookingEdit = (updatedBooking: CalendarBooking) => {
    setBookings((prev) => 
      prev.map((booking) => 
        booking.id === updatedBooking.id ? updatedBooking : booking
      )
    )
  }

  const handleBookingDelete = (bookingId: string) => {
    setBookings((prev) => prev.filter((booking) => booking.id !== bookingId))
  }

  const handleDateClick = (dateString: string) => {
    setSelectedDate(dateString)
    setIsDateEventsDialogOpen(true)
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-[var(--color-border)]"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateString = formatDate(date)
      const dayBookings = getBookingsForDate(dateString)
      const isToday = dateString === formatDate(new Date())
      const isHovered = hoveredDate === dateString

      days.push(
        <CalendarDay
          key={day}
          day={day}
          date={date}
          dateString={dateString}
          dayBookings={dayBookings}
          isToday={isToday}
          isHovered={isHovered}
          onDateClick={handleDateClick}
          onBookingClick={handleBookingClick}
          onHoverChange={setHoveredDate}
        />
      )
    }

    return days
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[var(--color-muted-foreground)]">Manage your team&apos;s bookings and events</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                </SelectContent>
              </Select>
              
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(bookingTypes).map(([type, config]) => {
              const count = bookings.filter((b) => b.type === type).length
              return (
                <Card
                  key={type}
                  className="bg-[var(--color-card)] border-[var(--color-border)]"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--color-muted-foreground)]">{config.label}s</p>
                        <p className="text-2xl font-bold text-[var(--color-foreground)]">{count}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Calendar */}
        <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-[var(--color-foreground)]">
                Calendar
              </CardTitle>
              <DatePicker 
                currentDate={currentDate}
                onDateChange={handleDateChange}
              />
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-0 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 border-l border-t border-[var(--color-border)] relative">{renderCalendarDays()}</div>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="mt-6 bg-[var(--color-card)] border-[var(--color-border)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--color-foreground)]">
              <Calendar className="w-5 h-5" />
              Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bookings
                .filter((booking) => new Date(booking.date) >= new Date())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 rounded-lg border-l-4 bg-[var(--color-muted)] border-[var(--color-border)]"
                    style={{
                      borderLeftColor: booking.color.includes("primary") ? "var(--color-primary)" : "var(--color-accent)",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-[var(--color-foreground)]">{booking.title}</h4>
                        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{booking.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-muted-foreground)]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(booking.date).toLocaleDateString()}
                          </div>
                          {booking.type !== "task" && (
                            <>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {booking.startTime} - {booking.endTime}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {booking.attendees} attendees
                              </div>
                            </>
                          )}
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {booking.location}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`${booking.color} text-white`}>
                        {bookingTypes[booking.type].label}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Booking Details Dialog */}
        <BookingDetailsDialog
          booking={selectedBooking}
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false)
            setSelectedBooking(null)
          }}
          onEdit={handleBookingEdit}
          onDelete={handleBookingDelete}
        />

        {/* Date Events Dialog */}
        <DateEventsDialog
          isOpen={isDateEventsDialogOpen}
          onClose={() => {
            setIsDateEventsDialogOpen(false)
            setSelectedDate("")
          }}
          date={selectedDate}
          events={getBookingsForDate(selectedDate)}
          onEventClick={(event) => {
            setSelectedBooking(event)
            setIsDateEventsDialogOpen(false)
            setIsDetailsDialogOpen(true)
          }}
        />
      </div>
    </div>
  )
}

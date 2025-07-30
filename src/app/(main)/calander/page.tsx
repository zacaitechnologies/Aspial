"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin, Users, Filter } from "lucide-react"

interface EquipmentBooking {
  id: number
  equipmentId: number
  equipment: {
    name: string
    type: string
    studio?: { name: string } | null
  }
  bookedBy: string
  startDate: string
  endDate: string
  purpose: string | null
  status: string
}

interface StudioBooking {
  id: number
  studioId: number
  studio: {
    name: string
    location: string
  }
  bookedBy: string
  startDate: string
  endDate: string
  purpose: string | null
  attendees: number
  status: string
}

interface CalendarBooking {
  id: string
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  type: "equipment" | "studio"
  location: string
  attendees: number
  color: string
  originalData: EquipmentBooking | StudioBooking
}

const bookingTypes = {
  equipment: { color: "bg-blue-500", label: "Equipment" },
  studio: { color: "bg-green-500", label: "Studio" },
}

// Function to fetch bookings from the database
async function fetchBookings(): Promise<CalendarBooking[]> {
  try {
    const [equipmentResponse, studioResponse] = await Promise.all([
      fetch('/api/bookings/equipment'),
      fetch('/api/bookings/studio')
    ])

    const equipmentBookings: EquipmentBooking[] = await equipmentResponse.json()
    const studioBookings: StudioBooking[] = await studioResponse.json()

    const calendarBookings: CalendarBooking[] = []

    // Transform equipment bookings
    equipmentBookings.forEach((booking) => {
      if (booking.status === 'active') {
        const startDate = new Date(booking.startDate)
        const endDate = new Date(booking.endDate)
        
        calendarBookings.push({
          id: `equipment-${booking.id}`,
          title: `${booking.equipment.name} - ${booking.bookedBy}`,
          description: booking.purpose || `Equipment booking by ${booking.bookedBy}`,
          date: startDate.toISOString().split('T')[0],
          startTime: startDate.toTimeString().slice(0, 5),
          endTime: endDate.toTimeString().slice(0, 5),
          type: "equipment",
          location: booking.equipment.studio?.name || "Unassigned",
          attendees: 1,
          color: bookingTypes.equipment.color,
          originalData: booking
        })
      }
    })

    // Transform studio bookings
    studioBookings.forEach((booking) => {
      if (booking.status === 'active') {
        const startDate = new Date(booking.startDate)
        const endDate = new Date(booking.endDate)
        
        calendarBookings.push({
          id: `studio-${booking.id}`,
          title: `${booking.studio.name} - ${booking.bookedBy}`,
          description: booking.purpose || `Studio booking by ${booking.bookedBy}`,
          date: startDate.toISOString().split('T')[0],
          startTime: startDate.toTimeString().slice(0, 5),
          endTime: endDate.toTimeString().slice(0, 5),
          type: "studio",
          location: booking.studio.location,
          attendees: booking.attendees,
          color: bookingTypes.studio.color,
          originalData: booking
        })
      }
    })

    return calendarBookings
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return []
  }
}

export default function OrganizationCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")
  const [hoveredDate, setHoveredDate] = useState<string>("")
  const [newBooking, setNewBooking] = useState<Partial<CalendarBooking>>({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    type: "equipment",
    location: "",
    attendees: 1,
  })

  // Fetch bookings on component mount
  useEffect(() => {
    const loadBookings = async () => {
      const fetchedBookings = await fetchBookings()
      setBookings(fetchedBookings)
    }
    
    loadBookings()
  }, [])

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

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleCreateBooking = () => {
    if (newBooking.title && newBooking.date && newBooking.startTime && newBooking.endTime) {
      const booking: CalendarBooking = {
        id: Date.now().toString(),
        title: newBooking.title,
        description: newBooking.description || "",
        date: newBooking.date,
        startTime: newBooking.startTime,
        endTime: newBooking.endTime,
        type: newBooking.type as "equipment" | "studio",
        location: newBooking.location || "",
        attendees: newBooking.attendees || 1,
        color: bookingTypes[newBooking.type as keyof typeof bookingTypes].color,
        originalData: {} as EquipmentBooking | StudioBooking
      }

      setBookings((prev) => [...prev, booking])
      setNewBooking({
        title: "",
        description: "",
        date: "",
        startTime: "",
        endTime: "",
        type: "equipment",
        location: "",
        attendees: 1,
      })
      setIsDialogOpen(false)
    }
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-100"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateString = formatDate(date)
      const dayBookings = getBookingsForDate(dateString)
      const isToday = dateString === formatDate(new Date())
      const isHovered = hoveredDate === dateString

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-100 p-1 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
            isToday ? "bg-blue-50 border-blue-200" : ""
          } ${isHovered ? "shadow-md transform scale-105" : ""}`}
          onMouseEnter={() => setHoveredDate(dateString)}
          onMouseLeave={() => setHoveredDate("")}
          onClick={() => {
            setNewBooking((prev) => ({ ...prev, date: dateString }))
          }}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-700"}`}>{day}</div>
          <div className="space-y-1">
            {dayBookings.slice(0, 2).map((booking, index) => (
              <div
                key={booking.id}
                className={`text-xs px-1 py-0.5 rounded text-white truncate ${booking.color} 
                  transform transition-all duration-200 hover:scale-105 animate-in slide-in-from-left-2`}
                style={{ animationDelay: `${index * 100}ms` }}
                title={`${booking.title} (${booking.startTime} - ${booking.endTime})`}
              >
                {booking.title}
              </div>
            ))}
            {dayBookings.length > 2 && <div className="text-xs text-gray-500 px-1">+{dayBookings.length - 2} more</div>}
          </div>
        </div>,
      )
    }

    return days
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-in fade-in-0 slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600">Manage your team&apos;s bookings and events</p>
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
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
                    <Plus className="w-4 h-4 mr-2" />
                    New Booking
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Booking</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newBooking.title}
                        onChange={(e) => setNewBooking((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter booking title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newBooking.description}
                        onChange={(e) => setNewBooking((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter description"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newBooking.date}
                          onChange={(e) => setNewBooking((prev) => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={newBooking.type}
                          onValueChange={(value) => setNewBooking((prev) => ({ ...prev, type: value as "equipment" | "studio" }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="studio">Studio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newBooking.startTime}
                          onChange={(e) => setNewBooking((prev) => ({ ...prev, startTime: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newBooking.endTime}
                          onChange={(e) => setNewBooking((prev) => ({ ...prev, endTime: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={newBooking.location}
                        onChange={(e) => setNewBooking((prev) => ({ ...prev, location: e.target.value }))}
                        placeholder="Enter location"
                      />
                    </div>
                    <div>
                      <Label htmlFor="attendees">Expected Attendees</Label>
                      <Input
                        id="attendees"
                        type="number"
                        min="1"
                        value={newBooking.attendees}
                        onChange={(e) =>
                          setNewBooking((prev) => ({ ...prev, attendees: Number.parseInt(e.target.value) }))
                        }
                      />
                    </div>
                    <Button onClick={handleCreateBooking} className="w-full">
                      Create Booking
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(bookingTypes).map(([type, config], index) => {
              const count = bookings.filter((b) => b.type === type).length
              return (
                <Card
                  key={type}
                  className={`transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-4`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{config.label}s</p>
                        <p className="text-2xl font-bold">{count}</p>
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
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  className="transition-all duration-200 hover:scale-105"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="transition-all duration-200 hover:scale-105"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  className="transition-all duration-200 hover:scale-105"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-0 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 border-l border-t">{renderCalendarDays()}</div>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="mt-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                .map((booking, index) => (
                  <div
                    key={booking.id}
                    className={`p-4 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100 transition-all duration-200 hover:shadow-md animate-in fade-in-0 slide-in-from-left-4`}
                    style={{
                      borderLeftColor: booking.color.replace("bg-", "").replace("-500", ""),
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{booking.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{booking.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(booking.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {booking.startTime} - {booking.endTime}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {booking.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {booking.attendees} attendees
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
      </div>
    </div>
  )
}

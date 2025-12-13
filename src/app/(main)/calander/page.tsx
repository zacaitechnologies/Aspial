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
import { ExportCalendarDialog } from "./components/ExportCalendarDialog"
import { ViewSwitcher } from "./components/ViewSwitcher"
import { WeekView } from "./components/WeekView"
import { DayView } from "./components/DayView"
import { useSession } from "../contexts/SessionProvider"
import { fetchAllBookings, CalendarBooking, getUserProjects, checkIsAdmin } from "./actions"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { CalendarView, getWeekDays } from "./utils/calendar-utils"


const bookingTypes = {
	equipment: { color: "bg-blue-500", label: "Equipment" },
	studio: { color: "bg-purple-500", label: "Studio" },
	task: { color: "bg-yellow-500", label: "Task" },
}

export default function OrganizationCalendar() {
	const { enhancedUser } = useSession()
	const [currentDate, setCurrentDate] = useState(new Date())
	const [viewMode, setViewMode] = useState<CalendarView>('month')
	const [bookings, setBookings] = useState<CalendarBooking[]>([])
	const [filterType, setFilterType] = useState<string>("all")
	const [bookmarkScope, setBookmarkScope] = useState<string>("all")
	const [selectedProject, setSelectedProject] = useState<string>("all")
	const [taskOwnershipFilter, setTaskOwnershipFilter] = useState<string>("all")
	const [projects, setProjects] = useState<{ id: number; name: string }[]>([])
	const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
	const [selectedDate, setSelectedDate] = useState<string>("")
	const [isDateEventsDialogOpen, setIsDateEventsDialogOpen] = useState(false)
	const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [isAdmin, setIsAdmin] = useState(false)
	const [isMounted, setIsMounted] = useState(false)

	// Get user name for filtering bookings
	const userName = enhancedUser?.profile 
		? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim()
		: enhancedUser?.email || ''

	// Handle client-side mounting
	useEffect(() => {
		setIsMounted(true)
	}, [])

	// Load all bookings on component mount
	useEffect(() => {
		const loadBookings = async () => {
			try {
				if (enhancedUser?.id && userName) {
					console.log('Loading bookings for user:', enhancedUser.id, userName)
					const fetchedBookings = await fetchAllBookings(enhancedUser.id, userName)
					console.log('Fetched bookings count:', fetchedBookings.length)
					console.log('Sample booking:', fetchedBookings[0])
					setBookings(fetchedBookings)
					
					// Check if admin and fetch projects if not
					const hasAdminRole = await checkIsAdmin(enhancedUser.id)
					setIsAdmin(hasAdminRole)
					
					// Only fetch projects if not admin
					if (!hasAdminRole) {
						const userProjects = await getUserProjects(enhancedUser.id)
						setProjects(userProjects)
					}
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
    const filtered = bookings.filter((booking) => {
      // Filter by date
      if (booking.date !== date) return false
      
      // Filter by type
      if (filterType !== "all" && booking.type !== filterType) return false
      
      // Filter by bookmark scope (only for non-admin users)
      if (!isAdmin) {
        if (bookmarkScope === "own" && !booking.isUserBooking) return false
        if (bookmarkScope === "team" && !booking.isTeamBooking) return false
      }
      
      // Filter by project (only if a specific project is selected)
      if (selectedProject !== "all") {
        const projectId = parseInt(selectedProject)
        if (booking.projectId !== projectId) return false
      }
      
      // Filter by task ownership (only for tasks)
      if (booking.type === "task" && taskOwnershipFilter !== "all") {
        if (taskOwnershipFilter === "my") {
          // Show tasks assigned to the current user or created by them
          if (booking.assigneeId !== enhancedUser?.id && booking.creatorId !== enhancedUser?.id) {
            return false
          }
        } else if (taskOwnershipFilter === "teammate") {
          // Show tasks assigned to teammates (not the current user)
          if (booking.assigneeId === enhancedUser?.id || booking.creatorId === enhancedUser?.id) {
            return false
          }
        }
      }
      
      return true
    })
    console.log(`Bookings for ${date}:`, filtered.length)
    return filtered
  }

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate)
  }

  const handleViewChange = (newView: CalendarView) => {
    setViewMode(newView)
  }

  // Get filtered bookings for the selected time period
  const getFilteredUpcomingBookings = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.date)
      bookingDate.setHours(0, 0, 0, 0)

      // Apply date range filter based on view mode
      if (viewMode === 'month') {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)
        
        if (bookingDate < monthStart || bookingDate > monthEnd) return false
      } else if (viewMode === 'week') {
        const weekDays = getWeekDays(currentDate)
        const weekStart = new Date(weekDays[0])
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekDays[6])
        weekEnd.setHours(23, 59, 59, 999)
        
        if (bookingDate < weekStart || bookingDate > weekEnd) return false
      } else if (viewMode === 'day') {
        const dayStart = new Date(currentDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(currentDate)
        dayEnd.setHours(23, 59, 59, 999)
        
        if (bookingDate.getTime() !== dayStart.getTime()) return false
      }

      // Don't show past bookings
      if (bookingDate < today) return false
      
      // Apply other filters
      if (filterType !== "all" && booking.type !== filterType) return false
      if (!isAdmin) {
        if (bookmarkScope === "own" && !booking.isUserBooking) return false
        if (bookmarkScope === "team" && !booking.isTeamBooking) return false
      }
      if (selectedProject && selectedProject !== "all") {
        const projectId = parseInt(selectedProject)
        if (booking.projectId !== projectId) return false
      }
      if (booking.type === "task" && taskOwnershipFilter !== "all") {
        if (taskOwnershipFilter === "my") {
          if (booking.assigneeId !== enhancedUser?.id && booking.creatorId !== enhancedUser?.id) {
            return false
          }
        } else if (taskOwnershipFilter === "teammate") {
          if (booking.assigneeId === enhancedUser?.id || booking.creatorId === enhancedUser?.id) {
            return false
          }
        }
      }
      return true
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const handleBookingClick = (booking: CalendarBooking) => {
    setSelectedBooking(booking)
    setIsDetailsDialogOpen(true)
  }

  // Edit and delete handlers disabled - calendar is read-only
  const handleBookingEdit = () => {
    // No-op - editing disabled
  }

  const handleBookingDelete = () => {
    // No-op - deletion disabled
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
      days.push(<div key={`empty-${i}`} className="h-24 border border-(--color-border)]"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateString = formatDate(date)
      const dayBookings = getBookingsForDate(dateString)
      const isToday = dateString === formatDate(new Date())

      days.push(
        <CalendarDay
          key={day}
          day={day}
          date={date}
          dateString={dateString}
          dayBookings={dayBookings}
          isToday={isToday}
          onDateClick={handleDateClick}
          onBookingClick={handleBookingClick}
        />
      )
    }

    return days
  }

  return (
    <div className="calendar-page min-h-screen bg-(--color-background)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-(--color-muted-foreground)]">Manage your team&apos;s bookings and events</p>
            </div>
            {isMounted && (
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

                <Select value={taskOwnershipFilter} onValueChange={setTaskOwnershipFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="my">My Tasks</SelectItem>
                    <SelectItem value="teammate">Teammate Tasks</SelectItem>
                  </SelectContent>
                </Select>
                
                {!isAdmin && (
                  <>
                    <Select value={bookmarkScope} onValueChange={setBookmarkScope}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Bookings</SelectItem>
                        <SelectItem value="own">My Bookings</SelectItem>
                        <SelectItem value="team">Team Bookings</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {projects.length > 0 && (
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Filter by project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Projects</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(bookingTypes).map(([type, config]) => {
              const count = isLoading ? 0 : bookings.filter((b) => {
                if (b.type !== type) return false
                if (!isAdmin) {
                  if (bookmarkScope === "own" && !b.isUserBooking) return false
                  if (bookmarkScope === "team" && !b.isTeamBooking) return false
                }
                if (selectedProject && selectedProject !== "all") {
                  const projectId = parseInt(selectedProject)
                  if (b.projectId !== projectId) return false
                }
                // Filter by task ownership (only for tasks)
                if (b.type === "task" && taskOwnershipFilter !== "all") {
                  if (taskOwnershipFilter === "my") {
                    if (b.assigneeId !== enhancedUser?.id && b.creatorId !== enhancedUser?.id) {
                      return false
                    }
                  } else if (taskOwnershipFilter === "teammate") {
                    if (b.assigneeId === enhancedUser?.id || b.creatorId === enhancedUser?.id) {
                      return false
                    }
                  }
                }
                return true
              }).length
              return (
                <Card
                  key={type}
                  className="bg-(--color-card)] border-(--color-border)]"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-(--color-muted-foreground)]">{config.label}s</p>
                        <p className={`text-2xl font-bold text-(--color-foreground)] ${isLoading ? 'animate-pulse' : ''}`}>
                          {isLoading ? '...' : count}
                        </p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${config.color} ${isLoading ? 'animate-pulse' : ''}`}></div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Calendar */}
        <Card className="bg-(--color-card)] border-(--color-border)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-(--color-foreground)]">
                Calendar
              </CardTitle>
              {isMounted && (
                <div className="flex items-center gap-4">
                  <ViewSwitcher
                    currentView={viewMode}
                    onViewChange={handleViewChange}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setIsExportDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                  <DatePicker 
                    currentDate={currentDate}
                    onDateChange={handleDateChange}
                    viewMode={viewMode}
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'month' && (
              <>
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-0 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-(--color-muted-foreground)] border-b border-(--color-border)]">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-0 border-l border-t border-(--color-border)] relative">
                  {renderCalendarDays()}
                  {isLoading && (
                    <div className="absolute inset-0 bg-(--color-background)]/50 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary)] mx-auto mb-2"></div>
                        <p className="text-sm text-(--color-muted-foreground)]">Loading events...</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {viewMode === 'week' && (
              <div className="h-[calc(100vh-400px)] min-h-[700px] overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary)] mx-auto mb-2"></div>
                      <p className="text-sm text-(--color-muted-foreground)]">Loading events...</p>
                    </div>
                  </div>
                ) : (
                  <WeekView
                    currentDate={currentDate}
                    bookings={bookings.filter((booking) => {
                      if (filterType !== "all" && booking.type !== filterType) return false
                      if (!isAdmin) {
                        if (bookmarkScope === "own" && !booking.isUserBooking) return false
                        if (bookmarkScope === "team" && !booking.isTeamBooking) return false
                      }
                      if (selectedProject !== "all") {
                        const projectId = parseInt(selectedProject)
                        if (booking.projectId !== projectId) return false
                      }
                      if (booking.type === "task" && taskOwnershipFilter !== "all") {
                        if (taskOwnershipFilter === "my") {
                          if (booking.assigneeId !== enhancedUser?.id && booking.creatorId !== enhancedUser?.id) {
                            return false
                          }
                        } else if (taskOwnershipFilter === "teammate") {
                          if (booking.assigneeId === enhancedUser?.id || booking.creatorId === enhancedUser?.id) {
                            return false
                          }
                        }
                      }
                      return true
                    })}
                    onEventClick={handleBookingClick}
                    onDateClick={handleDateClick}
                  />
                )}
              </div>
            )}
            
            {viewMode === 'day' && (
              <div className="h-[calc(100vh-400px)] min-h-[700px] overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary)] mx-auto mb-2"></div>
                      <p className="text-sm text-(--color-muted-foreground)]">Loading events...</p>
                    </div>
                  </div>
                ) : (
                  <DayView
                    currentDate={currentDate}
                    bookings={bookings.filter((booking) => {
                      if (filterType !== "all" && booking.type !== filterType) return false
                      if (!isAdmin) {
                        if (bookmarkScope === "own" && !booking.isUserBooking) return false
                        if (bookmarkScope === "team" && !booking.isTeamBooking) return false
                      }
                      if (selectedProject !== "all") {
                        const projectId = parseInt(selectedProject)
                        if (booking.projectId !== projectId) return false
                      }
                      if (booking.type === "task" && taskOwnershipFilter !== "all") {
                        if (taskOwnershipFilter === "my") {
                          if (booking.assigneeId !== enhancedUser?.id && booking.creatorId !== enhancedUser?.id) {
                            return false
                          }
                        } else if (taskOwnershipFilter === "teammate") {
                          if (booking.assigneeId === enhancedUser?.id || booking.creatorId === enhancedUser?.id) {
                            return false
                          }
                        }
                      }
                      return true
                    })}
                    onEventClick={handleBookingClick}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="mt-6 bg-(--color-card) border-(--color-border)">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-(--color-foreground)">
              <Calendar className="w-5 h-5" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border-l-4 bg-(--color-muted)] border-(--color-border)] animate-pulse"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="h-5 bg-(--color-border)] rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-(--color-border)] rounded w-2/3 mb-2"></div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="h-3 bg-(--color-border)] rounded w-20"></div>
                          <div className="h-3 bg-(--color-border)] rounded w-24"></div>
                          <div className="h-3 bg-(--color-border)] rounded w-20"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-(--color-border)] rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredUpcomingBookings()
                  .slice(0, 5)
                  .map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 rounded-lg border-l-4 bg-(--color-muted)] border-(--color-border)]"
                      style={{
                        borderLeftColor: booking.color.includes("primary") ? "var(--color-primary)" : "var(--color-accent)",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-(--color-foreground)]">{booking.title}</h4>
                          <p className="text-sm text-(--color-muted-foreground)] mt-1">{booking.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-(--color-muted-foreground)]">
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
                {getFilteredUpcomingBookings().length === 0 && (
                  <div className="text-center py-8 text-(--color-muted-foreground)]">
                    No upcoming appointments
                  </div>
                )}
              </div>
            )}
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

        {/* Export Calendar Dialog */}
        <ExportCalendarDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          bookings={bookings}
        />
      </div>
    </div>
  )
}

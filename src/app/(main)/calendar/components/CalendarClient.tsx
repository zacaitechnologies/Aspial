"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Users, Filter } from "lucide-react"
import { CalendarDay } from "./CalendarDay"
import { BookingDetailsDialog } from "./BookingDetailsDialog"
import { DateEventsDialog } from "./DateEventsDialog"
import { DatePicker } from "./DatePicker"
import { ExportCalendarDialog } from "./ExportCalendarDialog"
import { ViewSwitcher } from "./ViewSwitcher"
import { WeekView } from "./WeekView"
import { DayView } from "./DayView"
import { fetchAllBookings, type CalendarBooking } from "../actions"
import { APPOINTMENT_TYPES, type AppointmentType } from "../constants"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { parseLocalDateString, formatDateStringDirect } from "@/lib/date-utils"
import { CalendarView, getWeekDays, formatDate } from "../utils/calendar-utils"

interface CalendarClientProps {
	initialBookings: CalendarBooking[]
	initialIsAdmin: boolean
	initialProjects: { id: number; name: string }[]
	userId: string
	userName: string
}

// Map appointment type to border color using calendar theme tokens
const getBorderColorClass = (appointmentType: AppointmentType): string => {
	const borderColorMap: Record<AppointmentType, string> = {
		PHOTO_SHOOT: "border-l-calendar-photo-shoot",
		VIDEO_SHOOT: "border-l-calendar-video-shoot",
		CONSULTATION: "border-l-calendar-consultation",
		PHOTO_SELECTION: "border-l-calendar-photo-selection",
		OTHERS: "border-l-calendar-others",
	}
	return borderColorMap[appointmentType] || "border-l-calendar-others"
}

// Map appointment type to badge classes using calendar theme tokens
const getBadgeClasses = (appointmentType: AppointmentType): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } => {
	const badgeMap: Record<AppointmentType, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
		PHOTO_SHOOT: { variant: "secondary", className: "bg-calendar-photo-shoot text-foreground" },
		VIDEO_SHOOT: { variant: "secondary", className: "bg-calendar-video-shoot text-foreground" },
		CONSULTATION: { variant: "secondary", className: "bg-calendar-consultation text-foreground" },
		PHOTO_SELECTION: { variant: "secondary", className: "bg-calendar-photo-selection text-foreground" },
		OTHERS: { variant: "secondary", className: "bg-calendar-others text-foreground" },
	}
	return badgeMap[appointmentType] || { variant: "secondary", className: "bg-calendar-others text-foreground" }
}

export default function CalendarClient({
	initialBookings,
	initialIsAdmin,
	initialProjects,
	userId,
	userName,
}: CalendarClientProps) {
	// Fix hydration: initialize with a stable date, then update after mount if needed
	const [currentDate, setCurrentDate] = useState<Date>(() => {
		// Use a stable initial date to avoid hydration mismatches
		// The server and client will both use the same initial value
		const now = new Date()
		// Set to start of day for consistency
		now.setHours(0, 0, 0, 0)
		return now
	})
	const [viewMode, setViewMode] = useState<CalendarView>('month')
	const [filterType, setFilterType] = useState<string>("all")
	const [bookmarkScope, setBookmarkScope] = useState<string>("all")
	const [selectedProject, setSelectedProject] = useState<string>("all")
	const [taskOwnershipFilter, setTaskOwnershipFilter] = useState<string>("all")
	const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
	const [selectedDate, setSelectedDate] = useState<string>("")
	const [isDateEventsDialogOpen, setIsDateEventsDialogOpen] = useState(false)
	const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

	const isAdmin = initialIsAdmin
	const projects = initialProjects

	function getRangeKey(start: Date, end: Date) {
		return `${start.getTime()}_${end.getTime()}`
	}

	// Bookings state: start with initial (current month), update when range changes
	const [bookings, setBookings] = useState<CalendarBooking[]>(initialBookings)
	const rangeCacheRef = useRef<Map<string, CalendarBooking[]>>(new Map())
	const initialRangeKeyRef = useRef<string | null>(null)

	// Seed cache with initial month on first run
	if (initialRangeKeyRef.current === null) {
		const now = new Date()
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
		monthStart.setHours(0, 0, 0, 0)
		const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
		monthEnd.setHours(23, 59, 59, 999)
		initialRangeKeyRef.current = getRangeKey(monthStart, monthEnd)
		rangeCacheRef.current.set(initialRangeKeyRef.current, initialBookings)
	}

	// Memoize date range calculation
	const dateRange = useMemo(() => {
		if (viewMode === 'month') {
			const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
			monthStart.setHours(0, 0, 0, 0)
			const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
			monthEnd.setHours(23, 59, 59, 999)
			return { start: monthStart, end: monthEnd }
		} else if (viewMode === 'week') {
			const weekDays = getWeekDays(currentDate)
			const weekStart = new Date(weekDays[0])
			weekStart.setHours(0, 0, 0, 0)
			const weekEnd = new Date(weekDays[6])
			weekEnd.setHours(23, 59, 59, 999)
			return { start: weekStart, end: weekEnd }
		} else {
			const dayStart = new Date(currentDate)
			dayStart.setHours(0, 0, 0, 0)
			const dayEnd = new Date(currentDate)
			dayEnd.setHours(23, 59, 59, 999)
			return { start: dayStart, end: dayEnd }
		}
	}, [viewMode, currentDate])

	// Fetch bookings for visible range when it changes; use cache and prefetch adjacent month
	useEffect(() => {
		const key = getRangeKey(dateRange.start, dateRange.end)
		const cached = rangeCacheRef.current.get(key)
		if (cached) {
			setBookings(cached)
			return
		}
		let cancelled = false
		fetchAllBookings(userId, userName, { start: dateRange.start, end: dateRange.end }).then((data) => {
			if (!cancelled) {
				rangeCacheRef.current.set(key, data)
				setBookings(data)
			}
		})
		// Prefetch adjacent month for faster navigation
		if (viewMode === "month") {
			const prevMonthEnd = new Date(dateRange.start)
			prevMonthEnd.setDate(0)
			prevMonthEnd.setHours(23, 59, 59, 999)
			const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
			prevMonthStart.setHours(0, 0, 0, 0)
			const prevKey = getRangeKey(prevMonthStart, prevMonthEnd)
			if (!rangeCacheRef.current.has(prevKey)) {
				fetchAllBookings(userId, userName, { start: prevMonthStart, end: prevMonthEnd }).then((data) => {
					rangeCacheRef.current.set(prevKey, data)
				})
			}
			const nextMonthStart = new Date(dateRange.end)
			nextMonthStart.setDate(nextMonthStart.getDate() + 1)
			nextMonthStart.setHours(0, 0, 0, 0)
			const nextMonthEnd = new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth() + 1, 0)
			nextMonthEnd.setHours(23, 59, 59, 999)
			const nextKey = getRangeKey(nextMonthStart, nextMonthEnd)
			if (!rangeCacheRef.current.has(nextKey)) {
				fetchAllBookings(userId, userName, { start: nextMonthStart, end: nextMonthEnd }).then((data) => {
					rangeCacheRef.current.set(nextKey, data)
				})
			}
		}
		return () => {
			cancelled = true
		}
	}, [dateRange.start.getTime(), dateRange.end.getTime(), viewMode, userId, userName])

	// Memoize filtered bookings based on all filters
	const filteredBookings = useMemo(() => {
		return bookings.filter((booking) => {
			// Filter by appointment type
			if (filterType !== "all" && booking.appointmentType !== filterType) return false
			
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
			
			// Filter by task ownership (only for tasks mapped to OTHERS)
			// This filter applies to both admin and non-admin users
			if (booking.appointmentType === "OTHERS" && booking.type === "task" && taskOwnershipFilter !== "all") {
				if (taskOwnershipFilter === "my") {
					// Show only tasks where user is either assignee or creator
					// Handle null/undefined assigneeId properly
					const isAssignee = booking.assigneeId != null && booking.assigneeId === userId
					const isCreator = booking.creatorId != null && booking.creatorId === userId
					if (!isAssignee && !isCreator) {
						return false
					}
				} else if (taskOwnershipFilter === "teammate") {
					// Show only tasks where user is NOT assignee and NOT creator
					const isAssignee = booking.assigneeId != null && booking.assigneeId === userId
					const isCreator = booking.creatorId != null && booking.creatorId === userId
					if (isAssignee || isCreator) {
						return false
					}
				}
			}
			
			return true
		})
	}, [bookings, filterType, bookmarkScope, selectedProject, taskOwnershipFilter, isAdmin, userId])

	// Memoize bookings within current date range (parse YYYY-MM-DD as local to avoid timezone shift)
	const bookingsInDateRange = useMemo(() => {
		return filteredBookings.filter((booking) => {
			const bookingDate = parseLocalDateString(booking.date)
			bookingDate.setHours(0, 0, 0, 0)
			return bookingDate >= dateRange.start && bookingDate <= dateRange.end
		})
	}, [filteredBookings, dateRange])

	// Memoize bookings for stats (within date range)
	const statsBookings = useMemo(() => {
		return bookingsInDateRange
	}, [bookingsInDateRange])

	// Memoize upcoming bookings - use stable date calculation
	const upcomingBookings = useMemo(() => {
		// Use a stable "today" reference within the memo
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		return filteredBookings
			.filter((booking) => {
				const bookingDate = parseLocalDateString(booking.date)
				bookingDate.setHours(0, 0, 0, 0)
				return bookingDate >= today && bookingDate >= dateRange.start && bookingDate <= dateRange.end
			})
			.sort((a, b) => parseLocalDateString(a.date).getTime() - parseLocalDateString(b.date).getTime())
	}, [filteredBookings, dateRange])

	// Memoize bookings by date for calendar day view
	const bookingsByDate = useMemo(() => {
		const map = new Map<string, CalendarBooking[]>()
		filteredBookings.forEach((booking) => {
			const dateKey = booking.date
			if (!map.has(dateKey)) {
				map.set(dateKey, [])
			}
			map.get(dateKey)!.push(booking)
		})
		return map
	}, [filteredBookings])

	const getBookingsForDate = (date: string): CalendarBooking[] => {
		return bookingsByDate.get(date) || []
	}

	const handleDateChange = (newDate: Date) => {
		setCurrentDate(newDate)
	}

	const handleViewChange = (newView: CalendarView) => {
		setViewMode(newView)
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

	const getDaysInMonth = (date: Date) => {
		return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
	}

	const getFirstDayOfMonth = (date: Date) => {
		return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
	}

	const renderCalendarDays = () => {
		const daysInMonth = getDaysInMonth(currentDate)
		const firstDay = getFirstDayOfMonth(currentDate)
		const days = []

		// Empty cells for days before the first day of the month
		for (let i = 0; i < firstDay; i++) {
			days.push(<div key={`empty-${i}`} className="h-24 border border-border"></div>)
		}

		// Days of the month - use stable date formatting
		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
			const dateString = formatDate(date)
			const dayBookings = getBookingsForDate(dateString)
			// Use stable date comparison - format both dates consistently
			const todayString = formatDate(new Date())
			const isToday = dateString === todayString

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

	// Memoize stats counts
	const statsCounts = useMemo(() => {
		const counts: Record<string, number> = {}
		Object.keys(APPOINTMENT_TYPES).forEach((appointmentKey) => {
			counts[appointmentKey] = statsBookings.filter((b) => b.appointmentType === appointmentKey).length
		})
		return counts
	}, [statsBookings])

	return (
		<div className="calendar-page min-h-screen bg-background p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div>
							<p className="text-muted-foreground">Manage your team&apos;s bookings and events</p>
						</div>
						<div className="flex items-center gap-4">
							<Select value={filterType} onValueChange={setFilterType}>
								<SelectTrigger className="w-48">
									<Filter className="w-4 h-4 mr-2" />
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Appointments</SelectItem>
									{Object.entries(APPOINTMENT_TYPES).map(([key, config]) => (
										<SelectItem key={key} value={key}>
											{config.label}
										</SelectItem>
									))}
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
					</div>

					{/* Stats Cards */}
					<div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
						{Object.entries(APPOINTMENT_TYPES).map(([appointmentKey, config]) => {
							const count = statsCounts[appointmentKey] || 0
							return (
								<Card
									key={appointmentKey}
									className="bg-card border-border"
								>
									<CardContent className="p-4">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm text-muted-foreground">{config.label}</p>
												<p className="text-2xl font-bold text-foreground">
													{count}
												</p>
											</div>
											<div className={`w-3 h-3 rounded-full shrink-0 ${config.color}`} />
										</div>
									</CardContent>
								</Card>
							)
						})}
					</div>
				</div>

				{/* Calendar */}
				<Card className="bg-card border-border">
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-xl font-semibold text-foreground">
								Calendar
							</CardTitle>
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
						</div>
					</CardHeader>
					<CardContent>
						{viewMode === 'month' && (
							<>
								{/* Calendar Header */}
								<div className="grid grid-cols-7 gap-0 mb-2">
									{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
										<div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b border-border">
											{day}
										</div>
									))}
								</div>

								{/* Calendar Grid */}
								<div className="grid grid-cols-7 gap-0 border-l border-t border-border relative">
									{renderCalendarDays()}
								</div>
							</>
						)}
						
						{viewMode === 'week' && (
							<div className="h-[calc(100vh-400px)] min-h-[700px] overflow-hidden">
								<WeekView
									currentDate={currentDate}
									bookings={bookingsInDateRange}
									onEventClick={handleBookingClick}
									onDateClick={handleDateClick}
								/>
							</div>
						)}
						
						{viewMode === 'day' && (
							<div className="h-[calc(100vh-400px)] min-h-[700px] overflow-hidden">
								<DayView
									currentDate={currentDate}
									bookings={bookingsInDateRange}
									onEventClick={handleBookingClick}
								/>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Upcoming Appointments */}
				<Card className="mt-6 bg-card border-border">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-foreground">
							<Calendar className="w-5 h-5" />
							Upcoming Appointments
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{upcomingBookings
								.slice(0, 5)
								.map((booking) => {
									const borderColorClass = getBorderColorClass(booking.appointmentType)
									const badgeConfig = getBadgeClasses(booking.appointmentType)
									return (
										<div
											key={booking.id}
											className={`p-4 rounded-lg border-l-4 bg-muted border-border ${borderColorClass}`}
										>
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<h4 className="font-semibold text-foreground">{booking.title}</h4>
													<p className="text-sm text-muted-foreground mt-1">{booking.description}</p>
													<div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
														<div className="flex items-center gap-1">
															<Calendar className="w-3 h-3" />
															{formatDateStringDirect(booking.date)}
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
												<Badge variant={badgeConfig.variant} className={badgeConfig.className}>
													{APPOINTMENT_TYPES[booking.appointmentType]?.label || 'Others'}
												</Badge>
											</div>
										</div>
									)
								})}
							{upcomingBookings.length === 0 && (
								<div className="text-center py-8 text-muted-foreground">
									No upcoming appointments
								</div>
							)}
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

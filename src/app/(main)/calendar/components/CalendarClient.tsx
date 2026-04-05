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
import { BlockerFormDialog } from "./BlockerFormDialog"
import { fetchAllBookings, deleteCalendarBlocker, type CalendarBooking } from "../actions"
import { CALENDAR_EVENT_TYPES, type CalendarEventType } from "../constants"
import { Button } from "@/components/ui/button"
import { Download, ShieldAlert } from "lucide-react"
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
const getBorderColorClass = (appointmentType: CalendarEventType): string => {
	const borderColorMap: Record<CalendarEventType, string> = {
		PHOTO_SHOOT: "border-l-calendar-photo-shoot",
		VIDEO_SHOOT: "border-l-calendar-video-shoot",
		CONSULTATION: "border-l-calendar-consultation",
		PHOTO_SELECTION: "border-l-calendar-photo-selection",
		OTHERS: "border-l-calendar-others",
		LEAVE: "border-l-calendar-leave",
		BLOCKER: "border-l-calendar-blocker",
	}
	return borderColorMap[appointmentType] || "border-l-calendar-others"
}

// Map appointment type to badge classes using calendar theme tokens
const getBadgeClasses = (appointmentType: CalendarEventType): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } => {
	const badgeMap: Record<CalendarEventType, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
		PHOTO_SHOOT: { variant: "secondary", className: "bg-calendar-photo-shoot text-foreground" },
		VIDEO_SHOOT: { variant: "secondary", className: "bg-calendar-video-shoot text-foreground" },
		CONSULTATION: { variant: "secondary", className: "bg-calendar-consultation text-foreground" },
		PHOTO_SELECTION: { variant: "secondary", className: "bg-calendar-photo-selection text-foreground" },
		OTHERS: { variant: "secondary", className: "bg-calendar-others text-foreground" },
		LEAVE: { variant: "secondary", className: "bg-calendar-leave text-foreground" },
		BLOCKER: { variant: "secondary", className: "bg-calendar-blocker text-foreground" },
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
	const [isBlockerDialogOpen, setIsBlockerDialogOpen] = useState(false)
	const [editingBlocker, setEditingBlocker] = useState<{
		id: number
		title: string
		description: string | null
		startDateTime: string
		endDateTime: string
		blocksAppointments: boolean
		allDay?: boolean
	} | null>(null)

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
				if (booking.type !== "leave" && booking.projectId !== projectId) return false
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

	// Clear cache and refetch current range
	const refreshBookings = () => {
		rangeCacheRef.current.clear()
		fetchAllBookings(userId, userName, { start: dateRange.start, end: dateRange.end }).then((data) => {
			const key = getRangeKey(dateRange.start, dateRange.end)
			rangeCacheRef.current.set(key, data)
			setBookings(data)
		})
	}

	const handleBlockerSuccess = () => {
		setEditingBlocker(null)
		refreshBookings()
	}

	const handleBookingEdit = (booking: CalendarBooking) => {
		if (booking.type === "blocker" && isAdmin) {
			const data = booking.originalData as {
				blockerId: number
				blocksAppointments: boolean
				startDateTime: string
				endDateTime: string
				allDay?: boolean
			}
			setEditingBlocker({
				id: data.blockerId,
				title: booking.title,
				description: booking.description === `Blocker: ${booking.title}` ? null : booking.description,
				startDateTime: data.startDateTime,
				endDateTime: data.endDateTime,
				blocksAppointments: data.blocksAppointments,
				allDay: data.allDay,
			})
			setIsBlockerDialogOpen(true)
			setIsDetailsDialogOpen(false)
		}
	}

	const handleBookingDelete = async (booking: CalendarBooking) => {
		if (booking.type === "blocker" && isAdmin) {
			const data = booking.originalData as { blockerId: number }
			const result = await deleteCalendarBlocker(data.blockerId)
			if (result.success) {
				setIsDetailsDialogOpen(false)
				setSelectedBooking(null)
				refreshBookings()
			}
		}
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
		Object.keys(CALENDAR_EVENT_TYPES).forEach((appointmentKey) => {
			counts[appointmentKey] = statsBookings.filter((b) => b.appointmentType === appointmentKey).length
		})
		return counts
	}, [statsBookings])

	return (
		<div className="calendar-page min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-6">
			<div className="max-w-7xl mx-auto">
				{/* Page intro + filters */}
				<div className="mb-5 sm:mb-6 space-y-4">
					<div>
						<h1 className="text-lg font-semibold text-foreground tracking-tight sm:text-xl">
							Calendar
						</h1>
						<p className="text-sm text-muted-foreground mt-0.5">
							Manage your team&apos;s bookings and events
						</p>
					</div>

					<div className="rounded-lg border border-border bg-card p-3 sm:p-4">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">
							Filters
						</p>
						<div className="flex flex-wrap items-center gap-2 sm:gap-3">
							<Select value={filterType} onValueChange={setFilterType}>
								<SelectTrigger className="h-9 w-full min-w-0 sm:w-[min(100%,11rem)] border-border bg-background text-sm">
									<Filter className="w-3.5 h-3.5 mr-1.5 shrink-0 opacity-70" />
									<SelectValue placeholder="Type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All types</SelectItem>
									{Object.entries(CALENDAR_EVENT_TYPES).map(([key, config]) => (
										<SelectItem key={key} value={key}>
											{config.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select value={taskOwnershipFilter} onValueChange={setTaskOwnershipFilter}>
								<SelectTrigger className="h-9 w-full min-w-0 sm:w-[min(100%,9.5rem)] border-border bg-background text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All tasks</SelectItem>
									<SelectItem value="my">My tasks</SelectItem>
									<SelectItem value="teammate">Teammate tasks</SelectItem>
								</SelectContent>
							</Select>

							{!isAdmin && (
								<>
									<Select value={bookmarkScope} onValueChange={setBookmarkScope}>
										<SelectTrigger className="h-9 w-full min-w-0 sm:w-[min(100%,9.5rem)] border-border bg-background text-sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All bookings</SelectItem>
											<SelectItem value="own">My bookings</SelectItem>
											<SelectItem value="team">Team bookings</SelectItem>
										</SelectContent>
									</Select>

									{projects.length > 0 && (
										<Select value={selectedProject} onValueChange={setSelectedProject}>
											<SelectTrigger className="h-9 w-full min-w-0 sm:w-[min(100%,12rem)] border-border bg-background text-sm">
												<SelectValue placeholder="Project" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All projects</SelectItem>
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

					{/* Compact legend + counts (single row on wide screens) */}
					<div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 sm:px-4 sm:py-3">
						<p className="text-xs font-medium text-muted-foreground mb-2 sm:mb-2.5">
							Counts in this period
						</p>
						<div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
							{Object.entries(CALENDAR_EVENT_TYPES).map(([appointmentKey, config]) => {
								const count = statsCounts[appointmentKey] || 0
								return (
									<div
										key={appointmentKey}
										className="flex items-center gap-2 min-w-0 rounded-md bg-card/80 px-2 py-1.5 border border-border/60"
									>
										<span
											className={`h-2 w-2 shrink-0 rounded-full ring-1 ring-border/50 ${config.color}`}
											aria-hidden
										/>
										<div className="min-w-0 flex-1">
											<p className="text-[11px] leading-tight text-muted-foreground truncate sm:text-xs">
												{config.label}
											</p>
											<p className="text-sm font-semibold tabular-nums text-foreground leading-none mt-0.5">
												{count}
											</p>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>

				{/* Calendar */}
				<Card className="bg-card border-border overflow-hidden">
					<CardHeader className="space-y-0 pb-4 pt-4 px-4 sm:px-6 sm:pt-5">
						<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
							<div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:flex-1 lg:min-w-0 lg:justify-end lg:order-2">
								<ViewSwitcher
									currentView={viewMode}
									onViewChange={handleViewChange}
								/>
								{isAdmin && (
									<Button
										size="sm"
										variant="default"
										onClick={() => {
											setEditingBlocker(null)
											setIsBlockerDialogOpen(true)
										}}
										className="shrink-0 gap-1.5 h-9"
									>
										<ShieldAlert className="w-3.5 h-3.5" />
										Blocker
									</Button>
								)}
								<Button
									size="sm"
									variant="outline"
									onClick={() => setIsExportDialogOpen(true)}
									className="shrink-0 gap-1.5 h-9"
								>
									<Download className="w-3.5 h-3.5" />
									Export
								</Button>
							</div>
							<div className="w-full min-w-0 lg:order-1 lg:max-w-md xl:max-w-lg">
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
															<div className="flex items-center gap-1">
																<Clock className="w-3 h-3" />
																{booking.startTime} - {booking.endTime}
															</div>
														)}
														{booking.type === "appointment" && (
															<div className="flex items-center gap-1">
																<Users className="w-3 h-3" />
																{booking.attendees} attendees
															</div>
														)}
														{booking.type !== "task" && (
															<div className="flex items-center gap-1">
																<MapPin className="w-3 h-3" />
																{booking.location}
															</div>
														)}
													</div>
												</div>
												<Badge variant={badgeConfig.variant} className={badgeConfig.className}>
													{CALENDAR_EVENT_TYPES[booking.appointmentType]?.label || "Others"}
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
					isAdmin={isAdmin}
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

				{/* Blocker Form Dialog (admin only) */}
				{isAdmin && (
					<BlockerFormDialog
						open={isBlockerDialogOpen}
						onOpenChange={(open) => {
							setIsBlockerDialogOpen(open)
							if (!open) setEditingBlocker(null)
						}}
						blocker={editingBlocker}
						onSuccess={handleBlockerSuccess}
					/>
				)}
			</div>
		</div>
	)
}

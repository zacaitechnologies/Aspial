"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Download, ShieldAlert, Sun, PanelLeftClose, PanelLeftOpen, SlidersHorizontal } from "lucide-react"
import { CalendarDay } from "./CalendarDay"
import { BookingDetailsDialog } from "./BookingDetailsDialog"
import { DateEventsDialog } from "./DateEventsDialog"
import { MonthDayDialog } from "./MonthDayDialog"
import { DatePicker } from "./DatePicker"
import { ExportCalendarDialog } from "./ExportCalendarDialog"
import { ViewSwitcher } from "./ViewSwitcher"
import { WeekView } from "./WeekView"
import { DayView } from "./DayView"
import { BlockerFormDialog } from "./BlockerFormDialog"
import { AppointmentBookingDialog } from "./AppointmentBookingDialog"
import { EditBookingDialog } from "./EditBookingDialog"
import { fetchAllBookings, deleteCalendarBlocker, type CalendarBooking } from "../actions"
import { cancelAppointmentBooking } from "@/app/(main)/appointment-bookings/actions"
import { CALENDAR_EVENT_TYPES, type AppointmentType, type CalendarEventType } from "../constants"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { parseLocalDateString, formatLocalDate } from "@/lib/date-utils"
import { CalendarView, getWeekDays, formatDate } from "../utils/calendar-utils"
import { calToolbarControlClass } from "../utils/calendar-toolbar-styles"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CalendarEventTooltip, CalendarEventTooltipProvider } from "./CalendarEventTooltip"
import {
	calendarEventMetaClass,
	calendarEventSurfaceClass,
} from "../utils/event-surface-styles"

interface AvailableAppointment {
	id: number
	name: string
	location: string | null
	brand: string | null
	description: string | null
	appointmentType: string
}

interface CalendarClientProps {
	initialBookings: CalendarBooking[]
	initialIsAdmin: boolean
	initialAppointments: AvailableAppointment[]
	userId: string
	userName: string
}

// Map appointment type to its CSS color variable (legend dots)
const TYPE_CSS_VAR: Record<CalendarEventType, string> = {
	PHOTO_SHOOT: "var(--calendar-photo-shoot)",
	VIDEO_SHOOT: "var(--calendar-video-shoot)",
	CONSULTATION: "var(--calendar-consultation)",
	PHOTO_SELECTION: "var(--calendar-photo-selection)",
	OTHERS: "var(--calendar-others)",
	LEAVE: "var(--calendar-leave)",
	BLOCKER: "var(--calendar-blocker)",
}

export default function CalendarClient({
	initialBookings,
	initialIsAdmin,
	initialAppointments,
	userId,
	userName,
}: CalendarClientProps) {
	const { toast } = useToast()
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
	const [isSidebarOpen, setIsSidebarOpen] = useState(true)
	const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
	const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
	const [selectedDate, setSelectedDate] = useState<string>("")
	const [isDateEventsDialogOpen, setIsDateEventsDialogOpen] = useState(false)
	const [isMonthDayDialogOpen, setIsMonthDayDialogOpen] = useState(false)
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

	// Appointment booking dialog state
	const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
	const [bookingInitialDate, setBookingInitialDate] = useState("")
	const [bookingInitialTime, setBookingInitialTime] = useState<string | null>(null)
	const [bookingInitialEndTime, setBookingInitialEndTime] = useState<string | null>(null)
	const [bookingInitialType, setBookingInitialType] = useState<AppointmentType | null>(null)

	// Edit booking dialog state
	const [isEditBookingDialogOpen, setIsEditBookingDialogOpen] = useState(false)
	const [editingBooking, setEditingBooking] = useState<CalendarBooking | null>(null)

	const isAdmin = initialIsAdmin

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
			
			// Filter by ownership: default shows everyone's appointments; "own" narrows to the user's bookings
			if (bookmarkScope === "own") {
				if (booking.type === "blocker") return true
				if (!booking.isUserBooking) return false
			}

			return true
		})
	}, [bookings, filterType, bookmarkScope])

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

	// Today's bookings — for the "Today" stat card
	const todaysBookings = useMemo(() => {
		const todayKey = formatLocalDate(new Date())
		return filteredBookings
			.filter((b) => b.date === todayKey)
			.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
	}, [filteredBookings])

	const handleDateChange = (newDate: Date) => {
		setCurrentDate(newDate)
	}

	// Month-cell click: open the multi-column day popup (one column per appointment type)
	const handleMonthDayClick = (dateString: string) => {
		setSelectedDate(dateString)
		setIsMonthDayDialogOpen(true)
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

  const handleBookAppointment = (
    date: string,
    time?: string | null,
    appointmentType?: AppointmentType | null,
    endTime?: string | null,
  ) => {
    setBookingInitialDate(date)
    setBookingInitialTime(time || null)
    setBookingInitialEndTime(endTime || null)
    setBookingInitialType(appointmentType || null)
    setIsDateEventsDialogOpen(false)
    setIsMonthDayDialogOpen(false)
    setIsBookingDialogOpen(true)
  }

  const handleBookAtTimeFromDetails = (booking: CalendarBooking) => {
    const time = booking.startTime.slice(0, 5)
    handleBookAppointment(booking.date, time)
    setIsDetailsDialogOpen(false)
    setSelectedBooking(null)
  }

	const handleTimeSlotClick = (date: string, hourOrTime: number | string) => {
		const time = typeof hourOrTime === "number"
			? `${String(hourOrTime).padStart(2, "0")}:00`
			: String(hourOrTime)
		handleBookAppointment(date, time)
	}

	const handleEditBooking = (booking: CalendarBooking) => {
		setEditingBooking(booking)
		setIsDetailsDialogOpen(false)
		setIsEditBookingDialogOpen(true)
	}

	const handleCancelBooking = async (booking: CalendarBooking) => {
		const idMatch = booking.id.match(/appointment-(\d+)/)
		if (!idMatch) return

		const numericId = parseInt(idMatch[1])
		const result = await cancelAppointmentBooking(numericId)
		if (result.success) {
			toast({ title: "Booking Cancelled", description: "The appointment booking has been cancelled." })
			setIsDetailsDialogOpen(false)
			setSelectedBooking(null)
			refreshBookings()
		} else {
			toast({ title: "Error", description: result.error || "Failed to cancel booking", variant: "destructive" })
		}
	}

	const handleBookingSuccess = () => {
		refreshBookings()
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

		for (let i = 0; i < firstDay; i++) {
			days.push(
				<div
					key={`pad-${i}`}
					className="cal-day-cell cal-day-cell--empty"
					aria-hidden
				/>
			)
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
			const dateString = formatDate(date)
			const dayBookings = getBookingsForDate(dateString)
			const todayString = formatDate(new Date())
			const isToday = dateString === todayString

			days.push(
				<CalendarDay
					key={dateString}
					day={day}
					date={date}
					dateString={dateString}
					dayBookings={dayBookings}
					isToday={isToday}
					onDateClick={handleMonthDayClick}
				/>
			)
		}

		return days
	}

	// Memoize stats counts. Pending leave is excluded from the LEAVE bucket — only approved leave counts.
	const statsCounts = useMemo(() => {
		const counts: Record<string, number> = {}
		Object.keys(CALENDAR_EVENT_TYPES).forEach((appointmentKey) => {
			counts[appointmentKey] = statsBookings.filter((b) => {
				if (b.appointmentType !== appointmentKey) return false
				if (b.appointmentType === "LEAVE") {
					const status = (b.originalData as { status?: string } | null)?.status
					return status !== "PENDING"
				}
				return true
			}).length
		})
		return counts
	}, [statsBookings])

	const renderSidebarContent = (layout: "desktop" | "mobile") => (
		<div className={cn("space-y-3", layout === "mobile" && "pb-4")}>
			<div className="shrink-0 rounded-lg border border-border bg-card p-3">
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">
					Filters
				</p>
				<div className="space-y-2.5">
					<Select value={filterType} onValueChange={setFilterType}>
						<SelectTrigger className="h-9 w-full border-border bg-background text-sm">
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

					<Select value={bookmarkScope} onValueChange={setBookmarkScope}>
						<SelectTrigger className="h-9 w-full border-border bg-background text-sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All bookings</SelectItem>
							<SelectItem value="own">My bookings</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="cal-sidebar-today flex min-h-0 flex-col rounded-lg border border-border bg-card p-3">
				<div className="flex shrink-0 items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Sun className="w-4 h-4 text-muted-foreground" aria-hidden />
						<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
							Today
						</p>
					</div>
					<span className="text-xs font-semibold tabular-nums text-muted-foreground">
						{todaysBookings.length}
					</span>
				</div>

				{todaysBookings.length === 0 ? (
					<p className="mt-3 text-xs text-muted-foreground">No appointments today</p>
				) : (
					<div className="cal-sidebar-today-list hide-scrollbar mt-2 min-h-0 max-h-32 space-y-2 overflow-y-auto">
						{todaysBookings.map((b) => (
							<CalendarEventTooltip key={b.id} booking={b} side="right" align="start">
								<button
									type="button"
									onClick={() => handleBookingClick(b)}
									className={cn(
										"cal-sidebar-event w-full text-left rounded-md px-2 py-1.5 shadow-sm transition-all hover:shadow-md hover:brightness-[0.98]",
										calendarEventSurfaceClass(b.appointmentType)
									)}
								>
									<div className="flex items-center gap-2 min-w-0">
										<span
											className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/40"
											style={{ backgroundColor: TYPE_CSS_VAR[b.appointmentType] }}
											aria-hidden
										/>
										<h4 className="truncate text-sm font-semibold min-w-0 flex-1">{b.title}</h4>
										{b.type !== "task" && b.startTime && (
											<span className={cn("shrink-0 text-[11px] font-medium tabular-nums", calendarEventMetaClass)}>
												{b.startTime}
											</span>
										)}
									</div>
								</button>
							</CalendarEventTooltip>
						))}
					</div>
				)}
			</div>

			<div className="cal-sidebar-legend shrink-0 rounded-lg border border-border bg-card p-3">
				<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
					Legend
				</p>
				<div className="space-y-1.5">
					{Object.entries(CALENDAR_EVENT_TYPES).map(([key, config]) => {
						const count = statsCounts[key] || 0
						const typeKey = key as CalendarEventType
						return (
							<div
								key={key}
								className={cn(
									"cal-sidebar-legend-item flex items-center justify-between rounded-md border px-2.5 py-1.5",
									calendarEventSurfaceClass(typeKey)
								)}
							>
								<div className="flex items-center gap-2 min-w-0">
									<span
										className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/40"
										style={{ backgroundColor: TYPE_CSS_VAR[typeKey] }}
										aria-hidden
									/>
									<p className="truncate text-[11px] font-medium">{config.label}</p>
								</div>
								<span className="text-xs font-semibold tabular-nums">{count}</span>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)

	return (
		<CalendarEventTooltipProvider>
		<div className="calendar-page min-h-screen bg-background px-4 pt-[5px] pb-5 sm:px-6 sm:pb-6">
			<div className="max-w-[92rem] mx-auto">
				<div className="flex items-start gap-2 lg:gap-3">
					<aside className="hidden lg:block shrink-0 sticky top-4 self-start">
						{isSidebarOpen ? (
							<div className="cal-sidebar-panel flex w-[21rem] flex-col">
								<div className="cal-sidebar-header flex shrink-0 items-center justify-between gap-2 py-1.5">
									<h2 className="text-sm font-semibold leading-none text-foreground">
										Calendar Panel
									</h2>
									<Button
										size="icon"
										variant="ghost"
										className="h-7 w-7"
										onClick={() => setIsSidebarOpen(false)}
										aria-label="Collapse sidebar"
									>
										<PanelLeftClose className="h-4 w-4" />
									</Button>
								</div>
								<div className="cal-sidebar-body pt-2">
									{renderSidebarContent("desktop")}
								</div>
							</div>
						) : (
							<div className="cal-sidebar-rail w-10">
								<Button
									size="icon"
									variant="ghost"
									className="h-9 w-9"
									onClick={() => setIsSidebarOpen(true)}
									aria-label="Expand sidebar"
								>
									<PanelLeftOpen className="h-4 w-4" />
								</Button>
							</div>
						)}
					</aside>

					<div className="min-w-0 flex-1">
						{/* Calendar */}
						<Card className="cal-toolbar-card overflow-hidden !gap-0 !border-0 !bg-transparent !py-0 !px-0 !shadow-none">
							<div className="cal-toolbar border-b border-border px-0 py-3">
								<div className="min-w-0 w-full">
									<DatePicker
										currentDate={currentDate}
										onDateChange={handleDateChange}
										viewMode={viewMode}
									/>
								</div>
								<div className="cal-toolbar-actions mt-3 flex flex-wrap items-center gap-2 xl:mt-0 xl:justify-end">
									<Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
										<Button
											size="sm"
											variant="outline"
											onClick={() => setIsMobileFiltersOpen(true)}
											className={cn("lg:hidden shrink-0 gap-1.5", calToolbarControlClass)}
										>
											<SlidersHorizontal className="w-3.5 h-3.5" />
											Panel
										</Button>
										<SheetContent side="left" className="w-[88vw] max-w-sm p-0">
											<SheetHeader className="border-b border-border px-4 py-3">
												<SheetTitle>Calendar Panel</SheetTitle>
												<SheetDescription>
													Filters, today snapshot, and event legend.
												</SheetDescription>
											</SheetHeader>
											<div className="hide-scrollbar max-h-[calc(100vh-5rem)] overflow-y-auto px-4 pt-3">
												{renderSidebarContent("mobile")}
											</div>
										</SheetContent>
									</Sheet>
									<ViewSwitcher
										currentView={viewMode}
										onViewChange={handleViewChange}
									/>
									{isAdmin && (
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												setEditingBlocker(null)
												setIsBlockerDialogOpen(true)
											}}
											className={cn("shrink-0 gap-1.5", calToolbarControlClass)}
										>
											<ShieldAlert className="w-3.5 h-3.5" />
											<span className="hidden sm:inline">Blocker</span>
										</Button>
									)}
									<Button
										size="sm"
										variant="outline"
										onClick={() => setIsExportDialogOpen(true)}
										className={cn("shrink-0 gap-1.5", calToolbarControlClass)}
									>
										<Download className="w-3.5 h-3.5" />
										<span className="hidden sm:inline">Export</span>
									</Button>
								</div>
							</div>
					<CardContent className="!p-0 !bg-transparent">
						{viewMode === 'month' && (
							<>
								{/* Calendar Header */}
								<div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
									{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
										<div key={day} className="p-2 text-center text-sm font-bold text-primary">
											{day}
										</div>
									))}
								</div>

								{/* Calendar Grid */}
								<div className="cal-month-grid grid grid-cols-7 gap-1 sm:gap-1.5 relative">
									{renderCalendarDays()}
								</div>
							</>
						)}

						{viewMode === 'week' && (
							<div className="cal-week-day-grid h-[calc(100vh-360px)] min-h-[600px] overflow-hidden">
								<WeekView
									currentDate={currentDate}
									bookings={bookingsInDateRange}
									onEventClick={handleBookingClick}
									onDateClick={handleDateClick}
									onTimeSlotClick={handleTimeSlotClick}
								/>
							</div>
						)}

						{viewMode === 'day' && (
							<div className="cal-week-day-grid h-[calc(100vh-400px)] min-h-[700px] overflow-hidden">
								<DayView
									currentDate={currentDate}
									bookings={bookingsInDateRange}
									onEventClick={handleBookingClick}
									onTimeSlotClick={handleTimeSlotClick}
								/>
							</div>
						)}
					</CardContent>
				</Card>
					</div>
				</div>

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
					onEditBooking={handleEditBooking}
					onCancelBooking={handleCancelBooking}
					onBookAtTime={handleBookAtTimeFromDetails}
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
					onBookAppointment={(date) => handleBookAppointment(date)}
				/>

				{/* Month-day multi-column popup */}
				<MonthDayDialog
					isOpen={isMonthDayDialogOpen}
					onClose={() => {
						setIsMonthDayDialogOpen(false)
						setSelectedDate("")
					}}
					date={selectedDate}
					events={getBookingsForDate(selectedDate)}
					onEventClick={(event) => {
						setSelectedBooking(event)
						setIsMonthDayDialogOpen(false)
						setIsDetailsDialogOpen(true)
					}}
					onBookSlot={(date, time, appointmentType) =>
						handleBookAppointment(date, time, appointmentType)
					}
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

				{/* Appointment Booking Dialog */}
				<AppointmentBookingDialog
					isOpen={isBookingDialogOpen}
					onClose={() => {
						setIsBookingDialogOpen(false)
						setBookingInitialDate("")
						setBookingInitialTime(null)
						setBookingInitialEndTime(null)
						setBookingInitialType(null)
					}}
					initialDate={bookingInitialDate}
					initialTime={bookingInitialTime}
					initialEndTime={bookingInitialEndTime}
					initialAppointmentType={bookingInitialType}
					appointments={initialAppointments}
					userId={userId}
					userName={userName}
					onSuccess={handleBookingSuccess}
				/>

				{/* Edit Booking Dialog */}
				<EditBookingDialog
					isOpen={isEditBookingDialogOpen}
					onClose={() => {
						setIsEditBookingDialogOpen(false)
						setEditingBooking(null)
					}}
					booking={editingBooking}
					userName={userName}
					isAdmin={isAdmin}
					onSuccess={handleBookingSuccess}
				/>
			</div>
		</div>
		</CalendarEventTooltipProvider>
	)
}

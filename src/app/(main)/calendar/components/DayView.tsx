"use client"

import { type CalendarBooking } from "../actions"
import {
	formatDate,
	getDetailedTimeSlots,
	getCalendarGridTimeRange,
	getTimedEventTopPx,
	getTimedEventHeightPx,
	isCalendarAllDayRowEvent,
	isCalendarEventPast,
	isToday,
	layoutOverlappingEvents,
} from "../utils/calendar-utils"
import { CALENDAR_GRID_START_HOUR } from "../constants"
import { getCalendarEventDisplayTitle } from "../utils/appointment-display"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, Clock, MapPin, StickyNote, UserCircle, Users } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { CurrentTimeLine } from "./CurrentTimeLine"
import { useCurrentTime } from "../hooks/useCurrentTime"
import { useScrollToCurrentTime } from "../hooks/useScrollToCurrentTime"
import { CalendarEventTooltip } from "./CalendarEventTooltip"
import {
	calendarEventBadgeClass,
	calendarEventCancelledClass,
	calendarEventMetaClass,
	calendarEventPastClass,
	calendarBookingSurfaceClass,
} from "../utils/event-surface-styles"

interface DayViewProps {
	currentDate: Date
	bookings: CalendarBooking[]
	onEventClick: (event: CalendarBooking) => void
	onTimeSlotClick?: (date: string, time: string) => void
}

const bookingTypeLabels: Record<CalendarBooking["type"], string> = {
	appointment: "Appointment",
	task: "Task",
	leave: "Leave",
	blocker: "Blocker",
}

const eventCardClassName =
	"cursor-pointer rounded-md shadow-sm transition-all hover:shadow-md hover:brightness-[0.98]"

export function DayView({
	currentDate,
	bookings,
	onEventClick,
	onTimeSlotClick,
}: DayViewProps) {
	const dateString = formatDate(currentDate)
	const today = isToday(currentDate)
	const scrollRef = useRef<HTMLDivElement>(null)
	const [allDayCollapsed, setAllDayCollapsed] = useState(false)
	const HALF_HOUR_HEIGHT = 60
	const HOUR_HEIGHT = HALF_HOUR_HEIGHT * 2
	const now = useCurrentTime()

	useScrollToCurrentTime(scrollRef, HOUR_HEIGHT, today, dateString)

	// Get events for the day
	const dayEvents = useMemo(
		() => bookings.filter(event => event.date === dateString),
		[bookings, dateString]
	)
	
	// All-day row: show Blockers first, then Leave, then any other all-day events.
	const allDayEvents = useMemo(() => {
		const allDayRank = (e: CalendarBooking) =>
			e.type === "blocker" ? 0 : e.type === "leave" ? 1 : 2
		return dayEvents
			.filter(isCalendarAllDayRowEvent)
			.sort((a, b) => allDayRank(a) - allDayRank(b))
	}, [dayEvents])
	
	const timedEvents = useMemo(
		() => dayEvents.filter((e) => !isCalendarAllDayRowEvent(e)),
		[dayEvents]
	)
	
	const timeRange = useMemo(() => getCalendarGridTimeRange(), [])
	
	// Generate time slots (30-minute intervals)
	const timeSlots = useMemo(
		() => getDetailedTimeSlots(timeRange.start, timeRange.end),
		[timeRange]
	)
	
	const eventLayouts = useMemo(
		() => layoutOverlappingEvents(timedEvents),
		[timedEvents]
	)
	
	return (
		<div className="flex flex-col h-full">
			{/* Day Header — matches week view day-name row */}
			<div
				className={cn(
					"px-3 py-2 sm:px-4 border-b border-border",
					today ? "cal-week-day-header--today" : "cal-week-subtle-bg",
				)}
			>
				<div className="flex items-center justify-between gap-2">
					<div className="min-w-0">
						<h3
							className={cn(
								"text-lg sm:text-2xl font-bold truncate",
								today ? "text-primary-foreground" : "text-foreground",
							)}
						>
							{currentDate.toLocaleDateString("en-US", {
								weekday: "long",
								month: "long",
								day: "numeric",
								year: "numeric",
							})}
						</h3>
						{today && (
							<p className="mt-1 text-xs sm:text-sm text-primary-foreground/85">
								Today
							</p>
						)}
					</div>
					<div className="shrink-0 text-right">
						<div
							className={cn(
								"text-xs sm:text-sm",
								today ? "text-primary-foreground" : "text-muted-foreground",
							)}
						>
							{dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
						</div>
					</div>
				</div>
			</div>

			{/* All Day Events — compact, collapsible row */}
			{allDayEvents.length > 0 && (
				<div className="flex border-b-2 border-border cal-week-subtle-bg">
					<button
						type="button"
						onClick={() => setAllDayCollapsed((v) => !v)}
						aria-expanded={!allDayCollapsed}
						className="w-12 shrink-0 border-r border-border cal-week-slot-bg p-2 text-[9px] sm:w-16 sm:text-[10px] md:w-20 text-muted-foreground font-medium flex items-start gap-0.5 pt-2 hover:text-foreground transition-colors"
					>
						{allDayCollapsed ? (
							<ChevronRight className="w-3 h-3 shrink-0 mt-px" />
						) : (
							<ChevronDown className="w-3 h-3 shrink-0 mt-px" />
						)}
						<span className="text-left leading-tight">All day · {allDayEvents.length}</span>
					</button>
					<div
						className={cn(
							"flex-1 p-1.5 sm:p-2",
							today ? "cal-week-column--today" : "cal-week-grid-bg",
						)}
					>
						{allDayCollapsed ? (
							<button
								type="button"
								onClick={() => setAllDayCollapsed(false)}
								className="text-[11px] text-muted-foreground hover:text-foreground"
							>
								Show {allDayEvents.length} all-day event{allDayEvents.length === 1 ? "" : "s"}
							</button>
						) : (
							<div className="max-h-[120px] overflow-y-auto space-y-1 pr-1">
								{allDayEvents.map((event) => (
									<CalendarEventTooltip key={event.id} booking={event} side="top">
										<div
											className={cn(
												"text-xs px-2 py-1 rounded-md cursor-pointer truncate leading-tight font-medium transition-shadow hover:shadow-sm",
												calendarBookingSurfaceClass(event),
												event.type === "appointment" && event.status === "cancelled" && calendarEventCancelledClass,
												isCalendarEventPast(event, now) && calendarEventPastClass,
											)}
											onClick={() => onEventClick(event)}
										>
											{getCalendarEventDisplayTitle(event)}
										</div>
									</CalendarEventTooltip>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Time Slots */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto relative hide-scrollbar">
				<div className="relative flex" style={{ minHeight: timeSlots.length * HALF_HOUR_HEIGHT }}>
					{/* Time gutter — light grey, matches week view */}
					<div className="w-12 sm:w-16 md:w-20 shrink-0 border-r border-border cal-week-slot-bg">
						{timeSlots.map((slot) => {
							const isHourMark = slot.endsWith(":00")
							return (
								<div
									key={slot}
									className={cn(
										"p-1 sm:p-2 text-[10px] sm:text-xs text-muted-foreground cal-week-slot-bg",
										isHourMark ? "font-medium border-t border-border" : "border-t border-border/30",
									)}
									style={{ height: HALF_HOUR_HEIGHT }}
								>
									{isHourMark ? slot : ""}
								</div>
							)
						})}
					</div>

					{/* Day column — white grid; today gets column tint like week view */}
					<div className={cn("flex-1 relative", today && "cal-week-column--today")}>
						{today && (
							<div className="absolute inset-0 z-[35] pointer-events-none">
								<CurrentTimeLine
									hourHeightPx={HOUR_HEIGHT}
									startHour={CALENDAR_GRID_START_HOUR}
									showLabel
								/>
							</div>
						)}

						{/* Background slot grid for click + visual lines */}
						{timeSlots.map((slot) => {
							const isHourMark = slot.endsWith(':00')
							return (
								<div
									key={slot}
									className={cn(
										isHourMark ? "border-t border-border" : "border-t border-border/30",
										"cal-time-grid-slot",
										today && "cal-time-grid-slot--today-col",
									)}
									style={{ height: HALF_HOUR_HEIGHT }}
									onClick={() => {
										if (onTimeSlotClick) onTimeSlotClick(dateString, slot)
									}}
								/>
							)
						})}

						{/* Absolute-positioned event cards */}
						{eventLayouts.map(({ event, column, totalColumns }) => {
							const top = getTimedEventTopPx(
								event.startTime,
								CALENDAR_GRID_START_HOUR,
								HOUR_HEIGHT
							)
							const height = getTimedEventHeightPx(
								event.startTime,
								event.endTime,
								CALENDAR_GRID_START_HOUR,
								HOUR_HEIGHT,
								40,
								4
							)
							if (height <= 0) return null
							const widthPct = 100 / totalColumns
							const leftPct = column * widthPct
							return (
								<CalendarEventTooltip key={event.id} booking={event} side="top">
									<div
										className={cn(
											"absolute z-10 overflow-hidden p-2",
											eventCardClassName,
											calendarBookingSurfaceClass(event),
											event.type === "appointment" && event.status === "cancelled" && calendarEventCancelledClass,
											isCalendarEventPast(event, now) && calendarEventPastClass,
										)}
										style={{
											top,
											height,
											left: `calc(${leftPct}% + 2px)`,
											width: `calc(${widthPct}% - 4px)`,
										}}
										onClick={(e) => {
											e.stopPropagation()
											onEventClick(event)
										}}
									>
									<div className="flex items-center gap-1.5 mb-1 min-w-0">
										<Badge
											variant="outline"
											className={cn(calendarEventBadgeClass, "px-1.5 py-0")}
										>
											{bookingTypeLabels[event.type]}
										</Badge>
										<h4 className="font-semibold truncate text-sm min-w-0">
											{getCalendarEventDisplayTitle(event)}
										</h4>
									</div>
									<div className={cn("flex flex-wrap items-center gap-3", calendarEventMetaClass)}>
										<div className="flex items-center gap-1">
											<Clock className="w-3 h-3 shrink-0" />
											{event.startTime} - {event.endTime}
										</div>
										{event.location && (
											<div className="flex items-center gap-1 min-w-0">
												<MapPin className="w-3 h-3 shrink-0" />
												<span className="truncate">{event.location}</span>
											</div>
										)}
										{event.attendees > 1 && (
											<div className="flex items-center gap-1">
												<Users className="w-3 h-3" />
												{event.attendees}
											</div>
										)}
										{event.assigneeNames && event.assigneeNames.length > 0 && (
											<div className="flex items-center gap-1 min-w-0">
												<UserCircle className="w-3 h-3 shrink-0" />
												<span className="truncate">{event.assigneeNames.join(", ")}</span>
											</div>
										)}
									</div>
									{event.remarks && (
										<div className={cn("mt-1 flex items-start gap-1 min-w-0", calendarEventMetaClass)}>
											<StickyNote className="w-3 h-3 shrink-0 mt-px" />
											<span className="line-clamp-2 min-w-0">{event.remarks}</span>
										</div>
									)}
								</div>
								</CalendarEventTooltip>
							)
						})}
					</div>
				</div>
			</div>
		</div>
	)
}

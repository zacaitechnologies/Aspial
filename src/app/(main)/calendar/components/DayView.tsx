"use client"

import { type CalendarBooking } from "../actions"
import {
	formatDate,
	getDetailedTimeSlots,
	parseTime,
	isCalendarAllDayRowEvent,
	isCalendarEventPast,
	isToday,
	layoutOverlappingEvents,
} from "../utils/calendar-utils"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Clock, MapPin, Users } from "lucide-react"
import { useMemo, useRef } from "react"
import { CurrentTimeLine } from "./CurrentTimeLine"
import { useCurrentTime } from "../hooks/useCurrentTime"
import { useScrollToCurrentTime } from "../hooks/useScrollToCurrentTime"
import { CalendarEventTooltip } from "./CalendarEventTooltip"
import {
	calendarEventBadgeClass,
	calendarEventMetaClass,
	calendarEventPastClass,
	calendarEventSurfaceClass,
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
	const HALF_HOUR_HEIGHT = 60
	const HOUR_HEIGHT = HALF_HOUR_HEIGHT * 2
	const now = useCurrentTime()

	useScrollToCurrentTime(scrollRef, HOUR_HEIGHT, today)

	// Get events for the day
	const dayEvents = useMemo(
		() => bookings.filter(event => event.date === dateString),
		[bookings, dateString]
	)
	
	const allDayEvents = useMemo(
		() => dayEvents.filter(isCalendarAllDayRowEvent),
		[dayEvents]
	)
	
	const timedEvents = useMemo(
		() => dayEvents.filter((e) => !isCalendarAllDayRowEvent(e)),
		[dayEvents]
	)
	
	// Calculate relevant time range - show full 24 hours
	const timeRange = useMemo(
		() => ({ start: 0, end: 24 }),
		[]
	)
	
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
							<p
								className="mt-1 text-xs sm:text-sm"
								style={{ color: "var(--primary-foreground)", opacity: 0.85 }}
							>
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

			{/* All Day Events — matches week view all-day row */}
			{allDayEvents.length > 0 && (
				<div className="flex border-b-2 border-border cal-week-subtle-bg">
					<div className="w-12 shrink-0 border-r border-border cal-week-slot-bg p-2 text-[9px] sm:w-16 sm:text-[10px] md:w-20 text-muted-foreground font-medium flex items-start pt-3 min-h-[52px]">
						All day
					</div>
					<div
						className={cn(
							"flex-1 min-h-[52px] p-3 sm:p-4",
							today ? "cal-week-allday--today" : "cal-week-grid-bg",
						)}
					>
					<div className="space-y-2">
						{allDayEvents.map(event => (
							<CalendarEventTooltip key={event.id} booking={event} side="top">
								<div
									className={cn(
										"p-3",
										eventCardClassName,
										calendarEventSurfaceClass(event.appointmentType),
										isCalendarEventPast(event, now) && calendarEventPastClass,
									)}
									onClick={() => onEventClick(event)}
								>
								<div className="flex items-start justify-between">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-2 flex-wrap">
											<Badge variant="outline" className={cn(calendarEventBadgeClass, "text-xs")}>
												{bookingTypeLabels[event.type]}
											</Badge>
											<h4 className="font-semibold truncate">
												{event.title.replace(/^(START:|DUE:|OVERDUE:)\s*/, '')}
											</h4>
										</div>
										<p className={cn("text-sm", calendarEventMetaClass)}>{event.description}</p>
										<div className={cn("mt-2 flex items-center gap-4", calendarEventMetaClass)}>
											{event.projectName && (
												<div className="flex items-center gap-1">
													<MapPin className="w-3 h-3" />
													{event.projectName}
												</div>
											)}
											{event.assigneeName && (
												<div className="flex items-center gap-1">
													<Users className="w-3 h-3" />
													{event.assigneeName}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
							</CalendarEventTooltip>
						))}
					</div>
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
								<CurrentTimeLine hourHeightPx={HOUR_HEIGHT} showLabel />
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
							const startHour = parseTime(event.startTime)
							const endHour = parseTime(event.endTime)
							const top = startHour * HOUR_HEIGHT
							const height = Math.max(40, (endHour - startHour) * HOUR_HEIGHT - 4)
							const widthPct = 100 / totalColumns
							const leftPct = column * widthPct
							return (
								<CalendarEventTooltip key={event.id} booking={event} side="top">
									<div
										className={cn(
											"absolute z-10 overflow-hidden p-2",
											eventCardClassName,
											calendarEventSurfaceClass(event.appointmentType),
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
											{event.title}
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
									</div>
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

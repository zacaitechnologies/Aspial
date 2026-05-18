"use client"

import { type CalendarBooking } from "../actions"
import {
	formatDate,
	getDetailedTimeSlots,
	parseTime,
	isCalendarAllDayRowEvent,
	isToday,
	getLocalTime,
	layoutOverlappingEvents,
} from "../utils/calendar-utils"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Clock, MapPin, Users } from "lucide-react"
import { useMemo, useRef, useEffect } from "react"
import { CurrentTimeLine } from "./CurrentTimeLine"

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
	"cursor-pointer rounded-lg border border-border/50 shadow-sm transition-all hover:opacity-95 hover:shadow-md"

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

	useEffect(() => {
		const raf = requestAnimationFrame(() => {
			if (!scrollRef.current) return
			const { hours } = getLocalTime()
			scrollRef.current.scrollTop = Math.max(0, (hours - 1) * HOUR_HEIGHT)
		})
		return () => cancelAnimationFrame(raf)
	}, [HOUR_HEIGHT])

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
			{/* Day Header */}
			<div className={`p-3 sm:p-4 border-b border-(--color-border)] ${today ? 'bg-(--color-primary)]/5' : ''}`}>
				<div className="flex items-center justify-between gap-2">
					<div className="min-w-0">
						<h3 className={`text-lg sm:text-2xl font-bold truncate ${today ? 'text-(--color-primary)]' : 'text-(--color-foreground)]'}`}>
							{currentDate.toLocaleDateString('en-US', {
								weekday: 'long',
								month: 'long',
								day: 'numeric',
								year: 'numeric'
							})}
						</h3>
						{today && (
							<p className="text-xs sm:text-sm text-(--color-muted-foreground)] mt-1">Today</p>
						)}
					</div>
					<div className="text-right shrink-0">
						<div className="text-xs sm:text-sm text-(--color-muted-foreground)]">
							{dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
						</div>
					</div>
				</div>
			</div>
			
			{/* All Day Events Section */}
			{allDayEvents.length > 0 && (
				<div className="p-4 border-b border-(--color-border)] bg-(--color-muted)]/30">
					<div className="text-sm font-medium text-(--color-muted-foreground)] mb-3">All Day Events</div>
					<div className="space-y-2">
						{allDayEvents.map(event => (
							<div
								key={event.id}
								className={cn("p-3", eventCardClassName, event.color)}
								onClick={() => onEventClick(event)}
							>
								<div className="flex items-start justify-between">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-2 flex-wrap">
											<Badge
												variant="outline"
												className="shrink-0 border-border/50 bg-background/70 text-xs font-medium"
											>
												{bookingTypeLabels[event.type]}
											</Badge>
											<h4 className="font-semibold truncate">
												{event.title.replace(/^(START:|DUE:|OVERDUE:)\s*/, '')}
											</h4>
										</div>
										<p className="text-sm opacity-90">{event.description}</p>
										<div className="flex items-center gap-4 mt-2 text-xs opacity-80">
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
						))}
					</div>
				</div>
			)}
			
			{/* Time Slots */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto relative hide-scrollbar">
				<div className="relative flex" style={{ minHeight: timeSlots.length * HALF_HOUR_HEIGHT }}>
					{/* Time gutter */}
					<div className="w-12 sm:w-16 md:w-20 shrink-0 border-r border-(--color-border)] bg-(--color-background)]">
						{timeSlots.map((slot) => {
							const isHourMark = slot.endsWith(':00')
							return (
								<div
									key={slot}
									className={`p-1 sm:p-2 text-[10px] sm:text-xs ${isHourMark ? 'font-medium border-t border-(--color-border)]' : 'border-t border-(--color-border)]/30'} text-(--color-muted-foreground)]`}
									style={{ height: HALF_HOUR_HEIGHT }}
								>
									{isHourMark ? slot : ''}
								</div>
							)
						})}
					</div>

					{/* Day column */}
					<div className="flex-1 relative">
						{today && (
							<div className="absolute inset-0 z-20 pointer-events-none">
								<CurrentTimeLine hourHeightPx={HOUR_HEIGHT} showLabel />
							</div>
						)}

						{/* Background slot grid for click + visual lines */}
						{timeSlots.map((slot) => {
							const isHourMark = slot.endsWith(':00')
							return (
								<div
									key={slot}
									className={`${isHourMark ? 'border-t border-(--color-border)]' : 'border-t border-(--color-border)]/30'} cursor-pointer transition-colors hover:bg-(--color-primary)]/10`}
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
								<div
									key={event.id}
									className={cn(
										"absolute z-10 overflow-hidden p-2",
										eventCardClassName,
										event.color
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
											className="shrink-0 border-border/50 bg-background/70 px-1.5 py-0 text-[10px] font-medium leading-tight"
										>
											{bookingTypeLabels[event.type]}
										</Badge>
										<h4 className="font-semibold truncate text-sm min-w-0">
											{event.title}
										</h4>
									</div>
									<div className="flex items-center gap-3 text-[11px] opacity-90 flex-wrap">
										<div className="flex items-center gap-1">
											<Clock className="w-3 h-3" />
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
							)
						})}
					</div>
				</div>
			</div>
		</div>
	)
}

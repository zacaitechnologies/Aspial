"use client"

import { CalendarBooking } from "../actions"
import {
	getWeekDays,
	formatDate,
	getTimeSlots,
	parseTime,
	isCalendarAllDayRowEvent,
	isToday,
	getLocalTime,
	mergeAdjacentBookings,
	layoutOverlappingEvents,
} from "../utils/calendar-utils"
import { useMemo, useRef, useEffect } from "react"
import { CurrentTimeLine } from "./CurrentTimeLine"

interface WeekViewProps {
	currentDate: Date
	bookings: CalendarBooking[]
	onEventClick: (event: CalendarBooking) => void
	onDateClick: (dateString: string) => void
	onTimeSlotClick?: (date: string, hour: number) => void
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function WeekView({
	currentDate,
	bookings,
	onEventClick,
	onDateClick,
	onTimeSlotClick,
}: WeekViewProps) {
	const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])
	const scrollRef = useRef<HTMLDivElement>(null)
	const HOUR_HEIGHT = 60

	useEffect(() => {
		const raf = requestAnimationFrame(() => {
			if (!scrollRef.current) return
			const { hours } = getLocalTime()
			scrollRef.current.scrollTop = Math.max(0, (hours - 1) * HOUR_HEIGHT)
		})
		return () => cancelAnimationFrame(raf)
	}, [HOUR_HEIGHT])

	const hasToday = useMemo(
		() => weekDays.some(isToday),
		[weekDays]
	)
	// Get events for the week
	const weekEvents = useMemo(() => {
		const weekStart = weekDays[0]
		const weekEnd = weekDays[6]
		const weekStartStr = formatDate(weekStart)
		const weekEndStr = formatDate(weekEnd)
		
		return bookings.filter(booking => {
			const bookingDate = booking.date
			return bookingDate >= weekStartStr && bookingDate <= weekEndStr
		})
	}, [weekDays, bookings])
	
	// Calculate relevant time range based on events
	const timeRange = useMemo(() => {
		// Show full 24 hours (midnight to midnight)
		return { start: 0, end: 24 }
	}, [])
	
	// Generate time slots based on relevant range
	const timeSlots = useMemo(
		() => getTimeSlots(timeRange.start, timeRange.end),
		[timeRange]
	)
	
	// Get events for each day
	const getEventsForDay = (date: Date) => {
		const dateString = formatDate(date)
		return weekEvents.filter(event => event.date === dateString)
	}
	
	return (
		<div className="flex flex-col h-full overflow-hidden">
			<div className="overflow-x-auto flex-1 flex flex-col">
				<div className="min-w-[640px] flex flex-col flex-1">
			{/* Header row with day names - fixed position */}
			<div className="flex border-b-2 border-(--color-border)] shrink-0">
				<div className="w-10 sm:w-14 md:w-16 shrink-0 border-r border-(--color-border)]"></div>
				<div className="flex-1 grid grid-cols-7">
					{weekDays.map((date, index) => {
						const dateString = formatDate(date)
						const today = isToday(date)

						return (
							<div
								key={dateString}
								className={`p-1 sm:p-2 text-center border-r border-(--color-border)] last:border-r-0 cursor-pointer hover:bg-(--color-muted)]/50 transition-colors ${
									today ? 'bg-(--color-primary)]/10' : ''
								}`}
								onClick={() => onDateClick(dateString)}
							>
								<div className={`text-[10px] sm:text-xs font-medium ${today ? 'text-(--color-primary)]' : 'text-(--color-muted-foreground)]'}`}>
									{dayNames[index]}
								</div>
								<div
									className={`text-base sm:text-lg font-semibold mt-1 ${
										today
											? 'text-(--color-primary)]'
											: 'text-(--color-foreground)]'
									}`}
								>
									{date.getDate()}
								</div>
							</div>
						)
					})}
				</div>
			</div>

			{/* All-day row: tasks + leave (same as timed grid — excluded from slots below) */}
			<div className="flex border-b-2 border-(--color-border)] shrink-0 bg-(--color-muted)]/30">
				<div className="w-10 sm:w-14 md:w-16 shrink-0 p-1 sm:p-2 text-[9px] sm:text-[10px] text-(--color-muted-foreground)] font-medium border-r border-(--color-border)] flex items-start pt-2 sm:pt-3">
					All day
				</div>
				<div className="flex-1 grid grid-cols-7 min-h-[56px]">
					{weekDays.map((date) => {
						const dateString = formatDate(date)
						const today = isToday(date)
						const dayEvents = getEventsForDay(date)
						const allDayEvents = dayEvents.filter(isCalendarAllDayRowEvent)
						return (
							<div
								key={`allday-${dateString}`}
								className={`border-r border-(--color-border)] last:border-r-0 p-1 ${
									today ? "bg-(--color-primary)]/5" : ""
								}`}
							>
								<div className="space-y-1">
									{allDayEvents.slice(0, 4).map((event) => (
										<div
											key={event.id}
											className={`text-xs px-1.5 py-1 rounded cursor-pointer ${event.color} hover:opacity-90 transition-opacity truncate`}
											onClick={(e) => {
												e.stopPropagation()
												onEventClick(event)
											}}
											title={event.title}
										>
											{event.title.replace(/^(START:|DUE:|OVERDUE:)\s*/, "")}
										</div>
									))}
									{allDayEvents.length > 4 && (
										<div className="text-[10px] text-(--color-muted-foreground)] px-1">
											+{allDayEvents.length - 4} more
										</div>
									)}
								</div>
							</div>
						)
					})}
				</div>
			</div>
			
			{/* Time slots with synchronized columns - scrollable */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar relative">
				<div className="relative flex" style={{ minHeight: timeSlots.length * HOUR_HEIGHT }}>
					{/* Time gutter */}
					<div className="w-10 sm:w-14 md:w-16 shrink-0 border-r border-(--color-border)] bg-(--color-background)] relative">
						{timeSlots.map((slot) => (
							<div
								key={slot}
								className="border-b border-(--color-border)] p-1 sm:p-2 text-[10px] sm:text-xs text-(--color-muted-foreground)] font-medium"
								style={{ height: HOUR_HEIGHT }}
							>
								{slot}
							</div>
						))}
					</div>

					{/* Day columns */}
					<div className="flex-1 grid grid-cols-7 relative">
						{/* Current-time red line spanning all day columns (Teams-style) */}
						{hasToday && (
							<div className="absolute z-20 pointer-events-none inset-0">
								<CurrentTimeLine hourHeightPx={HOUR_HEIGHT} showLabel />
							</div>
						)}

						{weekDays.map((date) => {
							const dateString = formatDate(date)
							const today = isToday(date)
							const dayEvents = getEventsForDay(date)
							const timedEvents = dayEvents.filter((e) => !isCalendarAllDayRowEvent(e))
							const merged = mergeAdjacentBookings(timedEvents)
							const layouts = layoutOverlappingEvents(merged)

							return (
								<div
									key={dateString}
									className={`relative border-r border-(--color-border)] last:border-r-0 ${
										today ? "bg-(--color-primary)]/[0.06]" : ""
									}`}
								>
									{/* Background slot grid for click-to-create + hour lines */}
									{timeSlots.map((slot) => {
										const slotHour = parseTime(slot)
										return (
											<div
												key={slot}
												className="border-b border-(--color-border)] cursor-pointer transition-colors hover:bg-(--color-primary)]/10"
												style={{ height: HOUR_HEIGHT }}
												onClick={() => {
													if (onTimeSlotClick) onTimeSlotClick(dateString, slotHour)
												}}
											/>
										)
									})}

									{/* Absolute-positioned event cards */}
									{layouts.map(({ event, column, totalColumns }) => {
										const startHour = parseTime(event.startTime)
										const endHour = parseTime(event.endTime)
										const top = startHour * HOUR_HEIGHT
										const height = Math.max(20, (endHour - startHour) * HOUR_HEIGHT - 2)
										const widthPct = 100 / totalColumns
										const leftPct = column * widthPct
										return (
											<div
												key={event.id}
												className={`absolute z-10 overflow-hidden rounded px-1.5 py-1 text-xs cursor-pointer ${event.color} hover:opacity-90 transition-opacity shadow-sm`}
												style={{
													top,
													height,
													left: `calc(${leftPct}% + 1px)`,
													width: `calc(${widthPct}% - 2px)`,
												}}
												onClick={(e) => {
													e.stopPropagation()
													onEventClick(event)
												}}
											>
												<div className="font-medium truncate">{event.title}</div>
												<div className="text-[10px] truncate opacity-80">
													{event.startTime} - {event.endTime}
												</div>
											</div>
										)
									})}
								</div>
							)
						})}
					</div>
				</div>
			</div>
				</div>
			</div>
		</div>
	)
}

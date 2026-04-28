"use client"

import { type CalendarBooking } from "../actions"
import {
	formatDate,
	getDetailedTimeSlots,
	parseTime,
	isCalendarAllDayRowEvent,
	isToday,
	getLocalTime,
} from "../utils/calendar-utils"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
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
	
	// Get events for each time slot
	const getEventsForSlot = (slot: string) => {
		const slotTime = parseTime(slot)
		return timedEvents.filter(event => {
			const eventStart = parseTime(event.startTime)
			const eventEnd = parseTime(event.endTime)
			return eventStart <= slotTime && eventEnd > slotTime
		})
	}
	
	return (
		<div className="flex flex-col h-full">
			{/* Day Header */}
			<div className={`p-4 border-b border-(--color-border)] ${today ? 'bg-(--color-primary)]/5' : ''}`}>
				<div className="flex items-center justify-between">
					<div>
						<h3 className={`text-2xl font-bold ${today ? 'text-(--color-primary)]' : 'text-(--color-foreground)]'}`}>
							{currentDate.toLocaleDateString('en-US', { 
								weekday: 'long',
								month: 'long',
								day: 'numeric',
								year: 'numeric'
							})}
						</h3>
						{today && (
							<p className="text-sm text-(--color-muted-foreground)] mt-1">Today</p>
						)}
					</div>
					<div className="text-right">
						<div className="text-sm text-(--color-muted-foreground)]">
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
								className="p-3 rounded-lg border border-(--color-border)] bg-(--color-card)] cursor-pointer hover:shadow-md transition-shadow"
								onClick={() => onEventClick(event)}
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<Badge variant="secondary" className={event.color}>
												{bookingTypeLabels[event.type]}
											</Badge>
											<h4 className="font-semibold text-(--color-foreground)]">
												{event.title.replace(/^(START:|DUE:|OVERDUE:)\s*/, '')}
											</h4>
										</div>
										<p className="text-sm text-(--color-muted-foreground)]">{event.description}</p>
										<div className="flex items-center gap-4 mt-2 text-xs text-(--color-muted-foreground)]">
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
				<div className="relative" style={{ minHeight: timeSlots.length * HALF_HOUR_HEIGHT }}>
					{today && (
						<div className="absolute inset-0 z-20 pointer-events-none" style={{ left: "5rem" }}>
							<CurrentTimeLine hourHeightPx={HOUR_HEIGHT} showLabel />
						</div>
					)}

					{timeSlots.map(slot => {
						const slotEvents = getEventsForSlot(slot)
						const isHourMark = slot.endsWith(':00')

						return (
							<div
								key={slot}
								className={`flex ${isHourMark ? 'border-t border-(--color-border)]' : 'border-t border-(--color-border)]/30'} relative`}
								style={{ height: HALF_HOUR_HEIGHT }}
							>
								{/* Time Label */}
								<div className={`w-20 shrink-0 p-2 text-xs ${isHourMark ? 'font-medium' : ''} text-(--color-muted-foreground)] border-r border-(--color-border)]`}>
									{isHourMark ? slot : ''}
								</div>

								{/* Events */}
								<div
									className={`flex-1 p-2 transition-colors ${slotEvents.length === 0 ? 'cursor-pointer hover:bg-(--color-primary)]/10' : ''}`}
									onClick={() => {
										if (slotEvents.length === 0 && onTimeSlotClick) {
											onTimeSlotClick(dateString, slot)
										}
									}}
								>
									{slotEvents.length > 0 && (
										<div className="space-y-2">
											{slotEvents.map(event => (
												<div
													key={event.id}
													className="p-3 rounded-lg border border-(--color-border)] bg-(--color-card)] cursor-pointer hover:shadow-md transition-shadow"
													onClick={() => onEventClick(event)}
												>
													<div className="flex items-start justify-between mb-2">
														<div className="flex items-center gap-2">
															<Badge variant="secondary" className={event.color}>
																{bookingTypeLabels[event.type]}
															</Badge>
															<h4 className="font-semibold text-(--color-foreground)]">{event.title}</h4>
														</div>
													</div>
													<p className="text-sm text-(--color-muted-foreground)] mb-2">{event.description}</p>
													<div className="flex items-center gap-4 text-xs text-(--color-muted-foreground)]">
														<div className="flex items-center gap-1">
															<Clock className="w-3 h-3" />
															{event.startTime} - {event.endTime}
														</div>
														{event.location && (
															<div className="flex items-center gap-1">
																<MapPin className="w-3 h-3" />
																{event.location}
															</div>
														)}
														{event.attendees > 1 && (
															<div className="flex items-center gap-1">
																<Users className="w-3 h-3" />
																{event.attendees} attendees
															</div>
														)}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}

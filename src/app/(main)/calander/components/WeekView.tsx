"use client"

import { CalendarBooking } from "../actions"
import { getWeekDays, formatDate, getTimeSlots, parseTime, isToday } from "../utils/calendar-utils"
import { useMemo } from "react"

interface WeekViewProps {
	currentDate: Date
	bookings: CalendarBooking[]
	onEventClick: (event: CalendarBooking) => void
	onDateClick: (dateString: string) => void
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function WeekView({
	currentDate,
	bookings,
	onEventClick,
	onDateClick
}: WeekViewProps) {
	const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])
	
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
			{/* Header row with day names - fixed position */}
			<div className="flex border-b-2 border-(--color-border)] shrink-0">
				<div className="w-16 shrink-0 border-r border-(--color-border)]"></div>
				<div className="flex-1 grid grid-cols-7">
					{weekDays.map((date, index) => {
						const dateString = formatDate(date)
						const today = isToday(date)
						
						return (
							<div
								key={dateString}
								className={`p-2 text-center border-r border-(--color-border)] last:border-r-0 cursor-pointer hover:bg-(--color-muted)]/50 transition-colors ${
									today ? 'bg-(--color-primary)]/10' : ''
								}`}
								onClick={() => onDateClick(dateString)}
							>
								<div className={`text-xs font-medium ${today ? 'text-(--color-primary)]' : 'text-(--color-muted-foreground)]'}`}>
									{dayNames[index]}
								</div>
								<div
									className={`text-lg font-semibold mt-1 ${
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
			
			{/* Time slots with synchronized columns - scrollable */}
			<div className="flex-1 overflow-y-auto hide-scrollbar">
				{timeSlots.map(slot => {
					const slotHour = parseTime(slot)
					
					return (
						<div key={slot} className="flex border-b border-(--color-border)] min-h-[60px]">
							{/* Time label */}
							<div className="w-16 shrink-0 p-2 text-xs text-(--color-muted-foreground)] font-medium border-r border-(--color-border)] bg-(--color-background)]">
								{slot}
							</div>
							
							{/* Event columns for each day */}
							<div className="flex-1 grid grid-cols-7">
								{weekDays.map((date) => {
									const dateString = formatDate(date)
									const today = isToday(date)
									const dayEvents = getEventsForDay(date)
									const timedEvents = dayEvents.filter(e => e.type !== 'task')
									
									// Get events for this time slot
									const slotEvents = timedEvents.filter(event => {
										const eventStart = parseTime(event.startTime)
										const eventEnd = parseTime(event.endTime)
										return eventStart <= slotHour && eventEnd > slotHour
									})
									
									return (
										<div 
											key={dateString}
											className={`border-r border-(--color-border)] last:border-r-0 p-1 hover:bg-(--color-muted)]/20 transition-colors ${
												today ? 'bg-(--color-primary)]/5' : ''
											}`}
										>
											{slotEvents.length > 0 && (
												<div className="space-y-1">
													{slotEvents.map(event => (
														<div
															key={event.id}
															className={`text-xs px-1.5 py-1 rounded cursor-pointer ${event.color} text-white hover:opacity-90 transition-opacity`}
															onClick={(e) => {
																e.stopPropagation()
																onEventClick(event)
															}}
														>
															<div className="font-medium truncate">{event.title}</div>
															<div className="text-[10px] text-white/80 truncate">
																{event.startTime} - {event.endTime}
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									)
								})}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}

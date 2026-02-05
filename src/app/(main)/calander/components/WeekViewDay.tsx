"use client"

import { CalendarBooking } from "../actions"
import { isToday, formatDate, parseTime } from "../utils/calendar-utils"
import { useMemo } from "react"

interface WeekViewDayProps {
	date: Date
	dayName: string
	events: CalendarBooking[]
	timeSlots: string[]
	onEventClick: (event: CalendarBooking) => void
	onDateClick: (dateString: string) => void
}

export function WeekViewDay({
	date,
	dayName,
	events,
	timeSlots,
	onEventClick,
	onDateClick
}: WeekViewDayProps) {
	const dateString = formatDate(date)
	const today = isToday(date)
	
	// Separate all-day events (tasks) from time-specific events
	const allDayEvents = useMemo(
		() => events.filter(e => e.type === 'task'),
		[events]
	)
	
	const timedEvents = useMemo(
		() => events.filter(e => e.type !== 'task'),
		[events]
	)
	
	// Get events for each time slot
	const getEventsForSlot = (slot: string) => {
		const slotHour = parseTime(slot)
		return timedEvents.filter(event => {
			const eventStart = parseTime(event.startTime)
			const eventEnd = parseTime(event.endTime)
			return eventStart <= slotHour && eventEnd > slotHour
		})
	}
	
	return (
		<div className="flex flex-col border-r border-(--color-border)] last:border-r-0">
			{/* Day Header */}
			<div
				className={`p-2 text-center border-b border-(--color-border)] cursor-pointer hover:bg-(--color-muted)]/50 transition-colors ${
					today ? 'bg-(--color-primary)]/10' : ''
				}`}
				onClick={() => onDateClick(dateString)}
			>
				<div className={`text-xs font-medium ${today ? 'text-(--color-primary)]' : 'text-(--color-muted-foreground)]'}`}>
					{dayName}
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
			
			{/* All Day Events Section */}
			{allDayEvents.length > 0 && (
				<div className="p-1 border-b border-(--color-border)] bg-(--color-muted)]/30 min-h-[60px]">
					<div className="text-[10px] text-(--color-muted-foreground)] mb-1 px-1">All Day</div>
					<div className="space-y-1">
						{allDayEvents.slice(0, 3).map(event => (
							<div
								key={event.id}
								className={`text-xs px-1.5 py-1 rounded cursor-pointer ${event.color} text-foreground hover:opacity-90 transition-opacity truncate`}
								onClick={(e) => {
									e.stopPropagation()
									onEventClick(event)
								}}
							>
								{event.title.replace(/^(START:|DUE:|OVERDUE:)\s*/, '')}
							</div>
						))}
						{allDayEvents.length > 3 && (
							<div className="text-[10px] text-(--color-muted-foreground)] px-1">
								+{allDayEvents.length - 3} more
							</div>
						)}
					</div>
				</div>
			)}
			
			{/* Time Slots */}
			<div className="flex-1">
				{timeSlots.map(slot => {
					const slotEvents = getEventsForSlot(slot)
					return (
						<div
							key={slot}
							className="border-b border-(--color-border)] min-h-[60px] p-1 hover:bg-(--color-muted)]/20 transition-colors"
						>
							{slotEvents.length > 0 && (
								<div className="space-y-1">
									{slotEvents.map(event => (
										<div
											key={event.id}
											className={`text-xs px-1.5 py-1 rounded cursor-pointer ${event.color} text-foreground hover:opacity-90 transition-opacity`}
											onClick={(e) => {
												e.stopPropagation()
												onEventClick(event)
											}}
										>
											<div className="font-medium truncate">{event.title}</div>
											<div className="text-[10px] text-foreground/80 truncate">
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
}

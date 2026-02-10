"use client"

import { CalendarBooking } from "../actions"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

interface TimeSlotProps {
	time: string
	events: CalendarBooking[]
	onEventClick: (event: CalendarBooking) => void
	showTimeLabel?: boolean
}

export function TimeSlot({ 
	time, 
	events, 
	onEventClick,
	showTimeLabel = true 
}: TimeSlotProps) {
	return (
		<div className="flex border-b border-(--color-border) min-h-[60px]">
			{showTimeLabel && (
				<div className="w-16 shrink-0 p-2 text-xs text-(--color-muted-foreground) font-medium border-r border-(--color-border)">
					{time}
				</div>
			)}
			<div className="flex-1 p-1 relative">
				{events.length > 0 ? (
					<div className="space-y-1">
						{events.map((event) => (
							<div
								key={event.id}
								className={`text-xs px-2 py-1.5 rounded cursor-pointer ${event.color} text-foreground hover:opacity-90 transition-opacity`}
								onClick={(e) => {
									e.stopPropagation()
									onEventClick(event)
								}}
							>
								<div className="font-medium truncate">{event.title}</div>
								{event.type !== 'task' && (
									<div className="flex items-center gap-1 text-foreground/80 mt-0.5">
										<Clock className="w-3 h-3" />
										<span>{event.startTime} - {event.endTime}</span>
									</div>
								)}
							</div>
						))}
					</div>
				) : null}
			</div>
		</div>
	)
}

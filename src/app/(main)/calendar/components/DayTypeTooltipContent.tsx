import { Clock, MapPin } from "lucide-react"
import type { CalendarBooking } from "../actions"
import { CALENDAR_EVENT_TYPES, type CalendarEventType } from "../constants"
import { AppointmentCategoryDetail } from "./AppointmentCategoryDetail"

interface DayTypeTooltipContentProps {
	type: CalendarEventType
	bookings: CalendarBooking[]
}

const TYPE_CSS_VAR: Record<CalendarEventType, string> = {
	PHOTO_SHOOT: "var(--calendar-photo-shoot)",
	VIDEO_SHOOT: "var(--calendar-video-shoot)",
	CONSULTATION: "var(--calendar-consultation)",
	PHOTO_SELECTION: "var(--calendar-photo-selection)",
	OTHERS: "var(--calendar-others)",
	LEAVE: "var(--calendar-leave)",
	BLOCKER: "var(--calendar-blocker)",
}

export function DayTypeTooltipContent({ type, bookings }: DayTypeTooltipContentProps) {
	const label = CALENDAR_EVENT_TYPES[type].label
	const typeBookings = bookings.filter((b) => b.appointmentType === type)

	return (
		<div className="space-y-2 text-xs">
			<div className="flex items-center gap-2">
				<span
					className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/40"
					style={{ backgroundColor: TYPE_CSS_VAR[type] }}
					aria-hidden
				/>
				<p className="font-semibold leading-snug">{label}</p>
			</div>
			<ul className="space-y-2">
				{typeBookings.map((booking) => (
					<li
						key={booking.id}
						className="space-y-1 border-t border-border pt-2 first:border-0 first:pt-0"
					>
						<p className="font-medium leading-snug">{booking.title}</p>
						{booking.clientName && (
							<p className="text-muted-foreground">{booking.clientName}</p>
						)}
						{booking.type === "appointment" && (
							<AppointmentCategoryDetail booking={booking} />
						)}
						{booking.type !== "task" && booking.startTime && (
							<div className="flex items-center gap-1.5">
								<Clock className="h-3 w-3 shrink-0 opacity-70" />
								<span>
									{booking.startTime}
									{booking.endTime ? ` – ${booking.endTime}` : ""}
								</span>
							</div>
						)}
						{booking.location && (
							<div className="flex items-center gap-1.5 min-w-0">
								<MapPin className="h-3 w-3 shrink-0 opacity-70" />
								<span className="truncate">{booking.location}</span>
							</div>
						)}
					</li>
				))}
			</ul>
		</div>
	)
}

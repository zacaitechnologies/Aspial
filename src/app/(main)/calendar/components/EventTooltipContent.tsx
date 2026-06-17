import { CalendarPlus, Clock, MapPin, User, UserCircle, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBusinessDateTimeDisplay } from "@/lib/date-utils"
import type { CalendarBooking } from "../actions"
import { calendarEventLegendDotClass } from "../utils/event-surface-styles"
import { formatAppointmentEventTitle } from "../utils/appointment-display"
import { AppointmentCategoryDetail } from "./AppointmentCategoryDetail"
import { AppointmentCancellationDetail } from "./AppointmentCancellationDetail"

export function EventTooltipContent({ booking }: { booking: CalendarBooking }) {
	const headline =
		booking.type === "appointment"
			? formatAppointmentEventTitle(booking)
			: booking.title

	return (
		<div className="space-y-1.5 text-xs">
			<div className="flex items-center gap-2">
				<span
					className={cn(
						"h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/40",
						calendarEventLegendDotClass(booking.appointmentType)
					)}
					aria-hidden
				/>
				<p className="font-semibold leading-snug">{headline}</p>
			</div>
			<AppointmentCancellationDetail booking={booking} />
			{booking.type === "appointment" && booking.creatorName && (
				<div className="flex items-center gap-1.5 text-muted-foreground">
					<User className="h-3 w-3 shrink-0 opacity-70" />
					<span>Booked by: {booking.creatorName}</span>
				</div>
			)}
			{booking.type === "appointment" &&
				booking.assigneeNames &&
				booking.assigneeNames.length > 0 && (
					<div className="flex items-start gap-1.5 text-muted-foreground min-w-0">
						<UserCircle className="h-3 w-3 shrink-0 opacity-70 mt-0.5" />
						<span className="min-w-0">Assigned to: {booking.assigneeNames.join(", ")}</span>
					</div>
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
			{booking.type === "appointment" && booking.attendees > 0 && (
				<div className="flex items-center gap-1.5">
					<Users className="h-3 w-3 shrink-0 opacity-70" />
					<span>
						{booking.attendees} attendee{booking.attendees !== 1 ? "s" : ""}
					</span>
				</div>
			)}
			{booking.type === "appointment" && booking.createdAt && (
				<div className="flex items-center gap-1.5 text-muted-foreground">
					<CalendarPlus className="h-3 w-3 shrink-0 opacity-70" />
					<span>Created: {formatBusinessDateTimeDisplay(new Date(booking.createdAt))}</span>
				</div>
			)}
			{booking.description && (
				<p className="text-muted-foreground line-clamp-3">{booking.description}</p>
			)}
		</div>
	)
}

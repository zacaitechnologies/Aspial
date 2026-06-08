import type { CalendarBooking } from "../actions"

/** Client-facing label: project client name, then booking contact name. */
export function resolveAppointmentClientLabel(
	booking: Pick<CalendarBooking, "clientName" | "bookingName">
): string | null {
	const client = booking.clientName?.trim()
	if (client) return client
	const bookingName = booking.bookingName?.trim()
	if (bookingName) return bookingName
	return null
}

export function buildAppointmentTitle(
	appointmentName: string | null | undefined,
	clientLabel: string | null,
	bookerFallback: string
): string {
	const displayName = clientLabel ?? bookerFallback
	const resource = appointmentName?.trim()

	if (resource) return `${resource} - ${displayName}`
	return `Appointment - ${displayName}`
}

/** Primary label for appointment blocks, tooltips, and lists. */
export function formatAppointmentEventTitle(booking: CalendarBooking): string {
	if (booking.type !== "appointment") return booking.title

	const clientLabel = resolveAppointmentClientLabel(booking)
	const bookerFallback =
		booking.creatorName?.trim() || booking.title.replace(/^Appointment - /, "")

	return buildAppointmentTitle(
		booking.appointmentName,
		clientLabel,
		bookerFallback
	)
}

/** Unified display title across calendar views (strips task prefixes). */
export function getCalendarEventDisplayTitle(booking: CalendarBooking): string {
	if (booking.type === "appointment") {
		return formatAppointmentEventTitle(booking)
	}
	return booking.title.replace(/^(START:|DUE:|OVERDUE:)\s*/, "")
}

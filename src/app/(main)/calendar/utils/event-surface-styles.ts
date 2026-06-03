import type { CalendarEventType } from "../constants"

/** Pastel surface + legend-colored text for week/day event blocks */
const SURFACE_CLASS: Record<CalendarEventType, string> = {
	PHOTO_SHOOT: "cal-event-surface cal-event-surface--photo-shoot",
	VIDEO_SHOOT: "cal-event-surface cal-event-surface--video-shoot",
	CONSULTATION: "cal-event-surface cal-event-surface--consultation",
	PHOTO_SELECTION: "cal-event-surface cal-event-surface--photo-selection",
	OTHERS: "cal-event-surface cal-event-surface--others",
	LEAVE: "cal-event-surface cal-event-surface--leave",
	BLOCKER: "cal-event-surface cal-event-surface--blocker",
}

export function calendarEventSurfaceClass(appointmentType: CalendarEventType): string {
	return SURFACE_CLASS[appointmentType] ?? SURFACE_CLASS.OTHERS
}

const LEGEND_DOT_CLASS: Record<CalendarEventType, string> = {
	PHOTO_SHOOT: "bg-calendar-photo-shoot",
	VIDEO_SHOOT: "bg-calendar-video-shoot",
	CONSULTATION: "bg-calendar-consultation",
	PHOTO_SELECTION: "bg-calendar-photo-selection",
	OTHERS: "bg-calendar-others",
	LEAVE: "bg-calendar-leave",
	BLOCKER: "bg-calendar-blocker",
}

export function calendarEventLegendDotClass(appointmentType: CalendarEventType): string {
	return LEGEND_DOT_CLASS[appointmentType] ?? LEGEND_DOT_CLASS.OTHERS
}

/** Slightly faded styling for events that have already ended. */
export const calendarEventPastClass = "cal-event-surface--past"

/** Badge on event cards — subtle, inherits legend text color */
export const calendarEventBadgeClass =
	"shrink-0 border border-current/25 bg-card/50 text-inherit text-[10px] font-medium leading-tight"

/** Time, location, and other secondary lines — same legend color as title */
export const calendarEventMetaClass =
	"text-[11px] font-medium leading-snug text-inherit"

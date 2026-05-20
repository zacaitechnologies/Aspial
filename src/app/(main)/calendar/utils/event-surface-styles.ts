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

/** Badge on event cards — subtle, inherits legend text color */
export const calendarEventBadgeClass =
	"shrink-0 border border-current/25 bg-card/50 text-inherit text-[10px] font-medium leading-tight"

/** Time, location, and other secondary lines — same legend color as title */
export const calendarEventMetaClass =
	"text-[11px] font-medium leading-snug text-inherit"

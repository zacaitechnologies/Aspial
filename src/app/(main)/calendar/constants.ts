export const APPOINTMENT_TYPES = {
	PHOTO_SHOOT: {
		label: "Photo shooting",
		color: "bg-calendar-photo-shoot",
		value: "PHOTO_SHOOT",
	},
	VIDEO_SHOOT: {
		label: "Video shooting",
		color: "bg-calendar-video-shoot",
		value: "VIDEO_SHOOT",
	},
	CONSULTATION: {
		label: "Consultation",
		color: "bg-calendar-consultation",
		value: "CONSULTATION",
	},
	PHOTO_SELECTION: {
		label: "Photo selection",
		color: "bg-calendar-photo-selection",
		value: "PHOTO_SELECTION",
	},
	OTHERS: {
		label: "Others",
		color: "bg-calendar-others",
		value: "OTHERS",
	},
} as const

/** Matches Prisma `AppointmentType` for real appointment bookings (forms, DB). */
export type AppointmentType = keyof typeof APPOINTMENT_TYPES

/** Calendar UI only: appointment categories plus leave (not a Prisma appointment type). */
export const CALENDAR_EVENT_TYPES = {
	...APPOINTMENT_TYPES,
	LEAVE: {
		label: "Leave",
		color: "bg-calendar-leave",
		value: "LEAVE",
	},
} as const

export type CalendarEventType = keyof typeof CALENDAR_EVENT_TYPES

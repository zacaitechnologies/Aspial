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

export type AppointmentType = keyof typeof APPOINTMENT_TYPES

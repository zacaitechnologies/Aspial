export const APPOINTMENT_TYPES = {
	PHOTO_SHOOT: { 
		label: 'Photo Shoot', 
		color: 'bg-primary',
		value: 'PHOTO_SHOOT'
	},
	VIDEO_SHOOT: { 
		label: 'Video Shoot', 
		color: 'bg-[var(--color-chart-2)]',
		value: 'VIDEO_SHOOT'
	},
	CONSULTATION: { 
		label: 'Consultation', 
		color: 'bg-[var(--color-chart-3)]',
		value: 'CONSULTATION'
	},
	PHOTO_SELECTION: { 
		label: 'Photo Selection', 
		color: 'bg-[var(--color-chart-4)]',
		value: 'PHOTO_SELECTION'
	},
	OTHERS: { 
		label: 'Others', 
		color: 'bg-accent',
		value: 'OTHERS'
	},
} as const

export type AppointmentType = keyof typeof APPOINTMENT_TYPES

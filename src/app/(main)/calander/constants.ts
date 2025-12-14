export const APPOINTMENT_TYPES = {
	PHOTO_SHOOT: { 
		label: 'Photo Shoot', 
		color: 'bg-blue-500',
		value: 'PHOTO_SHOOT'
	},
	VIDEO_SHOOT: { 
		label: 'Video Shoot', 
		color: 'bg-purple-500',
		value: 'VIDEO_SHOOT'
	},
	CONSULTATION: { 
		label: 'Consultation', 
		color: 'bg-green-500',
		value: 'CONSULTATION'
	},
	PHOTO_SELECTION: { 
		label: 'Photo Selection', 
		color: 'bg-orange-500',
		value: 'PHOTO_SELECTION'
	},
	OTHERS: { 
		label: 'Others', 
		color: 'bg-yellow-500',
		value: 'OTHERS'
	},
} as const

export type AppointmentType = keyof typeof APPOINTMENT_TYPES

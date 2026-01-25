// Shared types for appointment-bookings

export interface ProjectWithClient {
	id: number
	name: string
	clientName: string | null
	status: string
	Client: {
		id: string
		name: string
		email: string
		phone: string | null
		company: string | null
	} | null
}

export interface AppointmentBookingWithDetails {
	id: number
	bookedBy: string
	startDate: Date
	endDate: Date
	purpose: string | null
	appointmentType: string
	status: string
	appointmentId: number | null
	attendees: number | null
	bookingName: string | null
	companyName: string | null
	contactNumber: string | null
	remarks: string | null
	appointment?: {
		id: number
		name: string
		location: string | null
	} | null
	project?: {
		id: number
		name: string
		clientName: string | null
		Client: {
			id: string
			name: string
			email: string
			phone: string | null
			company: string | null
		} | null
	} | null
}

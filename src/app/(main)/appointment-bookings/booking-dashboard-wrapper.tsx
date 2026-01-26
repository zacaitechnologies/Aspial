'use client'

import dynamic from 'next/dynamic'

const BookingDashboard = dynamic(
	() => import('./equipment-dashboard').then(mod => ({ default: mod.BookingDashboard })),
	{
		ssr: false,
		loading: () => <div>Loading...</div>
	}
)

interface AppointmentBooking {
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
		brand: string | null
	} | null
	project?: {
		id: number
		name: string
		clientName: string | null
		Client?: {
			id: string
			name: string
			email: string
			phone: string | null
			company: string | null
		} | null
	} | null
	reminders?: {
		id: number
		offsetMinutes: number
		remindAt: Date
		status: string
	}[]
}

interface Appointment {
	id: number
	name: string
	location: string | null
	brand: string | null
	description: string | null
	appointmentType: string
	isAvailable: boolean
	bookings?: AppointmentBooking[]
}

interface BookingDashboardWrapperProps {
	appointments: Appointment[]
	bookings: AppointmentBooking[]
	isAdmin: boolean
	userProjectIds: number[]
}

export function BookingDashboardWrapper(props: BookingDashboardWrapperProps) {
	return <BookingDashboard {...props} />
}

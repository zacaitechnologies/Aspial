'use client'

import dynamic from 'next/dynamic'

const BookingDashboard = dynamic(
	() => import('./equipment-dashboard').then(mod => ({ default: mod.BookingDashboard })),
	{
		ssr: false,
		loading: () => <div>Loading...</div>
	}
)

interface Appointment {
	id: number
	name: string
	location: string | null
	brand: string | null
	description: string | null
	appointmentType: string
	isAvailable: boolean
	bookings?: any[]
}

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
	} | null
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


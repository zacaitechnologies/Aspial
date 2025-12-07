'use client'

import dynamic from 'next/dynamic'

const BookingDashboard = dynamic(
	() => import('./equipment-dashboard').then(mod => ({ default: mod.BookingDashboard })),
	{
		ssr: false,
		loading: () => <div>Loading...</div>
	}
)

interface Studio {
	id: number
	name: string
	location: string
	capacity: number
	description: string | null
	isActive: boolean
	bookings?: any[]
}

interface Equipment {
	id: number
	name: string
	type: string
	brand: string | null
	model: string | null
	serialNumber: string | null
	condition: string
	isAvailable: boolean
	bookings?: any[]
}

interface BookingDashboardWrapperProps {
	studios: Studio[]
	equipment: Equipment[]
	isAdmin: boolean
	userProjectIds: number[]
}

export function BookingDashboardWrapper(props: BookingDashboardWrapperProps) {
	return <BookingDashboard {...props} />
}


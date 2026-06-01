import { getCachedUser } from "@/lib/auth-cache"
import { prisma } from "@/lib/prisma"
import { fetchAllBookings, checkIsAdmin, getAvailableAppointments } from "./actions"
import CalendarClient from "./components/CalendarClient"

// Force dynamic rendering since we use cookies for authentication
export const dynamic = "force-dynamic"

// Server Component - fetches data on server for fast initial load (current month only)
export default async function OrganizationCalendar() {
	const user = await getCachedUser()

	if (!user) {
		return null
	}

	const dbUser = await prisma.user.findUnique({
		where: { supabase_id: user.id },
		select: { firstName: true, lastName: true, email: true },
	})
	const userName = dbUser
		? `${dbUser.firstName} ${dbUser.lastName}`.trim() || dbUser.email
		: user.email || user.id

	// Initial range: current month for fast first load
	const now = new Date()
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
	monthStart.setHours(0, 0, 0, 0)
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
	monthEnd.setHours(23, 59, 59, 999)

	const [isAdmin, bookings, availableAppointments] = await Promise.all([
		checkIsAdmin(user.id),
		fetchAllBookings(user.id, userName, { start: monthStart, end: monthEnd }),
		getAvailableAppointments(),
	])

	return (
		<CalendarClient
			initialBookings={bookings}
			initialIsAdmin={isAdmin}
			initialAppointments={availableAppointments}
			userId={user.id}
			userName={userName}
		/>
	)
}

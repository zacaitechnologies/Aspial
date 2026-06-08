import { getCachedUser } from "@/lib/auth-cache"
import { getBusinessTodayDateString } from "@/lib/date-utils"
import { prisma } from "@/lib/prisma"
import { getCachedIsUserBrandAdvisor } from "@/lib/admin-cache"
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

	// Initial range: current business month for fast first load
	const initialTodayDateString = getBusinessTodayDateString()
	const [year, month] = initialTodayDateString.split("-").map(Number)
	const monthStart = new Date(year, month - 1, 1)
	monthStart.setHours(0, 0, 0, 0)
	const monthEnd = new Date(year, month, 0)
	monthEnd.setHours(23, 59, 59, 999)

	const [isAdmin, isBrandAdvisor, bookings, availableAppointments] = await Promise.all([
		checkIsAdmin(user.id),
		getCachedIsUserBrandAdvisor(user.id),
		fetchAllBookings(user.id, userName, { start: monthStart, end: monthEnd }),
		getAvailableAppointments(),
	])

	const canBook = isAdmin || isBrandAdvisor

	return (
		<CalendarClient
			initialBookings={bookings}
			initialIsAdmin={isAdmin}
			initialCanBook={canBook}
			initialAppointments={availableAppointments}
			initialTodayDateString={initialTodayDateString}
			userId={user.id}
			userName={userName}
		/>
	)
}

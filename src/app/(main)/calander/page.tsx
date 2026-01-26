import { getCachedUser } from "@/lib/auth-cache"
import { fetchAllBookings, getUserProjects, checkIsAdmin } from "./actions"
import CalendarClient from "./components/CalendarClient"

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic'

// Server Component - fetches data on server for fast initial load
export default async function OrganizationCalendar() {
	const user = await getCachedUser()
	
	if (!user) {
		return null
	}

	// Get user name for filtering bookings
	const userName = user.email || user.id

	// Fetch all data in parallel
	const [isAdmin, bookings] = await Promise.all([
		checkIsAdmin(user.id),
		fetchAllBookings(user.id, userName)
	])

	// Fetch projects only if not admin (in parallel with other operations)
	const projects = isAdmin ? [] : await getUserProjects(user.id)

	return (
		<CalendarClient
			initialBookings={bookings}
			initialIsAdmin={isAdmin}
			initialProjects={projects}
			userId={user.id}
			userName={userName}
		/>
	)
}

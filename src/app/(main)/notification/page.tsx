import { getCachedUser } from "@/lib/auth-cache"
import { checkHasFullAccess } from "../actions/admin-actions"
import { getUserInvitations, getAllInvitationsForAdmin } from "../projects/permissions"
import NotificationPageClient from "./components/NotificationPageClient"

export const dynamic = 'force-dynamic'

export default async function NotificationPage() {
	const user = await getCachedUser()
	if (!user?.id) {
		return null
	}

	// Check admin status
	const isAdmin = await checkHasFullAccess(user.id)

	// Fetch invitations in parallel
	const [invitations, allInvitations] = await Promise.all([
		getUserInvitations(user.id).catch(() => []),
		isAdmin ? getAllInvitationsForAdmin().catch(() => []) : Promise.resolve([]),
	])

	// Filter pending from all data (server-side)
	const pendingInvitations = isAdmin 
		? allInvitations.filter(inv => inv.status === "pending")
		: []

	return (
		<NotificationPageClient
			initialInvitations={invitations as any}
			initialAllInvitations={allInvitations as any}
			initialPendingInvitations={pendingInvitations as any}
			isAdmin={isAdmin}
		/>
	)
}

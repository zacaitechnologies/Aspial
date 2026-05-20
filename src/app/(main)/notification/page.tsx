import { getCachedUser } from "@/lib/auth-cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { checkHasFullAccess } from "../actions/admin-actions"
import { getUserInvitations, getAllInvitationsForAdmin } from "../projects/permissions"
import { getNotificationCustomServices } from "../quotations/action"
import NotificationPageClient from "./components/NotificationPageClient"

export const dynamic = 'force-dynamic'

export default async function NotificationPage() {
	const user = await getCachedUser()
	if (!user?.id) {
		return null
	}

	const isAdmin = await checkHasFullAccess(user.id)
	const canReviewCustomServices = await getCachedIsUserAdmin(user.id)
	const canManageAllInvitations = await getCachedIsUserAdmin(user.id)

	const userInvitations = await getUserInvitations(user.id).catch(() => [])

	const [allInvitations, initialCustomServices] = await Promise.all([
		canManageAllInvitations
			? getAllInvitationsForAdmin().catch(() => [])
			: Promise.resolve(userInvitations),
		getNotificationCustomServices().catch(() => []),
	])

	const pendingInvitations = canManageAllInvitations
		? allInvitations.filter((inv) => inv.status === "pending")
		: userInvitations.filter(
				(inv) => inv.status === "pending" && inv.invitedUser === user.id
			)

	return (
		<NotificationPageClient
			initialInvitations={userInvitations as any}
			canManageAllInvitations={canManageAllInvitations}
			initialAllInvitations={allInvitations as any}
			initialPendingInvitations={pendingInvitations as any}
			initialCustomServices={initialCustomServices as any}
			isAdmin={isAdmin}
			canReviewCustomServices={canReviewCustomServices}
		/>
	)
}

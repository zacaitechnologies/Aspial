import { getCachedUser } from "@/lib/auth-cache"
import { getReceiptsPaginated, getReceiptAdvisors } from "./action"
import ReceiptsClient from "./components/ReceiptsClient"
import { checkIsOperationUser, checkHasFullAccess } from "../actions/admin-actions"
import AccessDenied from "../components/AccessDenied"

export const dynamic = 'force-dynamic'

// Server Component - fetches data on server for fast initial load
export default async function ReceiptsPage() {
	// Get user on server - this is cached
	const user = await getCachedUser()
	
	if (!user) {
		return null
	}

	// Check if user is operation-user (restricted access) and admin status in parallel
	const [isOperationUser, isAdmin] = await Promise.all([
		checkIsOperationUser(user.id),
		checkHasFullAccess(user.id)
	])

	if (isOperationUser) {
		return <AccessDenied />
	}

	const [initialData, advisors] = await Promise.all([
		getReceiptsPaginated(1, 10, {}, true),
		getReceiptAdvisors(),
	])

	return (
		<ReceiptsClient
			initialData={initialData}
			userId={user.id}
			isAdmin={isAdmin}
			initialAdvisors={advisors}
		/>
	)
}

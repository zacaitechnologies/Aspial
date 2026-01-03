import { getCachedUser } from "@/lib/auth-cache"
import { getReceiptsPaginated } from "./action"
import ReceiptsClient from "./components/ReceiptsClient"
import { checkIsOperationUser } from "../actions/admin-actions"
import AccessDenied from "../components/AccessDenied"

export const dynamic = 'force-dynamic'

// Server Component - fetches data on server for fast initial load
export default async function ReceiptsPage() {
	// Get user on server - this is cached
	const user = await getCachedUser()
	
	if (!user) {
		return null
	}

	// Check if user is operation-user (restricted access)
	const isOperationUser = await checkIsOperationUser(user.id)
	if (isOperationUser) {
		return <AccessDenied />
	}

	// Fetch initial data on server with caching enabled for better performance
	const initialData = await getReceiptsPaginated(1, 10, {}, true)

	return <ReceiptsClient initialData={initialData} userId={user.id} />
}

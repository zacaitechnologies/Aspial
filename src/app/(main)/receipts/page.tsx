import { getCachedUser } from "@/lib/auth-cache"
import { getReceiptsPaginated } from "./action"
import ReceiptsClient from "./components/ReceiptsClient"

export const dynamic = 'force-dynamic'

// Server Component - fetches data on server for fast initial load
export default async function ReceiptsPage() {
	// Get user on server - this is cached
	const user = await getCachedUser()
	
	if (!user) {
		return null
	}

	// Fetch initial data on server with caching enabled for better performance
	const initialData = await getReceiptsPaginated(1, 10, {}, true)

	return <ReceiptsClient initialData={initialData} userId={user.id} />
}

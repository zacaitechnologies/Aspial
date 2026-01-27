import { getCachedUser } from "@/lib/auth-cache"
import { getClientById } from "../action"
import { checkHasFullAccess } from "../../actions/admin-actions"
import { getCurrentUserId } from "../action"
import ClientDetailClient from "./ClientDetailClient"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
	params,
}: {
	params: Promise<{ id: string }> | { id: string }
}) {
	const user = await getCachedUser()
	if (!user) {
		return null
	}

	// Await params if it's a Promise (Next.js 15+)
	const resolvedParams = await Promise.resolve(params)
	
	// Validate params.id exists
	if (!resolvedParams?.id || typeof resolvedParams.id !== 'string') {
		notFound()
	}

	// Fetch client data, admin status, and current user ID in parallel
	const [client, isAdmin, currentUserId] = await Promise.all([
		getClientById(resolvedParams.id).catch(() => null),
		checkHasFullAccess(user.id),
		getCurrentUserId().catch(() => null),
	])

	if (!client) {
		notFound()
	}

	return (
		<ClientDetailClient
			client={client}
			isAdmin={isAdmin}
			currentUserId={currentUserId}
		/>
	)
}

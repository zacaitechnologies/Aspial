import { getCachedUser } from "@/lib/auth-cache"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function Home() {
	const user = await getCachedUser()
	
	// Redirect to projects if user is authenticated
	if (user) {
		redirect("/projects")
	}

	// Show loading state while redirecting (shouldn't reach here if user exists)
	return (
		<main className="!p-0 flex items-center justify-center min-h-screen">
			<div className="text-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
				<p className="text-gray-600">Redirecting to Projects...</p>
			</div>
		</main>
	)
}

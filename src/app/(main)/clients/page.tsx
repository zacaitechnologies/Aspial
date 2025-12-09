import { Suspense } from "react"
import { getCachedUser } from "@/lib/auth-cache"
import { getClientsPaginated } from "./action"
import ClientsClient from "./components/ClientsClient"

// Force dynamic rendering since we use cookies for auth
export const dynamic = 'force-dynamic'

// Server Component - fetches data on server for fast initial load
export default async function ClientsPage() {
  // Get user on server - this is cached
  const user = await getCachedUser()
  
  if (!user) {
    return null
  }

  // Fetch initial data on server - cached for 30 seconds
  const initialData = await getClientsPaginated(1, 12)

  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20 text-primary">
          <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-lg font-medium">Loading clients…</p>
        </div>
      </div>
    }>
      <ClientsClient initialData={initialData} userId={user.id} />
    </Suspense>
  )
}

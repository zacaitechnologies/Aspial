import { Suspense } from "react"
import { getCachedUser } from "@/lib/auth-cache"
import { getClientsPaginated, getClientsDashboardTotals } from "./action"
import ClientsClient from "./components/ClientsClient"
import { checkIsOperationUser, checkHasFullAccess } from "../actions/admin-actions"
import AccessDenied from "../components/AccessDenied"

// Force dynamic rendering since we use cookies for auth
export const dynamic = 'force-dynamic'

// Server Component - fetches data on server for fast initial load
export default async function ClientsPage() {
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

  // Fetch initial data and dashboard totals (everyone can see quotation/invoice outstanding balance)
  const [initialData, dashboardTotals, hasFullAccess] = await Promise.all([
    getClientsPaginated(1, 12),
    getClientsDashboardTotals(),
    checkHasFullAccess(user.id),
  ])

  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20 text-primary">
          <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-lg font-medium">Loading clients…</p>
        </div>
      </div>
    }>
      <ClientsClient
        initialData={initialData}
        userId={user.id}
        hasFullAccess={hasFullAccess}
        dashboardTotals={dashboardTotals}
      />
    </Suspense>
  )
}

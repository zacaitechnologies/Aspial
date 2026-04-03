export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"

import {
  getUserWithRole,
  fetchAllLeaveApplications,
  fetchUserLeaveApplications,
  fetchLeaveBalances,
  fetchAllEmployeeLeaveOverview,
  fetchLeaveStats,
  fetchPendingChangeRequests,
  fetchUserChangeRequests,
  fetchEntitlementDefaults,
  fetchAllUsers,
} from "./action"
import AdminLeaveView from "./components/AdminLeaveView"
import UserLeaveView from "./components/UserLeaveView"
import { isRedirectError } from "next/dist/client/components/redirect-error"

export default async function LeavePage() {
  try {
    const { user, isAdmin } = await getUserWithRole()
    const currentYear = new Date().getFullYear()

    if (isAdmin) {
      const [
        applications,
        employeeOverview,
        stats,
        changeRequests,
        entitlementDefaults,
        allUsers,
      ] = await Promise.all([
        fetchAllLeaveApplications(),
        fetchAllEmployeeLeaveOverview(currentYear),
        fetchLeaveStats(),
        fetchPendingChangeRequests(),
        fetchEntitlementDefaults(),
        fetchAllUsers(),
      ])

      return (
        <AdminLeaveView
          initialApplications={applications}
          initialEmployeeOverview={employeeOverview}
          initialStats={stats}
          initialChangeRequests={changeRequests}
          initialEntitlementDefaults={entitlementDefaults}
          allUsers={allUsers}
          currentUserId={user.id}
          currentYear={currentYear}
        />
      )
    } else {
      const [applications, balances, changeRequests] = await Promise.all([
        fetchUserLeaveApplications(user.id),
        fetchLeaveBalances(user.id, currentYear),
        fetchUserChangeRequests(user.id),
      ])

      return (
        <UserLeaveView
          initialApplications={applications}
          initialBalances={balances}
          initialChangeRequests={changeRequests}
          userId={user.id}
          currentYear={currentYear}
        />
      )
    }
  } catch (error) {
    if (isRedirectError(error)) throw error
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load leave data. Please try again.</p>
      </div>
    )
  }
}

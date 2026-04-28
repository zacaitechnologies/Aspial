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
import { getMalaysiaYear } from "@/lib/malaysia-time"

function parseOverviewYear(
  yearParam: string | undefined,
  malaysiaYear: number
): number {
  if (!yearParam || !/^\d{4}$/.test(yearParam)) {
    return malaysiaYear
  }
  const y = Number.parseInt(yearParam, 10)
  return Math.min(Math.max(y, malaysiaYear - 10), malaysiaYear + 1)
}

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }> | { year?: string }
}) {
  try {
    const { user, isAdmin } = await getUserWithRole()
    const malaysiaYear = getMalaysiaYear()
    const resolvedSearch = await Promise.resolve(searchParams)
    const overviewYear = parseOverviewYear(resolvedSearch?.year, malaysiaYear)

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
        fetchAllEmployeeLeaveOverview(overviewYear),
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
          currentYear={malaysiaYear}
          overviewYear={overviewYear}
        />
      )
    } else {
      const [applications, balances, changeRequests] = await Promise.all([
        fetchUserLeaveApplications(user.id),
        fetchLeaveBalances(user.id, malaysiaYear),
        fetchUserChangeRequests(user.id),
      ])

      return (
        <UserLeaveView
          initialApplications={applications}
          initialBalances={balances}
          initialChangeRequests={changeRequests}
          userId={user.id}
          currentYear={malaysiaYear}
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

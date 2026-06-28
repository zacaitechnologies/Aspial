import { getCachedUser } from "@/lib/auth-cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { currentMalaysiaPeriod } from "./config"
import { getColleaguesToRate, getMyReports, getRateableEmployees } from "./actions"
import { KpiAdminConsole } from "./components/KpiAdminConsole"
import { KpiEmployeeView } from "./components/KpiEmployeeView"

// Uses cookies for auth — must render per-request.
export const dynamic = "force-dynamic"

export default async function KpiPage() {
  const user = await getCachedUser()
  if (!user) return null

  const isAdmin = await getCachedIsUserAdmin(user.id)
  const period = currentMalaysiaPeriod()

  if (isAdmin) {
    const employees = await getRateableEmployees()
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <KpiAdminConsole employees={employees} initialPeriod={period} />
        </div>
      </div>
    )
  }

  const [reports, colleagues] = await Promise.all([
    getMyReports(),
    getColleaguesToRate(period.year, period.month),
  ])

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <KpiEmployeeView
          reports={reports}
          initialPeriod={period}
          initialColleagues={colleagues}
        />
      </div>
    </div>
  )
}

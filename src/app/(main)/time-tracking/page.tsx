export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { getUserWithRole, fetchAllUserTimeEntries, fetchAllUsers, fetchAllProjects, fetchUserTimeEntries, fetchUserProjects } from "./action"
import AdminTimeTracking from "./components/AdminTimeTracking"
import UserTimeTracking from "./components/UserTimeTracking"
import { LoadingSpinner } from "./components/LoadingSpinner"
import { isRedirectError } from "next/dist/client/components/redirect-error"

export default async function TimeTrackingPage() {
  try {
    const { user, isAdmin } = await getUserWithRole()
    
    if (isAdmin) {
      // Load admin data
      const [timeEntries, projects, users] = await Promise.all([
        fetchAllUserTimeEntries(),
        fetchAllProjects(),
        fetchAllUsers(),
      ])
      
      return (
        <AdminTimeTracking
          initialTimeEntries={timeEntries}
          initialProjects={projects}
          initialUsers={users}
        />
      )
    } else {
      // Load user-specific data
      const [timeEntries, projects] = await Promise.all([
        fetchUserTimeEntries(user.supabase_id),
        fetchUserProjects(user.supabase_id),
      ])
      
      return (
        <UserTimeTracking
          initialTimeEntries={timeEntries}
          initialProjects={projects}
          userId={user.supabase_id}
        />
      )
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error loading time tracking page:", error)
    return <LoadingSpinner />
  }
}

import { getCachedUser } from "@/lib/auth-cache"
import { getCachedIsUserAdmin, getCachedUserRole } from "@/lib/admin-cache"
import { prisma } from "@/lib/prisma"
import type { TaskWithAssignee } from "@/app/(main)/projects/types"
import {
	getDashboardTaskAssigneeOptions,
	getDashboardTasks,
} from "./actions"
import { DashboardAppointmentsSection } from "./components/DashboardAppointmentsSection"
import { DashboardHeader } from "./components/DashboardHeader"
import { DashboardTasksSection } from "./components/DashboardTasksSection"
import type { DashboardAppointment } from "./types"
import { DEFAULT_DASHBOARD_TASK_STATUSES } from "./types"

function getLatestDashboardUpdate(
	tasks: TaskWithAssignee[],
	appointments: DashboardAppointment[]
): Date | null {
	const timestamps: number[] = []

	for (const task of tasks) {
		timestamps.push(new Date(task.updatedAt).getTime())
	}
	for (const appointment of appointments) {
		timestamps.push(new Date(appointment.updatedAt).getTime())
	}

	if (timestamps.length === 0) return null
	return new Date(Math.max(...timestamps))
}

// Force dynamic rendering since we use cookies for authentication
export const dynamic = "force-dynamic"

// Personal dashboard — appointments assigned to the logged-in user
export default async function DashboardPage() {
	const user = await getCachedUser()

	if (!user) {
		return null
	}

	const isAdmin = await getCachedIsUserAdmin(user.id)

	const [userRole, myTasks, assigneeOptions, allTasks] = await Promise.all([
		getCachedUserRole(user.id),
		getDashboardTasks({ scope: "my", statuses: DEFAULT_DASHBOARD_TASK_STATUSES }),
		isAdmin ? getDashboardTaskAssigneeOptions() : Promise.resolve([]),
		isAdmin
			? getDashboardTasks({ scope: "all", statuses: DEFAULT_DASHBOARD_TASK_STATUSES })
			: Promise.resolve([]),
	])

	const assignedBookings = await prisma.appointmentBooking.findMany({
		where: {
			status: "active",
			assignees: { some: { userId: user.id } },
		},
		include: {
			appointment: { select: { name: true, location: true, brand: true } },
			project: { select: { name: true, clientName: true } },
			bookedByUser: { select: { firstName: true, lastName: true, email: true } },
			assignees: {
				select: { user: { select: { firstName: true, lastName: true, email: true } } },
			},
		},
		orderBy: { startDate: "asc" },
	})

	const appointments: DashboardAppointment[] = assignedBookings.map((booking) => ({
		id: booking.id,
		updatedAt: booking.updatedAt.toISOString(),
		startDate: booking.startDate.toISOString(),
		endDate: booking.endDate.toISOString(),
		appointmentType: booking.appointmentType,
		bookedBy: booking.bookedBy,
		bookingName: booking.bookingName,
		purpose: booking.purpose,
		appointment: booking.appointment,
		project: booking.project,
		bookedByUser: booking.bookedByUser,
		assignees: booking.assignees,
	}))

	const lastUpdatedAt = getLatestDashboardUpdate(
		isAdmin ? allTasks : myTasks,
		appointments
	)

	return (
		<div className="dashboard-page min-h-screen bg-background px-4 py-6 sm:px-6">
			<div className="mx-auto max-w-4xl space-y-8">
				<DashboardHeader
					initialUserRole={userRole}
					lastUpdatedAt={lastUpdatedAt?.toISOString() ?? null}
				/>

				<DashboardAppointmentsSection appointments={appointments} />
				<DashboardTasksSection
					initialMyTasks={myTasks}
					initialAllTasks={allTasks}
					isAdmin={isAdmin}
					assigneeOptions={assigneeOptions}
				/>
			</div>
		</div>
	)
}

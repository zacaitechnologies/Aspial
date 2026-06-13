export type DashboardAppointment = {
	id: number
	updatedAt: string
	startDate: string
	endDate: string
	appointmentType: string
	bookedBy: string
	bookingName: string | null
	purpose: string | null
	appointment: {
		name: string
		location: string | null
		brand: string | null
	} | null
	project: {
		name: string
		clientName: string | null
	} | null
	bookedByUser: {
		firstName: string
		lastName: string
		email: string
	} | null
	assignees: Array<{
		user: { firstName: string; lastName: string; email: string }
	}>
}

/** Default dashboard load — excludes done to keep lists short */
export type TaskStatusOption = "todo" | "in_progress" | "done"

export const DEFAULT_DASHBOARD_TASK_STATUSES: TaskStatusOption[] = ["todo", "in_progress"]
export type DashboardTaskAssigneeOption = {
	id: string
	label: string
}

export type AppointmentTimeFilter = "upcoming" | "past" | "all"
export type SortField = "dueDate" | "startDate"
export type SortOrder = "asc" | "desc"

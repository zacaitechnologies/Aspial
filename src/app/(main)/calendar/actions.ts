"use server"

import { prisma } from "@/lib/prisma"
import { formatLocalDate, formatLocalDateTime } from "@/lib/date-utils"
import type { LeaveHalfDay } from "@prisma/client"
import { getAllUserTasks } from "../projects/task-actions"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import {
	APPOINTMENT_TYPES,
	CALENDAR_EVENT_TYPES,
	type AppointmentType,
	type CalendarEventType,
} from "./constants"

/** Server Actions may deserialize `Date` props as ISO strings — normalize before using Date APIs. */
function coerceToDate(value: Date | string): Date {
	if (value instanceof Date) return value
	return new Date(value)
}

export interface CalendarBooking {
	id: string
	title: string
	/** Display name for the booking (appointment name or task name). */
	bookingName?: string | null
	description: string
	date: string
	startTime: string
	endTime: string
	type: "appointment" | "task" | "leave"
	appointmentType: CalendarEventType
	location: string
	attendees: number
	color: string
	originalData: unknown
	projectId?: number | null
	projectName?: string | null
	clientName?: string | null
	creatorName?: string | null
	assigneeName?: string | null
	taskStartDate?: string | null
	taskDueDate?: string | null
	isUserBooking?: boolean
	isTeamBooking?: boolean
	assigneeId?: string | null
	creatorId?: string
}

/** Local calendar dates (YYYY-MM-DD) for each day of a leave span, optionally clipped to a visible range. */
function expandLeaveDatesInRange(
	leaveStart: Date,
	leaveEnd: Date,
	range?: { start: Date | string; end: Date | string }
): string[] {
	const rs = range ? coerceToDate(range.start) : null
	const re = range ? coerceToDate(range.end) : null
	const start = new Date(
		leaveStart.getFullYear(),
		leaveStart.getMonth(),
		leaveStart.getDate()
	)
	const end = new Date(leaveEnd.getFullYear(), leaveEnd.getMonth(), leaveEnd.getDate())
	const rangeStart = rs
		? new Date(rs.getFullYear(), rs.getMonth(), rs.getDate())
		: null
	const rangeEnd = re
		? new Date(re.getFullYear(), re.getMonth(), re.getDate())
		: null
	const out: string[] = []
	const cur = new Date(start)
	while (cur <= end) {
		if (rangeStart && rangeEnd) {
			if (cur < rangeStart || cur > rangeEnd) {
				cur.setDate(cur.getDate() + 1)
				continue
			}
		}
		out.push(formatLocalDate(cur))
		cur.setDate(cur.getDate() + 1)
	}
	return out
}

function leaveTimeRangeForDay(
	halfDay: LeaveHalfDay,
	isSingleCalendarDayLeave: boolean
): { startTime: string; endTime: string } {
	if (!isSingleCalendarDayLeave || halfDay === "NONE") {
		return { startTime: "00:00", endTime: "23:59" }
	}
	if (halfDay === "FIRST_HALF") {
		return { startTime: "00:00", endTime: "12:00" }
	}
	if (halfDay === "SECOND_HALF") {
		return { startTime: "12:00", endTime: "23:59" }
	}
	return { startTime: "00:00", endTime: "23:59" }
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
	return getCachedIsUserAdmin(userId)
}

// Get user's project IDs
async function getUserProjectIds(userId: string): Promise<number[]> {
	try {
		// Get projects where user is the creator
		const createdProjects = await prisma.project.findMany({
			where: {
				createdBy: userId,
			},
			select: {
				id: true,
			},
		})

		// Get projects where user has permissions
		const permittedProjects = await prisma.project.findMany({
			where: {
				permissions: {
					some: {
						userId: userId,
					},
				},
			},
			select: {
				id: true,
			},
		})

		// Combine and deduplicate
		const allProjects = [...createdProjects, ...permittedProjects]
		const uniqueProjectIds = Array.from(
			new Set(allProjects.map(p => p.id))
		)

		return uniqueProjectIds
	} catch (error) {
		console.error('Error fetching user project IDs:', error)
		return []
	}
}

// Get user's projects with details
export async function getUserProjects(userId: string): Promise<{ id: number; name: string }[]> {
	try {
		// Get projects where user is the creator
		const createdProjects = await prisma.project.findMany({
			where: {
				createdBy: userId,
			},
			select: {
				id: true,
				name: true,
			},
		})

		// Get projects where user has permissions
		const permittedProjects = await prisma.project.findMany({
			where: {
				permissions: {
					some: {
						userId: userId,
					},
				},
			},
			select: {
				id: true,
				name: true,
			},
		})

		// Combine and deduplicate by ID
		const projectMap = new Map<number, string>()
		createdProjects.forEach(p => projectMap.set(p.id, p.name))
		permittedProjects.forEach(p => projectMap.set(p.id, p.name))

		return Array.from(projectMap, ([id, name]) => ({ id, name }))
	} catch (error) {
		console.error('Error fetching user projects:', error)
		return []
	}
}

function formatLeaveApplicantName(user: {
	firstName: string
	lastName: string
	email: string
}): string {
	const name = `${user.firstName} ${user.lastName}`.trim()
	return name || user.email
}

/** All org members' leave (pending + approved), for shared calendar visibility. */
async function _fetchLeaveBookings(
	viewerSupabaseId: string,
	safeRange?: { start: Date; end: Date }
): Promise<CalendarBooking[]> {
	const leaves = await prisma.leaveApplication.findMany({
		where: {
			status: { in: ["PENDING", "APPROVED"] },
			...(safeRange
				? {
						startDate: { lte: safeRange.end },
						endDate: { gte: safeRange.start },
					}
				: {}),
		},
		select: {
			id: true,
			leaveType: true,
			startDate: true,
			endDate: true,
			halfDay: true,
			reason: true,
			status: true,
			totalDays: true,
			user: {
				select: {
					firstName: true,
					lastName: true,
					email: true,
					supabase_id: true,
				},
			},
		},
	})

	const leaveStartEndSameDay = (s: Date, e: Date) => formatLocalDate(s) === formatLocalDate(e)
	const results: CalendarBooking[] = []

	for (const leave of leaves) {
		const applicantName = formatLeaveApplicantName(leave.user)
		const applicantSupabaseId = leave.user.supabase_id
		const isOwnLeave = applicantSupabaseId === viewerSupabaseId

		const startD = new Date(leave.startDate)
		const endD = new Date(leave.endDate)
		const dayStrings = expandLeaveDatesInRange(startD, endD, safeRange)
		const isSingleCalendarDayLeave = leaveStartEndSameDay(startD, endD)
		const { startTime, endTime } = leaveTimeRangeForDay(leave.halfDay, isSingleCalendarDayLeave)

		const typeLabel = leave.leaveType === "PAID" ? "Paid" : "Unpaid"
		const halfLabel =
			isSingleCalendarDayLeave && leave.halfDay === "FIRST_HALF"
				? " (AM)"
				: isSingleCalendarDayLeave && leave.halfDay === "SECOND_HALF"
					? " (PM)"
					: ""
		const statusSuffix = leave.status === "PENDING" ? " · Pending" : ""
		const titleBase = `${typeLabel} leave${halfLabel}${statusSuffix}`

		for (const dateStr of dayStrings) {
			results.push({
				id: `leave-${leave.id}-${dateStr}`,
				title: `${applicantName} · ${titleBase}`,
				bookingName: `${typeLabel} leave`,
				description: leave.reason,
				date: dateStr,
				startTime,
				endTime,
				type: "leave",
				appointmentType: "LEAVE",
				location: "Leave",
				attendees: 1,
				color: CALENDAR_EVENT_TYPES.LEAVE.color,
				projectId: null,
				projectName: null,
				clientName: null,
				creatorName: applicantName,
				assigneeName: null,
				taskStartDate: null,
				taskDueDate: null,
				isUserBooking: isOwnLeave,
				isTeamBooking: !isOwnLeave,
				assigneeId: null,
				creatorId: applicantSupabaseId,
				originalData: {
					leaveApplicationId: leave.id,
					status: leave.status,
					leaveType: leave.leaveType,
					halfDay: leave.halfDay,
					totalDays: leave.totalDays,
					applicantSupabaseId,
				},
			})
		}
	}
	return results
}

/** Fetch appointment bookings, filtered by range and user permissions. */
async function _fetchAppointmentBookings(
	userId: string,
	userName: string,
	isAdmin: boolean,
	userProjectIds: number[],
	safeRange?: { start: Date; end: Date }
): Promise<CalendarBooking[]> {
	const appointmentWhere: { status: string; startDate?: { lte: Date }; endDate?: { gte: Date } } = {
		status: "active",
	}
	if (safeRange) {
		appointmentWhere.startDate = { lte: safeRange.end }
		appointmentWhere.endDate = { gte: safeRange.start }
	}

	const appointmentBookings = await prisma.appointmentBooking.findMany({
		where: appointmentWhere,
		include: {
			appointment: {
				select: {
					name: true,
					location: true,
					brand: true
				}
			},
			project: {
				select: {
					id: true,
					name: true,
					clientName: true
				}
			}
		}
	})

	const results: CalendarBooking[] = []

	appointmentBookings.forEach((booking) => {
		const bookingWithProject = booking as Record<string, unknown> & typeof booking
		if (!isAdmin) {
			const isUserBooking = booking.bookedBy === userName
			const isProjectBooking = bookingWithProject.project &&
				userProjectIds.includes((bookingWithProject.project as { id: number }).id)
			if (!isUserBooking && !isProjectBooking) return
		}

		const startDate = new Date(booking.startDate)
		const endDate = new Date(booking.endDate)
		const isUserBooking = booking.bookedBy === userName
		const projId = (bookingWithProject.project as { id: number } | null)?.id
		const isProjectBooking = projId != null && userProjectIds.includes(projId)

		const appointmentType = (booking.appointmentType as AppointmentType) || "OTHERS"
		const appointmentConfig = APPOINTMENT_TYPES[appointmentType] || APPOINTMENT_TYPES.OTHERS

		let title = `Appointment - ${booking.bookedBy}`
		let location = "Unspecified"
		if (booking.appointment) {
			title = `${booking.appointment.name} - ${booking.bookedBy}`
			location = booking.appointment.location || booking.appointment.brand || "Appointment"
		}

		const dateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`

		results.push({
			id: `appointment-${booking.id}`,
			title,
			bookingName: booking.appointment?.name ?? null,
			description: booking.purpose || `Appointment by ${booking.bookedBy}`,
			date: dateStr,
			startTime: startDate.toTimeString().slice(0, 5),
			endTime: endDate.toTimeString().slice(0, 5),
			type: "appointment",
			appointmentType,
			location,
			attendees: booking.attendees || 1,
			color: appointmentConfig.color,
			projectId: projId ?? null,
			projectName: (bookingWithProject.project as { name?: string } | null)?.name || null,
			clientName: (bookingWithProject.project as { clientName?: string | null } | null)?.clientName || null,
			creatorName: booking.bookedBy || null,
			assigneeName: null,
			taskStartDate: null,
			taskDueDate: null,
			isUserBooking,
			isTeamBooking: isProjectBooking && !isUserBooking,
			originalData: {
				...booking,
				startDate: formatLocalDateTime(startDate),
				endDate: formatLocalDateTime(endDate),
			},
		})
	})

	return results
}

/** Fetch tasks mapped to calendar bookings. */
async function _fetchTaskBookings(
	userId: string,
	safeRange?: { start: Date; end: Date }
): Promise<CalendarBooking[]> {
	const tasks = await getAllUserTasks(userId, safeRange ?? undefined)

	const projectIds = Array.from(new Set(tasks.map(t => t.project?.id).filter((id): id is number => id !== undefined)))
	const projectsWithClients = await prisma.project.findMany({
		where: { id: { in: projectIds } },
		select: { id: true, clientName: true },
	})
	const clientNameMap = new Map(projectsWithClients.map(p => [p.id, p.clientName]))

	const results: CalendarBooking[] = []
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	tasks.forEach((task) => {
		if (!task.dueDate) return

		const dueDate = new Date(task.dueDate)
		dueDate.setHours(23, 59, 59, 999)
		const startDate = task.startDate ? new Date(task.startDate) : new Date(task.dueDate)
		startDate.setHours(0, 0, 0, 0)
		const isOverdue = dueDate < today

		const isUserTask = task.assigneeId === userId
		const isCreatorTask = task.creatorId === userId

		const creatorName = task.creator
			? `${task.creator.firstName || ""} ${task.creator.lastName || ""}`.trim() || task.creator.email
			: null
		const assigneeName = task.assignee
			? `${task.assignee.firstName || ""} ${task.assignee.lastName || ""}`.trim() || task.assignee.email
			: null

		const clientName = task.project?.id ? (clientNameMap.get(task.project.id) || null) : null
		const startDateString = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`
		const dueDateString = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`

		const shared = {
			bookingName: task.title,
			type: "task" as const,
			appointmentType: "OTHERS" as const,
			location: task.project?.name || "Unknown Project",
			attendees: 1,
			color: isOverdue ? "bg-destructive" : APPOINTMENT_TYPES.OTHERS.color,
			projectId: task.project?.id,
			projectName: task.project?.name || null,
			clientName,
			creatorName,
			assigneeName,
			taskStartDate: startDateString,
			taskDueDate: dueDateString,
			isUserBooking: isUserTask || isCreatorTask,
			isTeamBooking: !isUserTask && !isCreatorTask,
			assigneeId: task.assigneeId || null,
			creatorId: task.creatorId,
			originalData: { ...task, isOverdue, dueDate: formatLocalDate(dueDate) },
		}

		const startTitle = isOverdue
			? `OVERDUE: ${task.title} - ${task.project?.name || "Unknown Project"} (START)`
			: `START: ${task.title} - ${task.project?.name || "Unknown Project"}`

		results.push({
			...shared,
			id: `task-${task.id}-start`,
			title: startTitle,
			description: task.description || `Task starts on ${startDate.toLocaleDateString()}`,
			date: startDateString,
			startTime: "00:00",
			endTime: "23:59",
		})

		if (dueDateString !== startDateString) {
			const dueTitle = isOverdue
				? `OVERDUE: ${task.title} - ${task.project?.name || "Unknown Project"} (DUE)`
				: `DUE: ${task.title} - ${task.project?.name || "Unknown Project"}`

			results.push({
				...shared,
				id: `task-${task.id}-due`,
				title: dueTitle,
				description: task.description || `Task due on ${dueDate.toLocaleDateString()}`,
				date: dueDateString,
				startTime: "00:00",
				endTime: "23:59",
			})
		}
	})

	return results
}

// Fetch all bookings with permission filtering. Runs appointments, tasks, and leave in parallel.
export async function fetchAllBookings(
	userId: string,
	userName: string,
	range?: { start: Date | string; end: Date | string }
): Promise<CalendarBooking[]> {
	if (!userId || !userName) return []

	const safeRange = range
		? { start: coerceToDate(range.start), end: coerceToDate(range.end) }
		: undefined

	try {
		const [isAdmin, userProjectIds] = await Promise.all([
			checkIsAdmin(userId),
			getUserProjectIds(userId),
		])

		const [appointments, tasks, leave] = await Promise.allSettled([
			_fetchAppointmentBookings(userId, userName, isAdmin, userProjectIds, safeRange),
			_fetchTaskBookings(userId, safeRange),
			_fetchLeaveBookings(userId, safeRange),
		])

		const out: CalendarBooking[] = []
		if (appointments.status === "fulfilled") out.push(...appointments.value)
		if (tasks.status === "fulfilled") out.push(...tasks.value)
		if (leave.status === "fulfilled") out.push(...leave.value)
		return out
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error fetching bookings:", error)
		}
		return []
	}
}


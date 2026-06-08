"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { formatLocalDate, formatLocalDateTime, toBusinessTZParts, parseDateInBusinessTZ } from "@/lib/date-utils"
import type { LeaveHalfDay } from "@prisma/client"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import {
	syncBookingReminders,
	userCanAccessProject,
} from "@/app/(main)/appointment-bookings/actions"
import {
	APPOINTMENT_TYPES,
	CALENDAR_EVENT_TYPES,
	type AppointmentType,
	type AppointmentCategory,
	type CalendarEventType,
} from "./constants"
import {
	buildAppointmentTitle,
	resolveAppointmentClientLabel,
} from "./utils/appointment-display"

/** Server Actions may deserialize `Date` props as ISO strings — normalize before using Date APIs. */
function coerceToDate(value: Date | string): Date {
	if (value instanceof Date) return value
	return new Date(value)
}

export interface CalendarBooking {
	id: string
	title: string
	/** Contact / client booking name from appointment_bookings.bookingName. */
	bookingName?: string | null
	/** Booked equipment or appointment resource name. */
	appointmentName?: string | null
	description: string
	date: string
	startTime: string
	endTime: string
	type: "appointment" | "task" | "leave" | "blocker"
	appointmentType: CalendarEventType
	/** Appointments only: Internal vs External booking category. */
	appointmentCategory?: AppointmentCategory | null
	location: string
	attendees: number
	color: string
	originalData: unknown
	projectId?: number | null
	projectName?: string | null
	clientName?: string | null
	creatorName?: string | null
	/** For appointments: booker's email from bookedByUser. */
	creatorEmail?: string | null
	/** For appointments: confirmation email recipients stored on the booking. */
	clientEmails?: string[]
	assigneeName?: string | null
	taskStartDate?: string | null
	taskDueDate?: string | null
	isUserBooking?: boolean
	isTeamBooking?: boolean
	assigneeId?: string | null
	creatorId?: string | null
	/** Blockers only: true when the event is stored as full local days (week/day views use the all-day row). */
	allDay?: boolean
}

/** Inclusive MYT calendar dates (YYYY-MM-DD) between two stored UTC instants, optionally clipped to a visible range. */
function expandLeaveDatesInRange(
	leaveStart: Date,
	leaveEnd: Date,
	range?: { start: Date | string; end: Date | string }
): string[] {
	const startBiz = toBusinessTZParts(leaveStart).dateStr
	const endBiz = toBusinessTZParts(leaveEnd).dateStr
	const rangeStartStr = range ? toBusinessTZParts(coerceToDate(range.start)).dateStr : null
	const rangeEndStr = range ? toBusinessTZParts(coerceToDate(range.end)).dateStr : null

	const [startYear, startMonth, startDay] = startBiz.split("-").map(Number)
	const [endYear, endMonth, endDay] = endBiz.split("-").map(Number)
	const cur = new Date(startYear, startMonth - 1, startDay)
	const endDayDate = new Date(endYear, endMonth - 1, endDay)

	const out: string[] = []
	while (cur <= endDayDate) {
		const dateStr = formatLocalDate(cur)
		if (rangeStartStr && rangeEndStr && (dateStr < rangeStartStr || dateStr > rangeEndStr)) {
			cur.setDate(cur.getDate() + 1)
			continue
		}
		out.push(dateStr)
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
	const [leaves, leaveTypes] = await Promise.all([
		prisma.leaveApplication.findMany({
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
		}),
		prisma.leaveType.findMany({ select: { code: true, name: true } }),
	])

	const leaveTypeNameByCode = new Map(leaveTypes.map((t) => [t.code, t.name]))

	const leaveStartEndSameDay = (s: Date, e: Date) =>
		toBusinessTZParts(s).dateStr === toBusinessTZParts(e).dateStr
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

		const typeLabel = leaveTypeNameByCode.get(leave.leaveType) ?? leave.leaveType
		const halfLabel =
			isSingleCalendarDayLeave && leave.halfDay === "FIRST_HALF"
				? " (AM)"
				: isSingleCalendarDayLeave && leave.halfDay === "SECOND_HALF"
					? " (PM)"
					: ""
		const isPending = leave.status === "PENDING"
		const statusSuffix = isPending ? " · Pending" : ""
		const titleBase = `${typeLabel}${halfLabel}${statusSuffix}`
		const leaveColor = isPending
			? "bg-calendar-leave-pending text-foreground border border-dashed border-calendar-leave/70"
			: CALENDAR_EVENT_TYPES.LEAVE.color

		for (const dateStr of dayStrings) {
			results.push({
				id: `leave-${leave.id}-${dateStr}`,
				title: `${applicantName} · ${titleBase}`,
				bookingName: typeLabel,
				description: leave.reason,
				date: dateStr,
				startTime,
				endTime,
				type: "leave",
				appointmentType: "LEAVE",
				location: "Leave",
				attendees: 1,
				color: leaveColor,
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

/** Fetch all active appointment bookings in range (visible to every user on the calendar). */
async function _fetchAppointmentBookings(
	userId: string,
	userName: string,
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
					clientName: true,
					Client: {
						select: { email: true },
					},
				}
			},
			bookedByUser: {
				select: {
					firstName: true,
					lastName: true,
					email: true,
				}
			},
			bookingEmails: {
				select: { recipientEmail: true },
				orderBy: { sentAt: "asc" },
			},
		}
	})

	const results: CalendarBooking[] = []

	appointmentBookings.forEach((booking) => {
		const isUserBooking = booking.userId
			? booking.userId === userId
			: booking.bookedBy === userName
		const projId = booking.project?.id

		const startDate = new Date(booking.startDate)
		const endDate = new Date(booking.endDate)

		const bookerDisplay = booking.bookedByUser
			? formatLeaveApplicantName(booking.bookedByUser)
			: booking.bookedBy

		const creatorName = booking.bookedByUser
			? formatLeaveApplicantName(booking.bookedByUser)
			: null
		const creatorEmail = booking.bookedByUser?.email ?? null

		const clientEmailSet = new Set<string>()
		for (const row of booking.bookingEmails) {
			const email = row.recipientEmail.trim()
			if (email) clientEmailSet.add(email)
		}
		const projectClientEmail = booking.project?.Client?.email?.trim()
		if (projectClientEmail && clientEmailSet.size === 0) {
			clientEmailSet.add(projectClientEmail)
		}
		const clientEmails = Array.from(clientEmailSet)

		const appointmentType = (booking.appointmentType as AppointmentType) || "OTHERS"
		const appointmentConfig = APPOINTMENT_TYPES[appointmentType] || APPOINTMENT_TYPES.OTHERS

		const clientLabel = resolveAppointmentClientLabel({
			clientName: booking.project?.clientName || null,
			bookingName: booking.bookingName,
		})
		const title = buildAppointmentTitle(
			booking.appointment?.name ?? null,
			clientLabel,
			bookerDisplay
		)
		const location = booking.appointment
			? booking.appointment.location || booking.appointment.brand || "Appointment"
			: "Unspecified"

		const startParts = toBusinessTZParts(startDate)
		const endParts = toBusinessTZParts(endDate)

		results.push({
			id: `appointment-${booking.id}`,
			title,
			bookingName: booking.bookingName?.trim() || null,
			appointmentName: booking.appointment?.name ?? null,
			description: booking.purpose?.trim() ?? "",
			date: startParts.dateStr,
			startTime: startParts.timeStr,
			endTime: endParts.timeStr,
			type: "appointment",
			appointmentType,
			appointmentCategory:
				booking.appointmentCategory === "EXTERNAL" ? "EXTERNAL" : "INTERNAL",
			location,
			attendees: booking.attendees || 1,
			color: appointmentConfig.color,
			projectId: projId ?? null,
			projectName: booking.project?.name || null,
			clientName: booking.project?.clientName || null,
			creatorName,
			creatorEmail,
			clientEmails: clientEmails.length > 0 ? clientEmails : undefined,
			creatorId: booking.userId ?? null,
			assigneeName: null,
			taskStartDate: null,
			taskDueDate: null,
			isUserBooking,
			isTeamBooking: false,
			originalData: {
				...booking,
				startDate: formatLocalDateTime(startDate),
				endDate: formatLocalDateTime(endDate),
			},
		})
	})

	return results
}

async function _fetchTaskBookings(
	_userId: string,
	_safeRange?: { start: Date; end: Date }
): Promise<CalendarBooking[]> {
	return []
}

/** Fetch calendar blockers, normalized to CalendarBooking[]. Visible to all users. */
async function _fetchCalendarBlockers(
	safeRange?: { start: Date; end: Date }
): Promise<CalendarBooking[]> {
	const blockers = await prisma.calendarBlocker.findMany({
		where: safeRange
			? {
					startDateTime: { lte: safeRange.end },
					endDateTime: { gte: safeRange.start },
				}
			: {},
		include: {
			createdBy: {
				select: { firstName: true, lastName: true, email: true },
			},
		},
		orderBy: { startDateTime: "asc" },
	})

	const results: CalendarBooking[] = []

	for (const blocker of blockers) {
		const start = new Date(blocker.startDateTime)
		const end = new Date(blocker.endDateTime)
		const creatorName = `${blocker.createdBy.firstName} ${blocker.createdBy.lastName}`.trim() || blocker.createdBy.email

		const startBiz = toBusinessTZParts(start)
		const endBiz = toBusinessTZParts(end)
		const blockerAllDay =
			startBiz.timeStr === "00:00" &&
			endBiz.timeStr === "23:59"

		// Expand across days using business-TZ date strings
		const startDateParts = startBiz.dateStr.split("-").map(Number)
		const endDateParts = endBiz.dateStr.split("-").map(Number)
		const cur = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2])
		const endDay = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2])

		while (cur <= endDay) {
			const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`

			const isSameStartDay = dateStr === startBiz.dateStr
			const isSameEndDay = dateStr === endBiz.dateStr

			const dayStartTime = isSameStartDay ? startBiz.timeStr : "00:00"
			const dayEndTime = isSameEndDay ? endBiz.timeStr : "23:59"

			results.push({
				id: `blocker-${blocker.id}-${dateStr}`,
				title: blocker.title,
				bookingName: blocker.title,
				description: blocker.description || `Blocker: ${blocker.title}`,
				date: dateStr,
				startTime: dayStartTime,
				endTime: dayEndTime,
				type: "blocker",
				appointmentType: "BLOCKER",
				location: blocker.blocksAppointments ? "Blocks Appointments" : "Informational",
				attendees: 0,
				color: CALENDAR_EVENT_TYPES.BLOCKER.color,
				projectId: null,
				projectName: null,
				clientName: null,
				creatorName,
				assigneeName: null,
				taskStartDate: null,
				taskDueDate: null,
				isUserBooking: false,
				isTeamBooking: false,
				assigneeId: null,
				creatorId: blocker.createdById,
				allDay: blockerAllDay,
				originalData: {
					blockerId: blocker.id,
					blocksAppointments: blocker.blocksAppointments,
					startDateTime: blocker.startDateTime.toISOString(),
					endDateTime: blocker.endDateTime.toISOString(),
					allDay: blockerAllDay,
				},
			})

			cur.setDate(cur.getDate() + 1)
		}
	}

	return results
}

// ─── Calendar Blocker CRUD (admin-only) ───────────────────────────────────────

export async function createCalendarBlocker(formData: FormData) {
	const user = await (await import("@/lib/auth-cache")).getCachedUser()
	if (!user) return { success: false, error: "Not authenticated" }

	const isAdmin = await getCachedIsUserAdmin(user.id)
	if (!isAdmin) return { success: false, error: "Admin access required" }

	const title = formData.get("title") as string
	const description = (formData.get("description") as string) || null
	const startDateTime = formData.get("startDateTime") as string
	const endDateTime = formData.get("endDateTime") as string
	const blocksAppointments = formData.get("blocksAppointments") === "true"

	if (!title || !startDateTime || !endDateTime) {
		return { success: false, error: "Title, start time, and end time are required" }
	}

	const start = parseDateInBusinessTZ(startDateTime)
	const end = parseDateInBusinessTZ(endDateTime)
	if (end <= start) {
		return { success: false, error: "End time must be after start time" }
	}

	try {
		await prisma.calendarBlocker.create({
			data: {
				title,
				description,
				startDateTime: start,
				endDateTime: end,
				blocksAppointments,
				createdById: user.id,
			},
		})
		revalidatePath("/calendar")
		return { success: true }
	} catch (error) {
		console.error("Error creating calendar blocker:", error)
		return { success: false, error: "Failed to create blocker" }
	}
}

export async function updateCalendarBlocker(id: number, formData: FormData) {
	const user = await (await import("@/lib/auth-cache")).getCachedUser()
	if (!user) return { success: false, error: "Not authenticated" }

	const isAdmin = await getCachedIsUserAdmin(user.id)
	if (!isAdmin) return { success: false, error: "Admin access required" }

	const title = formData.get("title") as string
	const description = (formData.get("description") as string) || null
	const startDateTime = formData.get("startDateTime") as string
	const endDateTime = formData.get("endDateTime") as string
	const blocksAppointments = formData.get("blocksAppointments") === "true"

	if (!title || !startDateTime || !endDateTime) {
		return { success: false, error: "Title, start time, and end time are required" }
	}

	const start = parseDateInBusinessTZ(startDateTime)
	const end = parseDateInBusinessTZ(endDateTime)
	if (end <= start) {
		return { success: false, error: "End time must be after start time" }
	}

	try {
		await prisma.calendarBlocker.update({
			where: { id },
			data: {
				title,
				description,
				startDateTime: start,
				endDateTime: end,
				blocksAppointments,
			},
		})
		revalidatePath("/calendar")
		return { success: true }
	} catch (error) {
		console.error("Error updating calendar blocker:", error)
		return { success: false, error: "Failed to update blocker" }
	}
}

export async function deleteCalendarBlocker(id: number) {
	const user = await (await import("@/lib/auth-cache")).getCachedUser()
	if (!user) return { success: false, error: "Not authenticated" }

	const isAdmin = await getCachedIsUserAdmin(user.id)
	if (!isAdmin) return { success: false, error: "Admin access required" }

	try {
		await prisma.calendarBlocker.delete({ where: { id } })
		revalidatePath("/calendar")
		return { success: true }
	} catch (error) {
		console.error("Error deleting calendar blocker:", error)
		return { success: false, error: "Failed to delete blocker" }
	}
}

/** Fetch blockers that block appointments in a date range (used by appointment booking). */
export async function getActiveBlockers(startDate: Date | string, endDate: Date | string) {
	try {
		const start = coerceToDate(startDate)
		const end = coerceToDate(endDate)

		return await prisma.calendarBlocker.findMany({
			where: {
				blocksAppointments: true,
				startDateTime: { lte: end },
				endDateTime: { gte: start },
			},
			select: {
				id: true,
				title: true,
				startDateTime: true,
				endDateTime: true,
			},
			orderBy: { startDateTime: "asc" },
		})
	} catch (error) {
		console.error("Error fetching active blockers:", error)
		return []
	}
}

// ─── Appointment Booking from Calendar ───────────────────────────────────────

/** Fetch all bookable appointments (isAvailable = true). */
export async function getAvailableAppointments() {
	try {
		return await prisma.appointment.findMany({
			where: { isAvailable: true },
			select: {
				id: true,
				name: true,
				location: true,
				brand: true,
				description: true,
				appointmentType: true,
			},
			orderBy: { name: "asc" },
		})
	} catch (error) {
		console.error("Error fetching available appointments:", error)
		return []
	}
}

/** Fetch full appointment booking details for editing. */
export async function getAppointmentBookingDetails(bookingId: number) {
	try {
		const booking = await prisma.appointmentBooking.findUnique({
			where: { id: bookingId },
			include: {
				appointment: {
					select: {
						id: true,
						name: true,
						location: true,
						brand: true,
						appointmentType: true,
					},
				},
				project: {
					select: {
						id: true,
						name: true,
						clientName: true,
						Client: {
							select: {
								id: true,
								name: true,
								email: true,
								phone: true,
								company: true,
							},
						},
					},
				},
				bookingEmails: {
					select: {
						recipientEmail: true,
					},
				},
				reminders: {
					select: {
						id: true,
						offsetMinutes: true,
						recipientEmail: true,
					},
				},
			},
		})

		return booking
	} catch (error) {
		console.error("Error fetching appointment booking details:", error)
		return null
	}
}

/** Update an existing appointment booking (owner or admin). */
export async function updateAppointmentBooking(
	id: number,
	formData: FormData,
	currentUserName: string
) {
	const user = await (await import("@/lib/auth-cache")).getCachedUser()
	if (!user) return { success: false, error: "Not authenticated" }

	const [isAdmin, isBrandAdvisor] = await Promise.all([
		getCachedIsUserAdmin(user.id),
		(await import("@/lib/admin-cache")).getCachedIsUserBrandAdvisor(user.id),
	])

	// Only admin and brand-advisor may edit bookings at all
	if (!isAdmin && !isBrandAdvisor) {
		return { success: false, error: "You do not have permission to edit bookings." }
	}

	// Fetch existing booking to check ownership
	const existing = await prisma.appointmentBooking.findUnique({
		where: { id },
		select: { bookedBy: true, userId: true, appointmentId: true, status: true },
	})
	if (!existing) return { success: false, error: "Booking not found" }
	if (existing.status !== "active") return { success: false, error: "Booking is not active" }
	const isOwner = existing.userId
		? existing.userId === user.id
		: existing.bookedBy === currentUserName
	// Brand-advisors can only edit their own bookings; admins can edit anyone's
	if (!isAdmin && !isOwner) {
		return { success: false, error: "You can only edit your own bookings" }
	}

	const startDateStr = formData.get("startDate") as string
	const endDateStr = formData.get("endDate") as string
	const startDate = parseDateInBusinessTZ(startDateStr)
	const endDate = parseDateInBusinessTZ(endDateStr)
	const purpose = formData.get("purpose") as string
	const attendeesStr = formData.get("attendees") as string
	const attendees = attendeesStr ? Number.parseInt(attendeesStr) : null
	const remarks = (formData.get("remarks") as string)?.trim() || null
	const bookingName = (formData.get("bookingName") as string)?.trim() || null
	const companyName = (formData.get("companyName") as string)?.trim() || null
	const contactNumber = (formData.get("contactNumber") as string)?.trim() || null
	const appointmentCategory =
		(formData.get("appointmentCategory") as string) === "EXTERNAL" ? "EXTERNAL" : "INTERNAL"
	const projectIdStr = formData.get("projectId") as string | null
	const projectId =
		projectIdStr && projectIdStr !== "" && projectIdStr !== "none"
			? Number.parseInt(projectIdStr, 10)
			: null
	const reminderOffsetsStr = formData.get("reminderOffsets") as string | null
	const reminderList = reminderOffsetsStr
		? (JSON.parse(reminderOffsetsStr) as Array<{ offsetMinutes: number; recipientEmails: string[] }>)
		: []

	if (endDate <= startDate) {
		return { success: false, error: "End time must be after start time" }
	}

	if (projectId && user.id) {
		const allowed = await userCanAccessProject(user.id, projectId)
		if (!allowed) {
			return { success: false, error: "You do not have access to the selected project." }
		}
	}

	// Reject overlap with other active bookings on the same resource
	if (existing.appointmentId) {
		const conflict = await prisma.appointmentBooking.findFirst({
			where: {
				id: { not: id },
				appointmentId: existing.appointmentId,
				status: "active",
				startDate: { lt: endDate },
				endDate: { gt: startDate },
			},
			select: { id: true, bookedBy: true },
		})
		if (conflict) {
			return {
				success: false,
				error: `This time overlaps another booking (${conflict.bookedBy}).`,
			}
		}
	}

	try {
		await prisma.appointmentBooking.update({
			where: { id },
			data: {
				startDate,
				endDate,
				purpose: purpose || null,
				attendees,
				remarks,
				bookingName,
				companyName,
				contactNumber,
				appointmentCategory,
				projectId,
			},
		})

		if (reminderList.length > 0) {
			const reminderData = reminderList.map((item) => ({
				offsetMinutes: item.offsetMinutes,
				recipientEmails: item.recipientEmails.filter((e) => e.trim()),
			}))
			await syncBookingReminders(id, startDate, reminderData)
		}

		revalidatePath("/calendar")
		revalidatePath("/appointment-bookings")
		return { success: true }
	} catch (error) {
		console.error("Error updating appointment booking:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to update booking",
		}
	}
}

// Fetch all calendar bookings. Appointments are org-wide; leave/tasks use their own rules. Runs in parallel.
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
		const [appointments, tasks, leave, blockers] = await Promise.allSettled([
			_fetchAppointmentBookings(userId, userName, safeRange),
			_fetchTaskBookings(userId, safeRange),
			_fetchLeaveBookings(userId, safeRange),
			_fetchCalendarBlockers(safeRange),
		])

		const out: CalendarBooking[] = []
		if (appointments.status === "fulfilled") out.push(...appointments.value)
		if (tasks.status === "fulfilled") out.push(...tasks.value)
		if (leave.status === "fulfilled") out.push(...leave.value)
		if (blockers.status === "fulfilled") out.push(...blockers.value)
		return out
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error fetching bookings:", error)
		}
		return []
	}
}


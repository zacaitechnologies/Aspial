import { getCachedUser } from "@/lib/auth-cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import {
	formatDateStringDirect,
	getBusinessTodayDateString,
	parseDateInBusinessTZ,
	toBusinessTZParts,
} from "@/lib/date-utils"
import { prisma } from "@/lib/prisma"
import { APPOINTMENT_TYPES, type AppointmentType } from "@/app/(main)/calendar/constants"
import { getAllUserTasks, getTasksAssignedToUser } from "@/app/(main)/projects/task-actions"
import { DashboardTasksSection } from "./components/DashboardTasksSection"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, CalendarCheck, Clock, MapPin, UserCircle } from "lucide-react"
import Link from "next/link"

// Force dynamic rendering since we use cookies for authentication
export const dynamic = "force-dynamic"

// Personal dashboard — appointments assigned to the logged-in user
export default async function DashboardPage() {
	const user = await getCachedUser()

	if (!user) {
		return null
	}

	// Upcoming = anything that hasn't ended before the start of the business-TZ day
	const todayStart = parseDateInBusinessTZ(`${getBusinessTodayDateString()}T00:00:00`)

	const isAdmin = await getCachedIsUserAdmin(user.id)
	const myTasks = await getTasksAssignedToUser(user.id)
	// Admins also get an overview of everyone's tasks across all projects.
	const allTasks = isAdmin ? await getAllUserTasks(user.id) : []

	const assignedBookings = await prisma.appointmentBooking.findMany({
		where: {
			status: "active",
			endDate: { gte: todayStart },
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

	return (
		<div className="min-h-screen bg-background px-4 py-6 sm:px-6">
			<div className="mx-auto max-w-4xl space-y-4">
				<div className="flex items-center gap-2">
					<CalendarCheck className="h-5 w-5 text-muted-foreground" aria-hidden />
					<h1 className="text-lg font-semibold text-foreground">My Assigned Appointments</h1>
					<span className="text-sm font-medium tabular-nums text-muted-foreground">
						{assignedBookings.length}
					</span>
				</div>

				{assignedBookings.length === 0 ? (
					<Card>
						<CardContent className="py-10 text-center">
							<p className="text-sm text-muted-foreground">
								No upcoming appointments are assigned to you.
							</p>
							<Link
								href="/calendar"
								className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
							>
								Open the calendar
							</Link>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-3">
						{assignedBookings.map((booking) => {
							const typeConfig =
								APPOINTMENT_TYPES[booking.appointmentType as AppointmentType] ??
								APPOINTMENT_TYPES.OTHERS
							const startParts = toBusinessTZParts(booking.startDate)
							const endParts = toBusinessTZParts(booking.endDate)
							const bookerName = booking.bookedByUser
								? `${booking.bookedByUser.firstName} ${booking.bookedByUser.lastName}`.trim() ||
									booking.bookedByUser.email
								: booking.bookedBy
							const assigneeNames = booking.assignees.map(
								(a) => `${a.user.firstName} ${a.user.lastName}`.trim() || a.user.email
							)
							const location = booking.appointment
								? booking.appointment.location || booking.appointment.brand || "Appointment"
								: null

							return (
								<Card key={booking.id}>
									<CardContent className="space-y-2 py-4">
										<div className="flex flex-wrap items-center gap-2">
											<Badge variant="secondary" className={typeConfig.color}>
												{typeConfig.label}
											</Badge>
											{booking.appointment?.name && (
												<span className="text-sm font-semibold text-foreground">
													{booking.appointment.name}
												</span>
											)}
											{(booking.project?.clientName || booking.bookingName) && (
												<span className="text-sm text-muted-foreground">
													· {booking.project?.clientName || booking.bookingName}
												</span>
											)}
										</div>
										<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
											<span className="inline-flex items-center gap-1.5">
												<Calendar className="h-4 w-4" aria-hidden />
												{formatDateStringDirect(startParts.dateStr)}
											</span>
											<span className="inline-flex items-center gap-1.5">
												<Clock className="h-4 w-4" aria-hidden />
												{startParts.timeStr} - {endParts.timeStr}
											</span>
											{location && (
												<span className="inline-flex items-center gap-1.5">
													<MapPin className="h-4 w-4" aria-hidden />
													{location}
												</span>
											)}
										</div>
										<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
											<span className="text-muted-foreground">
												Booked by: <span className="text-foreground">{bookerName}</span>
											</span>
											<span className="inline-flex items-center gap-1.5 text-muted-foreground">
												<UserCircle className="h-4 w-4" aria-hidden />
												Assigned to:{" "}
												<span className="text-foreground">{assigneeNames.join(", ")}</span>
											</span>
										</div>
										{booking.purpose && (
											<p className="text-sm text-muted-foreground">{booking.purpose}</p>
										)}
										<Link
											href="/calendar"
											className="inline-block text-xs font-medium text-primary hover:underline"
										>
											View on calendar
										</Link>
									</CardContent>
								</Card>
							)
						})}
					</div>
				)}

				<DashboardTasksSection myTasks={myTasks} allTasks={allTasks} isAdmin={isAdmin} />
			</div>
		</div>
	)
}

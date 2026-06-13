"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Calendar, CalendarCheck, Clock, ListFilter, MapPin, User, UserCircle } from "lucide-react"
import { APPOINTMENT_TYPES, type AppointmentType } from "@/app/(main)/calendar/constants"
import {
	formatDateStringDirect,
	getBusinessTodayDateString,
	parseDateInBusinessTZ,
	toBusinessTZParts,
} from "@/lib/date-utils"
import type {
	AppointmentTimeFilter,
	DashboardAppointment,
	SortField,
	SortOrder,
} from "../types"
import { DashboardTooltip, DashboardTooltipProvider } from "./dashboard-tooltip"

function AppointmentTooltipContent({ booking }: { booking: DashboardAppointment }) {
	const typeConfig =
		APPOINTMENT_TYPES[booking.appointmentType as AppointmentType] ?? APPOINTMENT_TYPES.OTHERS
	const startParts = toBusinessTZParts(new Date(booking.startDate))
	const endParts = toBusinessTZParts(new Date(booking.endDate))
	const bookerName = booking.bookedByUser
		? `${booking.bookedByUser.firstName} ${booking.bookedByUser.lastName}`.trim() ||
			booking.bookedByUser.email
		: booking.bookedBy
	const assigneeNames = booking.assignees.map(
		(a) => `${a.user.firstName} ${a.user.lastName}`.trim() || a.user.email
	)
	const location = booking.appointment
		? booking.appointment.location || booking.appointment.brand || null
		: null
	const clientLabel = booking.project?.clientName || booking.bookingName

	return (
		<div className="space-y-1.5 text-xs">
			<div className="flex items-center gap-2">
				<span
					className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/40 bg-primary"
					aria-hidden
				/>
				<p className="font-semibold leading-snug">
					{booking.appointment?.name ?? typeConfig.label}
				</p>
			</div>
			{clientLabel && (
				<p className="text-muted-foreground">{clientLabel}</p>
			)}
			{booking.project?.name && (
				<p className="text-muted-foreground">{booking.project.name}</p>
			)}
			<div className="flex items-center gap-1.5">
				<Clock className="h-3 w-3 shrink-0 opacity-70" />
				<span>
					{formatDateStringDirect(startParts.dateStr)} · {startParts.timeStr} – {endParts.timeStr}
				</span>
			</div>
			{location && (
				<div className="flex items-center gap-1.5 min-w-0">
					<MapPin className="h-3 w-3 shrink-0 opacity-70" />
					<span className="truncate">{location}</span>
				</div>
			)}
			<div className="flex items-center gap-1.5 text-muted-foreground">
				<User className="h-3 w-3 shrink-0 opacity-70" />
				<span>Booked by: {bookerName}</span>
			</div>
			{assigneeNames.length > 0 && (
				<div className="flex items-start gap-1.5 text-muted-foreground min-w-0">
					<UserCircle className="h-3 w-3 shrink-0 opacity-70 mt-0.5" />
					<span className="min-w-0">Assigned to: {assigneeNames.join(", ")}</span>
				</div>
			)}
			{booking.purpose && (
				<p className="text-muted-foreground line-clamp-3">{booking.purpose}</p>
			)}
		</div>
	)
}

function AppointmentRow({ booking }: { booking: DashboardAppointment }) {
	const typeConfig =
		APPOINTMENT_TYPES[booking.appointmentType as AppointmentType] ?? APPOINTMENT_TYPES.OTHERS
	const startParts = toBusinessTZParts(new Date(booking.startDate))
	const endParts = toBusinessTZParts(new Date(booking.endDate))
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
		<DashboardTooltip content={<AppointmentTooltipContent booking={booking} />} align="start">
			<Card className="cursor-default gap-0 py-0">
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
						<p className="text-sm text-muted-foreground line-clamp-2">{booking.purpose}</p>
					)}
					<Link
						href="/calendar"
						className="inline-block text-xs font-medium text-primary hover:underline"
					>
						View on calendar
					</Link>
				</CardContent>
			</Card>
		</DashboardTooltip>
	)
}

function filterAppointments(
	bookings: DashboardAppointment[],
	timeFilter: AppointmentTimeFilter
): DashboardAppointment[] {
	const todayStart = parseDateInBusinessTZ(`${getBusinessTodayDateString()}T00:00:00`)
	return bookings.filter((booking) => {
		const end = new Date(booking.endDate)
		if (timeFilter === "upcoming") return end >= todayStart
		if (timeFilter === "past") return end < todayStart
		return true
	})
}

function sortAppointments(
	bookings: DashboardAppointment[],
	sortOrder: SortOrder
): DashboardAppointment[] {
	return [...bookings].sort((a, b) => {
		const diff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
		return sortOrder === "asc" ? diff : -diff
	})
}

export function DashboardAppointmentsSection({
	appointments,
}: {
	appointments: DashboardAppointment[]
}) {
	const [timeFilter, setTimeFilter] = useState<AppointmentTimeFilter>("upcoming")
	const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

	const filtered = useMemo(
		() => sortAppointments(filterAppointments(appointments, timeFilter), sortOrder),
		[appointments, timeFilter, sortOrder]
	)

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<CalendarCheck className="h-5 w-5 text-muted-foreground" aria-hidden />
					<h2 className="text-lg font-semibold text-foreground">My Assigned Appointments</h2>
					<span className="text-sm font-medium tabular-nums text-muted-foreground">
						{filtered.length}
					</span>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Select
						value={timeFilter}
						onValueChange={(v) => setTimeFilter(v as AppointmentTimeFilter)}
					>
						<SelectTrigger className="h-8 min-w-[9.5rem] w-auto max-w-full text-xs bg-card border-2 border-accent">
							<span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
								<ListFilter className="w-4 h-4 shrink-0 text-muted-foreground" />
								<SelectValue />
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="upcoming">Upcoming</SelectItem>
							<SelectItem value="past">Past</SelectItem>
							<SelectItem value="all">All</SelectItem>
						</SelectContent>
					</Select>
					<Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
						<SelectTrigger className="h-8 min-w-[11.5rem] w-auto max-w-full text-xs bg-card border-2 border-accent">
							<span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
								<Calendar className="w-4 h-4 shrink-0 text-muted-foreground" />
								<SelectValue />
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="asc">Start date (earliest)</SelectItem>
							<SelectItem value="desc">Start date (latest)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{filtered.length === 0 ? (
				<Card>
					<CardContent className="py-10 text-center">
						<p className="text-sm text-muted-foreground">
							No appointments match the current filters.
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
				<DashboardTooltipProvider>
					<div className="space-y-3">
						{filtered.map((booking) => (
							<AppointmentRow key={booking.id} booking={booking} />
						))}
					</div>
				</DashboardTooltipProvider>
			)}
		</section>
	)
}

"use client"

import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDateStringDirect } from "@/lib/date-utils"
import { type CalendarBooking } from "../actions"
import { APPOINTMENT_TYPES, type AppointmentType, type CalendarEventType } from "../constants"
import {
	getTimeSlots,
	parseTime,
	isCalendarEventPast,
	layoutOverlappingEvents,
} from "../utils/calendar-utils"
import {
	calendarEventMetaClass,
	calendarEventPastClass,
	calendarEventSurfaceClass,
} from "../utils/event-surface-styles"
import { CalendarEventTooltip } from "./CalendarEventTooltip"
import { useCurrentTime } from "../hooks/useCurrentTime"

interface MonthDayDialogProps {
	isOpen: boolean
	onClose: () => void
	date: string
	events: CalendarBooking[]
	onEventClick: (event: CalendarBooking) => void
	onBookSlot: (date: string, time: string, appointmentType: AppointmentType) => void
}

// Appointment-type columns (leave/blocker are shown in the banner, not as columns)
const TYPE_COLUMNS = Object.keys(APPOINTMENT_TYPES) as AppointmentType[]

const TYPE_CSS_VAR: Record<CalendarEventType, string> = {
	PHOTO_SHOOT: "var(--calendar-photo-shoot)",
	VIDEO_SHOOT: "var(--calendar-video-shoot)",
	CONSULTATION: "var(--calendar-consultation)",
	PHOTO_SELECTION: "var(--calendar-photo-selection)",
	OTHERS: "var(--calendar-others)",
	LEAVE: "var(--calendar-leave)",
	BLOCKER: "var(--calendar-blocker)",
}

const HOUR_HEIGHT = 48

export function MonthDayDialog({
	isOpen,
	onClose,
	date,
	events,
	onEventClick,
	onBookSlot,
}: MonthDayDialogProps) {
	const now = useCurrentTime()
	const timeSlots = useMemo(() => getTimeSlots(0, 24), [])

	const formattedTitle = useMemo(
		() => (date ? formatDateStringDirect(date, { includeWeekday: true, format: "long" }) : ""),
		[date],
	)

	// Leave + blockers go in the top banner (no dedicated column)
	const bannerEvents = useMemo(
		() => events.filter((e) => e.type === "leave" || e.type === "blocker"),
		[events],
	)

	// Appointment events bucketed by their appointment type for the columns
	const eventsByType = useMemo(() => {
		const map = new Map<AppointmentType, CalendarBooking[]>()
		TYPE_COLUMNS.forEach((t) => map.set(t, []))
		events.forEach((e) => {
			if (e.type !== "appointment") return
			const bucket = map.get(e.appointmentType as AppointmentType)
			if (bucket) bucket.push(e)
		})
		return map
	}, [events])

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CalendarIcon className="w-5 h-5" />
						{formattedTitle}
					</DialogTitle>
				</DialogHeader>

				{/* Leave / Blocker banner */}
				{bannerEvents.length > 0 && (
					<div className="shrink-0 rounded-lg border border-border bg-muted/30 p-2">
						<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
							Leave &amp; Blockers
						</p>
						<div className="flex flex-wrap gap-1.5">
							{bannerEvents.map((event) => (
								<CalendarEventTooltip key={event.id} booking={event} side="top">
									<button
										type="button"
										onClick={() => onEventClick(event)}
										className={cn(
											"text-xs px-2 py-1 rounded-md cursor-pointer truncate max-w-[14rem] font-medium transition-shadow hover:shadow-sm",
											calendarEventSurfaceClass(event.appointmentType),
											isCalendarEventPast(event, now) && calendarEventPastClass,
										)}
									>
										{event.title.replace(/^(START:|DUE:|OVERDUE:)\s*/, "")}
									</button>
								</CalendarEventTooltip>
							))}
						</div>
					</div>
				)}

				{/* Multi-column day grid */}
				<div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
					<div className="flex min-w-[640px]">
						{/* Time gutter */}
						<div className="w-12 sm:w-14 shrink-0 border-r border-border cal-week-slot-bg sticky left-0 z-20">
							{/* Header spacer to align with column headers */}
							<div className="h-9 border-b border-border cal-week-slot-bg sticky top-0 z-30" />
							{timeSlots.map((slot) => (
								<div
									key={slot}
									className="border-t border-border p-1 text-[10px] sm:text-xs text-muted-foreground font-medium cal-week-slot-bg"
									style={{ height: HOUR_HEIGHT }}
								>
									{slot}
								</div>
							))}
						</div>

						{/* Type columns */}
						<div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${TYPE_COLUMNS.length}, minmax(0, 1fr))` }}>
							{TYPE_COLUMNS.map((typeKey) => {
								const config = APPOINTMENT_TYPES[typeKey]
								const columnEvents = eventsByType.get(typeKey) ?? []
								const layouts = layoutOverlappingEvents(columnEvents)
								return (
									<div key={typeKey} className="relative border-r border-border last:border-r-0">
										{/* Column header */}
										<div className="sticky top-0 z-10 flex h-9 items-center gap-1.5 border-b border-border bg-background px-2">
											<span
												className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/40"
												style={{ backgroundColor: TYPE_CSS_VAR[typeKey] }}
												aria-hidden
											/>
											<span className="truncate text-[11px] font-semibold">{config.label}</span>
										</div>

										{/* Clickable hour grid */}
										<div className="relative">
											{timeSlots.map((slot) => (
												<div
													key={slot}
													className="border-t border-border cal-time-grid-slot"
													style={{ height: HOUR_HEIGHT }}
													onClick={() => onBookSlot(date, slot, typeKey)}
												/>
											))}

											{/* Positioned events */}
											{layouts.map(({ event, column, totalColumns }) => {
												const startHour = parseTime(event.startTime)
												const endHour = parseTime(event.endTime)
												const top = startHour * HOUR_HEIGHT
												const height = Math.max(22, (endHour - startHour) * HOUR_HEIGHT - 2)
												const widthPct = 100 / totalColumns
												const leftPct = column * widthPct
												return (
													<CalendarEventTooltip key={event.id} booking={event} side="top">
														<div
															className={cn(
																"absolute z-10 overflow-hidden rounded-md px-1.5 py-1 text-[11px] cursor-pointer shadow-sm transition-shadow hover:shadow-md hover:brightness-[0.98]",
																calendarEventSurfaceClass(event.appointmentType),
																isCalendarEventPast(event, now) && calendarEventPastClass,
															)}
															style={{
																top,
																height,
																left: `calc(${leftPct}% + 1px)`,
																width: `calc(${widthPct}% - 2px)`,
															}}
															onClick={(e) => {
																e.stopPropagation()
																onEventClick(event)
															}}
														>
															<div className="font-semibold truncate leading-tight">{event.title}</div>
															<div className={cn(calendarEventMetaClass, "truncate text-[10px]")}>
																{event.startTime} – {event.endTime}
															</div>
														</div>
													</CalendarEventTooltip>
												)
											})}
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>

				<p className="shrink-0 text-center text-[11px] text-muted-foreground">
					Click an empty time slot in a column to book that appointment type.
				</p>
			</DialogContent>
		</Dialog>
	)
}

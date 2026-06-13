"use client"

import { useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDateStringDirect, parseLocalDateString } from "@/lib/date-utils"
import { type CalendarBooking } from "../actions"
import { APPOINTMENT_TYPES, type AppointmentType, type CalendarEventType } from "../constants"
import {
	getTimeSlots,
	getCalendarGridTimeRange,
	getTimedEventTopPx,
	getTimedEventHeightPx,
	isCalendarEventPast,
	isToday,
	layoutOverlappingEvents,
} from "../utils/calendar-utils"
import { CALENDAR_GRID_START_HOUR } from "../constants"
import { getCalendarEventDisplayTitle } from "../utils/appointment-display"
import {
	calendarEventCancelledClass,
	calendarEventMetaClass,
	calendarEventPastClass,
	calendarBookingSurfaceClass,
} from "../utils/event-surface-styles"
import { CalendarEventTooltip } from "./CalendarEventTooltip"
import { CurrentTimeLine } from "./CurrentTimeLine"
import { useCurrentTime } from "../hooks/useCurrentTime"
import { useScrollToCurrentTime } from "../hooks/useScrollToCurrentTime"

interface MonthDayDialogProps {
	isOpen: boolean
	onClose: () => void
	date: string
	events: CalendarBooking[]
	onEventClick: (event: CalendarBooking) => void
	onBookAppointment?: (date: string) => void
	onBookSlot?: (date: string, time: string, appointmentType: AppointmentType) => void
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
const COLUMN_HEADER_HEIGHT = 36

export function MonthDayDialog({
	isOpen,
	onClose,
	date,
	events,
	onEventClick,
	onBookAppointment,
	onBookSlot,
}: MonthDayDialogProps) {
	const now = useCurrentTime()
	const scrollRef = useRef<HTMLDivElement>(null)
	const timeRange = useMemo(() => getCalendarGridTimeRange(), [])
	const timeSlots = useMemo(
		() => getTimeSlots(timeRange.start, timeRange.end),
		[timeRange]
	)

	const today = useMemo(() => {
		if (!date) return false
		return isToday(parseLocalDateString(date))
	}, [date])

	useScrollToCurrentTime(scrollRef, HOUR_HEIGHT, today, `${date}-${isOpen}`, COLUMN_HEADER_HEIGHT)

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

	const gridCols = `repeat(${TYPE_COLUMNS.length}, minmax(0, 1fr))`

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="calendar-page max-w-[95vw] w-[95vw] sm:max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
				<DialogHeader className="shrink-0 pb-0">
						<div className="flex items-center justify-between gap-2 pr-8">
							<DialogTitle className="flex items-center gap-2">
								<CalendarIcon className="w-5 h-5" />
								{formattedTitle}
							</DialogTitle>
							{onBookAppointment && (
								<Button
									type="button"
									size="sm"
									onClick={() => onBookAppointment(date)}
									className="shrink-0 gap-1.5"
								>
									<Plus className="w-4 h-4" />
									Appointment
								</Button>
							)}
						</div>
				</DialogHeader>

				{/* Leave / Blocker — roomy stacked list for readability */}
				{bannerEvents.length > 0 && (
					<div className="shrink-0 border-b border-border py-2">
						<p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Leave / Blockers
						</p>
						<div className="grid max-h-[5.25rem] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
							{bannerEvents.map((event) => {
								// Blockers without a real description carry a synthesized "Blocker: <title>" placeholder
								const detail =
									event.type === "blocker" && event.description === `Blocker: ${event.title}`
										? null
										: event.description
								return (
									<CalendarEventTooltip key={event.id} booking={event} side="top">
										<button
											type="button"
											onClick={() => onEventClick(event)}
											className={cn(
												"min-w-0 rounded-md px-2.5 py-2 text-left cursor-pointer transition-shadow hover:shadow-sm",
												calendarBookingSurfaceClass(event),
												event.type === "appointment" && event.status === "cancelled" && calendarEventCancelledClass,
												isCalendarEventPast(event, now) && calendarEventPastClass,
											)}
										>
											<span className="block truncate text-sm font-semibold leading-snug">
												{getCalendarEventDisplayTitle(event)}
											</span>
											{detail && (
												<span className={cn("mt-0.5 block line-clamp-2 text-xs", calendarEventMetaClass)}>
													{detail}
												</span>
											)}
										</button>
									</CalendarEventTooltip>
								)
							})}
						</div>
					</div>
				)}

				{/* Multi-column day grid */}
				<div
					ref={scrollRef}
					className="min-h-0 flex-1 overflow-auto rounded-lg border border-border hide-scrollbar"
				>
					<div className="flex min-w-[640px]">
						{/* Time gutter — grey, matches week view */}
						<div className="w-12 sm:w-14 shrink-0 border-r border-border cal-week-slot-bg sticky left-0 z-20">
							<div
								className="border-b border-border cal-week-slot-bg sticky top-0 z-30"
								style={{ height: COLUMN_HEADER_HEIGHT }}
							/>
							{timeSlots.map((slot) => (
								<div
									key={slot}
									className="border-b border-border p-1 text-[10px] sm:text-xs text-muted-foreground font-medium cal-week-slot-bg"
									style={{ height: HOUR_HEIGHT }}
								>
									{slot}
								</div>
							))}
						</div>

						{/* Type columns */}
						<div className="flex-1 min-w-0 flex flex-col">
							{/* Shared column headers — z-30 so scrolled events (z-10) stay beneath */}
							<div
								className="grid sticky top-0 z-30 border-b border-border bg-background shadow-[0_2px_6px_-2px_rgba(0,0,0,0.1)]"
								style={{ gridTemplateColumns: gridCols }}
							>
								{TYPE_COLUMNS.map((typeKey) => {
									const config = APPOINTMENT_TYPES[typeKey]
									return (
										<div
											key={`header-${typeKey}`}
											className="flex h-9 items-center gap-1.5 border-r border-border px-2 last:border-r-0 cal-week-subtle-bg"
										>
											<span
												className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/40"
												style={{ backgroundColor: TYPE_CSS_VAR[typeKey] }}
												aria-hidden
											/>
											<span className="truncate text-[11px] font-semibold">{config.label}</span>
										</div>
									)
								})}
							</div>

							{/* Time grid — white slots, today tint + current-time line */}
							<div
								className="relative"
								style={{ minHeight: timeSlots.length * HOUR_HEIGHT }}
							>
								{today && (
									<div className="absolute inset-0 z-[35] pointer-events-none">
										<CurrentTimeLine
											hourHeightPx={HOUR_HEIGHT}
											startHour={CALENDAR_GRID_START_HOUR}
											showLabel
										/>
									</div>
								)}

								<div className="grid" style={{ gridTemplateColumns: gridCols }}>
									{TYPE_COLUMNS.map((typeKey) => {
										const columnEvents = eventsByType.get(typeKey) ?? []
										const layouts = layoutOverlappingEvents(columnEvents)
										return (
											<div
												key={typeKey}
												className={cn(
													"relative border-r border-border last:border-r-0",
													today && "cal-week-column--today",
												)}
											>
												{timeSlots.map((slot) => (
													<div
														key={slot}
														className={cn(
															"group/slot relative border-b border-border cal-time-grid-slot",
															onBookSlot ? "cursor-pointer" : "cursor-default",
															today && "cal-time-grid-slot--today-col",
														)}
														style={{ height: HOUR_HEIGHT }}
														onClick={() => onBookSlot?.(date, slot, typeKey)}
													>
														{onBookSlot && (
															<span className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover/slot:opacity-100">
																+ Appointment
															</span>
														)}
													</div>
												))}

												{layouts.map(({ event, column, totalColumns }) => {
													const top = getTimedEventTopPx(
														event.startTime,
														CALENDAR_GRID_START_HOUR,
														HOUR_HEIGHT
													)
													const height = getTimedEventHeightPx(
														event.startTime,
														event.endTime,
														CALENDAR_GRID_START_HOUR,
														HOUR_HEIGHT,
														22
													)
													if (height <= 0) return null
													const widthPct = 100 / totalColumns
													const leftPct = column * widthPct
													return (
														<CalendarEventTooltip key={event.id} booking={event} side="top">
															<div
																className={cn(
																	"absolute z-[5] overflow-hidden rounded-md px-1.5 py-1 text-[11px] cursor-pointer shadow-sm transition-shadow hover:z-20 hover:shadow-md hover:brightness-[0.98]",
																	calendarBookingSurfaceClass(event),
																	event.type === "appointment" && event.status === "cancelled" && calendarEventCancelledClass,
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
																<div className="font-semibold truncate leading-tight">
																	{getCalendarEventDisplayTitle(event)}
																</div>
																<div className={cn(calendarEventMetaClass, "truncate text-[10px]")}>
																	{event.startTime} – {event.endTime}
																</div>
															</div>
														</CalendarEventTooltip>
													)
												})}
											</div>
										)
									})}
								</div>
							</div>
						</div>
					</div>
				</div>

				<p className="shrink-0 text-center text-[11px] text-muted-foreground">
					Hover an empty slot and click + Appointment to book that column&apos;s type.
				</p>
			</DialogContent>
		</Dialog>
	)
}

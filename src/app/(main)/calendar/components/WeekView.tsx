"use client"

import { CalendarBooking } from "../actions"
import {
	getWeekDays,
	formatDate,
	getTimeSlots,
	parseTime,
	isCalendarAllDayRowEvent,
	isCalendarEventPast,
	isToday,
	layoutOverlappingEvents,
} from "../utils/calendar-utils"
import { useMemo, useRef } from "react"
import { cn } from "@/lib/utils"
import { CurrentTimeLine } from "./CurrentTimeLine"
import { useCurrentTime } from "../hooks/useCurrentTime"
import { useScrollToCurrentTime } from "../hooks/useScrollToCurrentTime"
import { CalendarEventTooltip } from "./CalendarEventTooltip"
import {
	calendarEventMetaClass,
	calendarEventPastClass,
	calendarEventSurfaceClass,
} from "../utils/event-surface-styles"

interface WeekViewProps {
	currentDate: Date
	bookings: CalendarBooking[]
	onEventClick: (event: CalendarBooking) => void
	onDateClick: (dateString: string) => void
	onTimeSlotClick?: (date: string, hour: number) => void
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function WeekView({
	currentDate,
	bookings,
	onEventClick,
	onDateClick,
	onTimeSlotClick,
}: WeekViewProps) {
	const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])
	// Single scroll ref — one container scrolls both axes
	const scrollRef = useRef<HTMLDivElement>(null)
	const HOUR_HEIGHT = 60
	const now = useCurrentTime()

	const hasToday = useMemo(() => weekDays.some(isToday), [weekDays])
	const weekStartStr = formatDate(weekDays[0])

	useScrollToCurrentTime(scrollRef, HOUR_HEIGHT, hasToday, weekStartStr)

	const weekEvents = useMemo(() => {
		const weekStartStr = formatDate(weekDays[0])
		const weekEndStr = formatDate(weekDays[6])
		return bookings.filter((b) => b.date >= weekStartStr && b.date <= weekEndStr)
	}, [weekDays, bookings])

	const timeRange = useMemo(() => ({ start: 0, end: 24 }), [])
	const timeSlots = useMemo(
		() => getTimeSlots(timeRange.start, timeRange.end),
		[timeRange],
	)

	const getEventsForDay = (date: Date) => {
		const dateString = formatDate(date)
		return weekEvents.filter((e) => e.date === dateString)
	}

	// Gutter widths kept in sync via Tailwind utility classes
	const gutterClass = "w-10 sm:w-14 md:w-16 shrink-0"
	/** Opaque surfaces so scrolled grid/events do not show through sticky layers */
	const stickyBg = "bg-background"
	const stickyCornerBase =
		"sticky left-0 z-50 border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
	const stickyTimeGutter =
		"sticky left-0 z-40 cal-week-slot-bg border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"

	return (
		/**
		 * Single scroll container — both x (min-width) and y (time area).
		 * Sticky works relative to this container for headers + left gutter.
		 */
		<div
			ref={scrollRef}
			className="h-full overflow-auto hide-scrollbar"
		>
			{/* Minimum width so 7 columns + gutter are readable */}
			<div className="relative min-w-[580px]">

				{/* ── Sticky header block (day names + all-day row) ────────────── */}
				<div
					className={cn(
						"sticky top-0 z-30",
						stickyBg,
						"shadow-[0_2px_6px_-2px_rgba(0,0,0,0.1)]"
					)}
				>
					{/* Day names row */}
					<div className={cn("relative z-10 flex items-stretch border-b-2 border-border", stickyBg)}>
						{/* Top-left corner — sticky on both axes; matches row height */}
						<div
							className={cn(gutterClass, stickyCornerBase, "cal-week-subtle-bg self-stretch min-h-[3.5rem] sm:min-h-[3.75rem]")}
							aria-hidden
						/>
						<div className="flex-1 grid grid-cols-7">
							{weekDays.map((date, index) => {
								const dateString = formatDate(date)
								const today = isToday(date)
								return (
									<div
										key={`header-${dateString}`}
										className={cn(
											"flex min-h-[3.5rem] flex-col items-center justify-center p-1 sm:min-h-[3.75rem] sm:p-2",
											"border-r border-border last:border-r-0 cursor-pointer select-none",
											today ? "cal-week-day-header--today" : "cal-week-subtle-bg cal-week-day-header-cell",
										)}
										onClick={() => onDateClick(dateString)}
									>
										<span className="cal-week-day-header-label text-[10px] sm:text-xs font-medium">
											{dayNames[date.getDay()]}
										</span>
										<span className="cal-week-day-header-date mt-0.5 block text-sm font-bold tabular-nums sm:text-base md:text-lg">
											{date.getDate()}
										</span>
									</div>
								)
							})}
						</div>
					</div>

					{/* All-day row */}
					<div className={cn("flex border-b-2 border-border cal-week-subtle-bg")}>
						{/* All-day label — sticky left */}
						<div
							className={cn(
								gutterClass,
								stickyCornerBase,
								"cal-week-subtle-bg",
								"p-1 sm:p-2 text-[9px] sm:text-[10px] text-muted-foreground font-medium flex items-start pt-2 sm:pt-3 min-h-[52px]"
							)}
						>
							All day
						</div>
						<div className="flex-1 grid grid-cols-7 min-h-[52px]">
							{weekDays.map((date, index) => {
								const dateString = formatDate(date)
								const today = isToday(date)
								const allDayEvents = getEventsForDay(date).filter(isCalendarAllDayRowEvent)
								return (
									<div
										key={`allday-${dateString}-${index}`}
										className={cn(
											"border-r border-border last:border-r-0 p-1",
											today ? "cal-week-column--today" : "cal-week-grid-bg",
										)}
									>
										<div className="space-y-0.5">
											{allDayEvents.slice(0, 3).map((event) => (
												<CalendarEventTooltip key={event.id} booking={event} side="top">
													<div
														className={cn(
															"text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md cursor-pointer truncate leading-tight font-medium transition-shadow hover:shadow-sm",
															calendarEventSurfaceClass(event.appointmentType),
															isCalendarEventPast(event, now) && calendarEventPastClass,
														)}
														onClick={(e) => {
															e.stopPropagation()
															onEventClick(event)
														}}
													>
														{event.title.replace(/^(START:|DUE:|OVERDUE:)\s*/, "")}
													</div>
												</CalendarEventTooltip>
											))}
											{allDayEvents.length > 3 && (
												<div className="text-[9px] sm:text-[10px] text-muted-foreground px-1">
													+{allDayEvents.length - 3} more
												</div>
											)}
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>
				{/* ── End sticky header block ───────────────────────────────────── */}

				{/* ── Time body ─────────────────────────────────────────────────── */}
				<div
					className="relative flex"
					style={{ minHeight: timeSlots.length * HOUR_HEIGHT }}
				>
					{/* Time gutter — sticky left */}
					<div className={cn(gutterClass, stickyTimeGutter)}>
						{timeSlots.map((slot) => (
							<div
								key={slot}
								className={cn(
									"border-b border-border p-1 sm:p-2 text-[10px] sm:text-xs text-muted-foreground font-medium cal-week-slot-bg",
								)}
								style={{ height: HOUR_HEIGHT }}
							>
								{slot}
							</div>
						))}
					</div>

					{/* Day columns */}
					<div className="flex-1 grid grid-cols-7 relative">
						{weekDays.map((date, index) => {
							const dateString = formatDate(date)
							const today = isToday(date)
							const dayEvents = getEventsForDay(date)
							const timedEvents = dayEvents.filter((e) => !isCalendarAllDayRowEvent(e))
							const layouts = layoutOverlappingEvents(timedEvents)

							return (
								<div
									key={`col-${dateString}-${index}`}
									className={cn(
										"relative border-r border-border last:border-r-0",
										today && "cal-week-column--today",
									)}
								>
									{today && (
										<div className="absolute inset-0 z-[35] pointer-events-none">
											<CurrentTimeLine hourHeightPx={HOUR_HEIGHT} showLabel />
										</div>
									)}
									{/* Click-to-create grid lines */}
									{timeSlots.map((slot) => {
										const slotHour = parseTime(slot)
										return (
											<div
												key={slot}
												className={cn(
													"border-b border-border cal-time-grid-slot",
													today && "cal-time-grid-slot--today-col",
												)}
												style={{ height: HOUR_HEIGHT }}
												onClick={() => onTimeSlotClick?.(dateString, slotHour)}
											/>
										)
									})}

									{/* Event cards */}
									{layouts.map(({ event, column, totalColumns }) => {
										const startHour = parseTime(event.startTime)
										const endHour = parseTime(event.endTime)
										const top = startHour * HOUR_HEIGHT
										const height = Math.max(20, (endHour - startHour) * HOUR_HEIGHT - 2)
										const widthPct = 100 / totalColumns
										const leftPct = column * widthPct
										return (
											<CalendarEventTooltip key={event.id} booking={event} side="top">
												<div
													className={cn(
														"absolute z-10 overflow-hidden rounded-md px-1.5 py-1 text-xs cursor-pointer shadow-sm transition-shadow hover:shadow-md hover:brightness-[0.98]",
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
							)
						})}
					</div>
				</div>
				{/* ── End time body ─────────────────────────────────────────────── */}
			</div>
		</div>
	)
}

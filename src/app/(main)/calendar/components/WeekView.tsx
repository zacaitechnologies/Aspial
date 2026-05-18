"use client"

import { CalendarBooking } from "../actions"
import {
	getWeekDays,
	formatDate,
	getTimeSlots,
	parseTime,
	isCalendarAllDayRowEvent,
	isToday,
	getLocalTime,
	mergeAdjacentBookings,
	layoutOverlappingEvents,
} from "../utils/calendar-utils"
import { useMemo, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { CurrentTimeLine } from "./CurrentTimeLine"

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

	useEffect(() => {
		const raf = requestAnimationFrame(() => {
			if (!scrollRef.current) return
			const { hours } = getLocalTime()
			scrollRef.current.scrollTop = Math.max(0, (hours - 1) * HOUR_HEIGHT)
		})
		return () => cancelAnimationFrame(raf)
	}, [HOUR_HEIGHT])

	const hasToday = useMemo(() => weekDays.some(isToday), [weekDays])

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
	const stickyMutedBg = "bg-muted"
	const stickyCorner =
		"sticky left-0 z-50 bg-background border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
	const stickyTimeGutter =
		"sticky left-0 z-40 bg-background border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"

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
					<div className={cn("flex items-stretch border-b-2 border-border", stickyBg)}>
						{/* Top-left corner — sticky on both axes; matches row height */}
						<div
							className={cn(gutterClass, stickyCorner, "self-stretch min-h-[3.25rem] sm:min-h-[3.75rem]")}
							aria-hidden
						/>
						<div className="flex-1 grid grid-cols-7">
							{weekDays.map((date, index) => {
								const dateString = formatDate(date)
								const today = isToday(date)
								return (
									<div
										key={dateString}
										className={cn(
											"p-1 sm:p-2 text-center border-r border-border last:border-r-0 cursor-pointer select-none transition-colors",
											stickyBg,
											today ? "bg-accent" : "hover:bg-muted"
										)}
										onClick={() => onDateClick(dateString)}
									>
										<div
											className={`text-[10px] sm:text-xs font-medium ${
												today ? "text-(--color-primary)]" : "text-(--color-muted-foreground)]"
											}`}
										>
											{dayNames[index]}
										</div>
										<div
											className={`text-sm sm:text-base md:text-lg font-semibold mt-0.5 ${
												today ? "text-(--color-primary)]" : "text-(--color-foreground)]"
											}`}
										>
											{date.getDate()}
										</div>
									</div>
								)
							})}
						</div>
					</div>

					{/* All-day row */}
					<div className={cn("flex border-b-2 border-border", stickyMutedBg)}>
						{/* All-day label — sticky left */}
						<div
							className={cn(
								gutterClass,
								stickyCorner,
								stickyMutedBg,
								"p-1 sm:p-2 text-[9px] sm:text-[10px] text-muted-foreground font-medium flex items-start pt-2 sm:pt-3 min-h-[52px]"
							)}
						>
							All day
						</div>
						<div className="flex-1 grid grid-cols-7 min-h-[52px]">
							{weekDays.map((date) => {
								const dateString = formatDate(date)
								const today = isToday(date)
								const allDayEvents = getEventsForDay(date).filter(isCalendarAllDayRowEvent)
								return (
									<div
										key={`allday-${dateString}`}
										className={cn(
											"border-r border-border last:border-r-0 p-1",
											stickyMutedBg,
											today && "bg-accent"
										)}
									>
										<div className="space-y-0.5">
											{allDayEvents.slice(0, 3).map((event) => (
												<div
													key={event.id}
													className={`text-[10px] sm:text-xs px-1 py-0.5 rounded cursor-pointer ${event.color} hover:opacity-90 transition-opacity truncate leading-tight`}
													onClick={(e) => {
														e.stopPropagation()
														onEventClick(event)
													}}
													title={event.title}
												>
													{event.title.replace(/^(START:|DUE:|OVERDUE:)\s*/, "")}
												</div>
											))}
											{allDayEvents.length > 3 && (
												<div className="text-[9px] sm:text-[10px] text-(--color-muted-foreground)] px-1">
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
									"border-b border-border p-1 sm:p-2 text-[10px] sm:text-xs text-muted-foreground font-medium",
									stickyBg
								)}
								style={{ height: HOUR_HEIGHT }}
							>
								{slot}
							</div>
						))}
					</div>

					{/* Day columns */}
					<div className="flex-1 grid grid-cols-7 relative">
						{hasToday && (
							<div className="absolute z-20 pointer-events-none inset-0">
								<CurrentTimeLine hourHeightPx={HOUR_HEIGHT} showLabel />
							</div>
						)}

						{weekDays.map((date) => {
							const dateString = formatDate(date)
							const today = isToday(date)
							const dayEvents = getEventsForDay(date)
							const timedEvents = dayEvents.filter((e) => !isCalendarAllDayRowEvent(e))
							const merged = mergeAdjacentBookings(timedEvents)
							const layouts = layoutOverlappingEvents(merged)

							return (
								<div
									key={dateString}
									className={`relative border-r border-(--color-border)] last:border-r-0 ${
										today ? "bg-(--color-primary)]/[0.06]" : ""
									}`}
								>
									{/* Click-to-create grid lines */}
									{timeSlots.map((slot) => {
										const slotHour = parseTime(slot)
										return (
											<div
												key={slot}
												className="border-b border-(--color-border)] cursor-pointer transition-colors hover:bg-(--color-primary)]/10"
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
											<div
												key={event.id}
												className={`absolute z-10 overflow-hidden rounded px-1.5 py-1 text-xs cursor-pointer ${event.color} hover:opacity-90 transition-opacity shadow-sm`}
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
												<div className="font-medium truncate leading-tight">{event.title}</div>
												<div className="text-[10px] truncate opacity-80">
													{event.startTime} – {event.endTime}
												</div>
											</div>
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

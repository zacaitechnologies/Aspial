/**
 * Calendar utility functions for date calculations and time management
 */

import { formatLocalDate, toBusinessTZParts } from "@/lib/date-utils"
import type { CalendarBooking } from "../actions"

/**
 * Week/day views: tasks and leave always use the all-day row; all-day blockers join them (not time columns).
 */
export function isCalendarAllDayRowEvent(booking: CalendarBooking): boolean {
	if (booking.type === "task" || booking.type === "leave") return true
	if (booking.type === "blocker" && booking.allDay === true) return true
	return false
}

export type CalendarView = 'month' | 'week' | 'day'

/**
 * Get the start of the week (Sunday) for a given date
 */
export function getWeekStart(date: Date): Date {
	const d = new Date(date)
	const day = d.getDay()
	const diff = d.getDate() - day
	return new Date(d.setDate(diff))
}

/**
 * Get the end of the week (Saturday) for a given date
 */
export function getWeekEnd(date: Date): Date {
	const d = new Date(date)
	const day = d.getDay()
	const diff = d.getDate() + (6 - day)
	return new Date(d.setDate(diff))
}

/**
 * Get all days in a week for a given date
 */
export function getWeekDays(date: Date): Date[] {
	const weekStart = getWeekStart(date)
	const days: Date[] = []
	
	for (let i = 0; i < 7; i++) {
		const day = new Date(weekStart)
		day.setDate(weekStart.getDate() + i)
		days.push(day)
	}
	
	return days
}

/**
 * Format date as YYYY-MM-DD (preserves local date, avoids timezone shift)
 */
export function formatDate(date: Date): string {
	return formatLocalDate(date)
}

/**
 * Format time as HH:MM in the business timezone.
 */
export function formatTime(date: Date): string {
	return toBusinessTZParts(date).timeStr
}

/**
 * Parse time string (HH:MM) to hours as number
 */
export function parseTime(timeString: string): number {
	const [hours, minutes] = timeString.split(':').map(Number)
	return hours + minutes / 60
}

/**
 * Generate time slots for a day (hourly intervals)
 */
export function getTimeSlots(startHour: number = 0, endHour: number = 24): string[] {
	const slots: string[] = []
	
	for (let hour = startHour; hour < endHour; hour++) {
		slots.push(`${hour.toString().padStart(2, '0')}:00`)
	}
	
	return slots
}

/**
 * Generate time slots for a day (30-minute intervals)
 */
export function getDetailedTimeSlots(startHour: number = 0, endHour: number = 24): string[] {
	const slots: string[] = []
	
	for (let hour = startHour; hour < endHour; hour++) {
		slots.push(`${hour.toString().padStart(2, '0')}:00`)
		slots.push(`${hour.toString().padStart(2, '0')}:30`)
	}
	
	return slots
}

/**
 * Check if a time is within a slot
 */
export function isTimeInSlot(timeString: string, slotString: string): boolean {
	const time = parseTime(timeString)
	const slot = parseTime(slotString)
	return time >= slot && time < slot + 1
}

/**
 * Get the relevant time range for events (to avoid rendering empty slots)
 */
export function getRelevantTimeRange(events: Array<{ startTime: string; endTime: string }>): {
	start: number
	end: number
} {
	if (events.length === 0) {
		return { start: 8, end: 18 } // Default business hours
	}
	
	const times = events.flatMap(e => [parseTime(e.startTime), parseTime(e.endTime)])
	const earliestStart = Math.floor(Math.min(...times))
	const latestEnd = Math.ceil(Math.max(...times))
	
	// Add 1 hour padding on each side
	return {
		start: Math.max(0, earliestStart - 1),
		end: Math.min(24, latestEnd + 1)
	}
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	)
}

/**
 * Navigate to previous week
 */
export function getPreviousWeek(date: Date): Date {
	const newDate = new Date(date)
	newDate.setDate(newDate.getDate() - 7)
	return newDate
}

/**
 * Navigate to next week
 */
export function getNextWeek(date: Date): Date {
	const newDate = new Date(date)
	newDate.setDate(newDate.getDate() + 7)
	return newDate
}

/**
 * Navigate to previous day
 */
export function getPreviousDay(date: Date): Date {
	const newDate = new Date(date)
	newDate.setDate(newDate.getDate() - 1)
	return newDate
}

/**
 * Navigate to next day
 */
export function getNextDay(date: Date): Date {
	const newDate = new Date(date)
	newDate.setDate(newDate.getDate() + 1)
	return newDate
}

/**
 * Get week number for a date
 */
export function getWeekNumber(date: Date): number {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
	const dayNum = d.getUTCDay() || 7
	d.setUTCDate(d.getUTCDate() + 4 - dayNum)
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
	return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
	const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
	const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
	return `${start} - ${end}`
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
	return isSameDay(date, new Date())
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const compareDate = new Date(date)
	compareDate.setHours(0, 0, 0, 0)
	return compareDate < today
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date): boolean {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const compareDate = new Date(date)
	compareDate.setHours(0, 0, 0, 0)
	return compareDate > today
}

/** Current local time as { hours, minutes } (0-23, 0-59). */
export function getLocalTime(): { hours: number; minutes: number } {
	const now = new Date()
	return { hours: now.getHours(), minutes: now.getMinutes() }
}

/**
 * Wrapper attached to merged events' originalData. Lets the details dialog
 * surface the underlying parts (e.g. four hourly slots booked back-to-back).
 */
export interface MergedBookingMeta {
	kind: "merged"
	parts: string[]
	first: unknown
}

/**
 * Merge appointment events that are back-to-back (or overlapping) when they
 * share the same appointment + booker. Non-appointment events pass through
 * untouched. Used so that 10–11 + 11–12 + 12–13 hourly bookings (or one DB
 * row spanning 10–13) render as one continuous block.
 */
export function mergeAdjacentBookings(events: CalendarBooking[]): CalendarBooking[] {
	const appointments: CalendarBooking[] = []
	const others: CalendarBooking[] = []
	for (const e of events) {
		if (e.type === "appointment") appointments.push(e)
		else others.push(e)
	}

	const groupKeyFor = (e: CalendarBooking): string => {
		const raw = e.originalData as { appointmentId?: number | null; bookedBy?: string } | null
		const apptId = raw?.appointmentId ?? "none"
		const bookedBy = raw?.bookedBy ?? e.creatorName ?? "unknown"
		return `${apptId}|${bookedBy}|${e.date}`
	}

	const groups = new Map<string, CalendarBooking[]>()
	for (const e of appointments) {
		const key = groupKeyFor(e)
		const arr = groups.get(key) ?? []
		arr.push(e)
		groups.set(key, arr)
	}

	const out: CalendarBooking[] = []
	for (const group of groups.values()) {
		group.sort((a, b) => a.startTime.localeCompare(b.startTime))
		let current: CalendarBooking = { ...group[0] }
		let parts: string[] = [group[0].id]
		let firstOriginal: unknown = group[0].originalData

		const flush = () => {
			if (parts.length > 1) {
				const meta: MergedBookingMeta = { kind: "merged", parts: [...parts], first: firstOriginal }
				out.push({ ...current, id: `${parts[0]}+${parts.length - 1}`, originalData: meta })
			} else {
				out.push(current)
			}
		}

		for (let i = 1; i < group.length; i++) {
			const next = group[i]
			if (next.startTime <= current.endTime) {
				current = {
					...current,
					endTime: next.endTime > current.endTime ? next.endTime : current.endTime,
					attendees: Math.max(current.attendees, next.attendees),
				}
				parts.push(next.id)
			} else {
				flush()
				current = { ...next }
				parts = [next.id]
				firstOriginal = next.originalData
			}
		}
		flush()
	}

	return [...out, ...others]
}

/**
 * Greedy column assignment for overlapping events (Google/Teams style).
 * Returns each event's column index and the max parallel column count for
 * its overlap cluster, so views can render width = 100% / totalColumns.
 */
export function layoutOverlappingEvents(events: CalendarBooking[]): Array<{
	event: CalendarBooking
	column: number
	totalColumns: number
}> {
	if (events.length === 0) return []

	const sorted = [...events].sort((a, b) => {
		const s = a.startTime.localeCompare(b.startTime)
		if (s !== 0) return s
		return a.endTime.localeCompare(b.endTime)
	})

	const columnEnds: string[] = []
	const cols: number[] = []
	for (const e of sorted) {
		let col = columnEnds.findIndex((end) => end <= e.startTime)
		if (col === -1) {
			col = columnEnds.length
			columnEnds.push(e.endTime)
		} else {
			columnEnds[col] = e.endTime
		}
		cols.push(col)
	}

	const result: Array<{ event: CalendarBooking; column: number; totalColumns: number }> = []
	let clusterStart = 0
	let clusterMaxEnd = sorted[0].endTime
	let clusterMaxCol = cols[0]

	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i].startTime >= clusterMaxEnd) {
			for (let j = clusterStart; j < i; j++) {
				result.push({ event: sorted[j], column: cols[j], totalColumns: clusterMaxCol + 1 })
			}
			clusterStart = i
			clusterMaxEnd = sorted[i].endTime
			clusterMaxCol = cols[i]
		} else {
			if (sorted[i].endTime > clusterMaxEnd) clusterMaxEnd = sorted[i].endTime
			if (cols[i] > clusterMaxCol) clusterMaxCol = cols[i]
		}
	}
	for (let j = clusterStart; j < sorted.length; j++) {
		result.push({ event: sorted[j], column: cols[j], totalColumns: clusterMaxCol + 1 })
	}

	return result
}

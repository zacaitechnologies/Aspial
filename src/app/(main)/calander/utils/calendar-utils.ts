/**
 * Calendar utility functions for date calculations and time management
 */

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
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
	return date.toISOString().split('T')[0]
}

/**
 * Format time as HH:MM
 */
export function formatTime(date: Date): string {
	return date.toTimeString().slice(0, 5)
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

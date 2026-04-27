/**
 * Central date/time utilities that preserve local date and time.
 * Use these instead of toISOString() when you need to avoid timezone shifts
 * (e.g. date inputs, display to users, emails, API payloads for "wall clock" times).
 */

/**
 * Parse a YYYY-MM-DD string as local date (midnight in local timezone).
 * Use when displaying or comparing date strings; avoids new Date("YYYY-MM-DD") which is UTC midnight.
 */
export function parseLocalDateString(dateString: string): Date {
	const parts = dateString.split("-")
	const year = parseInt(parts[0] || "0", 10)
	const month = parseInt(parts[1] || "1", 10) - 1 // Month is 0-indexed in JS
	const day = parseInt(parts[2] || "1", 10)
	// Explicitly set time to noon local time to avoid any edge cases at midnight
	const date = new Date(year, month, day, 12, 0, 0, 0)
	return date
}

/**
 * Parse optional `YYYY-MM-DD` from HTML date inputs for persisted document dates (invoice/receipt).
 * Uses local calendar semantics via {@link parseLocalDateString}. Empty input defaults to now.
 */
export function parseDocumentDateInputOrNow(isoDateString: string | undefined): Date {
	const trimmed = isoDateString?.trim()
	if (!trimmed) {
		return new Date()
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		throw new Error("Invalid document date")
	}
	const d = parseLocalDateString(trimmed)
	if (Number.isNaN(d.getTime())) {
		throw new Error("Invalid document date")
	}
	return d
}

/**
 * Calculate day of week (0=Sunday, 6=Saturday) using Zeller's formula.
 * This is completely timezone-independent as it only uses the numeric components.
 */
function getDayOfWeekFromYMD(year: number, month: number, day: number): number {
	// Zeller's congruence for Gregorian calendar
	// Input: month 1-12, output: 0=Sunday, 6=Saturday
	let m = month
	let y = year
	if (m < 3) {
		m += 12
		y -= 1
	}
	const q = day
	const k = y % 100
	const j = Math.floor(y / 100)
	const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
	// h: 0=Saturday, 1=Sunday, 2=Monday, ... 6=Friday
	// Convert to: 0=Sunday, 1=Monday, ... 6=Saturday
	return ((h + 6) % 7)
}

/**
 * Format a YYYY-MM-DD string directly for display WITHOUT using Date object parsing.
 * This is completely timezone-independent.
 */
export function formatDateStringDirect(
	dateString: string,
	options: { includeWeekday?: boolean; format?: "short" | "long" } = {}
): string {
	const { includeWeekday = false, format = "short" } = options
	
	const parts = dateString.split("-")
	const year = parseInt(parts[0] || "1970", 10)
	const month = parseInt(parts[1] || "1", 10) // 1-12
	const day = parseInt(parts[2] || "1", 10)
	
	const monthNamesLong = [
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
	]
	const monthNamesShort = [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun",
		"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
	]
	const weekdayNames = [
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	]
	
	const monthName = format === "long" 
		? monthNamesLong[month - 1] 
		: monthNamesShort[month - 1]
	
	if (includeWeekday) {
		const dayOfWeek = getDayOfWeekFromYMD(year, month, day)
		const weekdayName = weekdayNames[dayOfWeek]
		return `${weekdayName}, ${monthName} ${day}, ${year}`
	}
	
	return `${monthName} ${day}, ${year}`
}

/**
 * Format date as YYYY-MM-DD using local date components.
 * Use for <input type="date"> value and any date-only display to avoid UTC shift.
 */
export function formatLocalDate(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

/**
 * Format date and time as YYYY-MM-DDTHH:mm:ss (no Z).
 * Use when sending to API/email so the recipient sees the intended local time.
 */
export function formatLocalDateTime(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	const hours = String(date.getHours()).padStart(2, "0")
	const minutes = String(date.getMinutes()).padStart(2, "0")
	const seconds = String(date.getSeconds()).padStart(2, "0")
	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

/**
 * Format for display as YYYY-MM-DD HH:mm.
 */
export function formatLocalDateTimeDisplay(date: Date): string {
	const d = formatLocalDate(date)
	const hours = String(date.getHours()).padStart(2, "0")
	const minutes = String(date.getMinutes()).padStart(2, "0")
	return `${d} ${hours}:${minutes}`
}

/**
 * Format a Date for display as "DD/MM/YYYY, h:mm:ss am/pm" using local time.
 * Use only after client mount (isMounted) to avoid hydration mismatch; correct for user timezone (e.g. Malaysia).
 */
export function formatLocalDateTimeForDisplay(date: Date): string {
	const d = date.getDate()
	const M = date.getMonth() + 1
	const y = date.getFullYear()
	const h = date.getHours()
	const m = date.getMinutes()
	const s = date.getSeconds()
	const pad = (n: number) => String(n).padStart(2, "0")
	const dd = pad(d)
	const MM = pad(M)
	const h12 = h % 12 || 12
	const ampm = h < 12 ? "am" : "pm"
	return `${dd}/${MM}/${y}, ${h12}:${pad(m)}:${pad(s)} ${ampm}`
}

/**
 * Format a Date using UTC components for display (e.g. "31/01/2026, 3:45:00 pm").
 * Use in SSR/client components where server and client must render the same string (hydration-safe).
 * Output is deterministic regardless of server or client timezone.
 */
export function formatDateTimeUTCForDisplay(date: Date): string {
	const d = date.getUTCDate()
	const M = date.getUTCMonth() + 1
	const y = date.getUTCFullYear()
	const h = date.getUTCHours()
	const m = date.getUTCMinutes()
	const s = date.getUTCSeconds()
	const pad = (n: number) => String(n).padStart(2, "0")
	const dd = pad(d)
	const MM = pad(M)
	const hh = pad(h)
	const min = pad(m)
	const sec = pad(s)
	const ampm = h < 12 ? "am" : "pm"
	const h12 = h % 12 || 12
	return `${dd}/${MM}/${y}, ${h12}:${min}:${sec} ${ampm}`
}

/**
 * Given a date value (Date, ISO string, or YYYY-MM-DD), return YYYY-MM-DD string using UTC.
 * Use so server and client produce the same date string for hydration-safe display.
 */
export function toYYYYMMDDUTC(value: Date | string | null | undefined): string | null {
	if (value == null) return null
	const d = typeof value === "string" ? new Date(value) : value
	if (Number.isNaN(d.getTime())) return null
	const y = d.getUTCFullYear()
	const M = d.getUTCMonth() + 1
	const day = d.getUTCDate()
	return `${y}-${String(M).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * Format YYYY-MM-DD string as DD/MM/YYYY (numeric, hydration-safe).
 */
export function formatDateStringNumeric(dateString: string): string {
	const parts = dateString.split("-")
	const year = parts[0] ?? "1970"
	const month = (parts[1] ?? "1").padStart(2, "0")
	const day = (parts[2] ?? "1").padStart(2, "0")
	return `${day}/${month}/${year}`
}

/**
 * Format a local date for display (e.g. "Jan 29, 2026").
 * This uses the local date components to avoid any timezone-related shifts.
 */
export function formatDateForDisplay(date: Date, locale: string = "en-US"): string {
	const options: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "short",
		day: "numeric",
	}
	return new Intl.DateTimeFormat(locale, options).format(date)
}

/**
 * Format a local date for display with weekday (e.g. "Wednesday, January 29, 2026").
 */
export function formatDateForDisplayLong(date: Date, locale: string = "en-US"): string {
	const options: Intl.DateTimeFormatOptions = {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}
	return new Intl.DateTimeFormat(locale, options).format(date)
}

/** Malaysia (Kuala Lumpur) timezone for leave entitlements and year boundaries. */
export const MALAYSIA_TIMEZONE = "Asia/Kuala_Lumpur" as const

// Asia/Kuala_Lumpur is fixed UTC+8 — no DST, ever.
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000

/**
 * Calendar year in Malaysia at the given instant (handles Jan 1 rollover vs UTC).
 */
export function getMalaysiaYear(now: Date = new Date()): number {
  // Add +8h then read UTC year — avoids Intl dependency where not needed
  return new Date(now.getTime() + MYT_OFFSET_MS).getUTCFullYear()
}

/**
 * Returns the calendar date string "YYYY-MM-DD" for a Date in Malaysia timezone.
 * Safe to call on server (any TZ) or browser (any TZ).
 */
export function getMalaysiaDateStr(date: Date = new Date()): string {
  const d = new Date(date.getTime() + MYT_OFFSET_MS)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Returns UTC Date objects for the start (00:00 MYT) and end (23:59:59 MYT)
 * of the current calendar day in Malaysia, offset by `offsetDays`.
 *
 * Use for Prisma queries that need "today in Malaysia" boundaries.
 */
export function getMalaysiaDayBoundaries(offsetDays = 0): { start: Date; end: Date } {
  const todayStr = getMalaysiaDateStr()
  const [y, m, d] = todayStr.split("-").map(Number)
  // midnight MYT = UTC - 8h
  const midnightMYT = new Date(Date.UTC(y, m - 1, d + offsetDays, 0, 0, 0) - MYT_OFFSET_MS)
  const endOfDayMYT = new Date(Date.UTC(y, m - 1, d + offsetDays, 23, 59, 59) - MYT_OFFSET_MS)
  return { start: midnightMYT, end: endOfDayMYT }
}

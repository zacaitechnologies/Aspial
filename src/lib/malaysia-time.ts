/** Malaysia (Kuala Lumpur) timezone for leave entitlements and year boundaries. */
export const MALAYSIA_TIMEZONE = "Asia/Kuala_Lumpur" as const

/**
 * Calendar year in Malaysia at the given instant (handles Jan 1 rollover vs UTC).
 */
export function getMalaysiaYear(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-MY", {
      timeZone: MALAYSIA_TIMEZONE,
      year: "numeric",
    }).format(now)
  )
}

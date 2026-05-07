export type PeriodView = "monthly" | "yearly"

export interface PeriodSelection {
  view: PeriodView
  year: number
  /** 0-indexed month, ignored when view === "yearly" */
  month: number
}

export interface PeriodRange {
  start: Date
  /** Half-open: entries are filtered with `startTime >= start && startTime < end` */
  end: Date
}

export function periodRange({ view, year, month }: PeriodSelection): PeriodRange {
  if (view === "yearly") {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
    }
  }
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1),
  }
}

export const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function yearOptions(earliest = 2020): number[] {
  const current = new Date().getFullYear()
  const start = Math.min(earliest, current)
  const years: number[] = []
  for (let y = current; y >= start; y--) years.push(y)
  return years
}

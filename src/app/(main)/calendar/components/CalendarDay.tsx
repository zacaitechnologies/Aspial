"use client"

import { CalendarBooking } from "@/app/(main)/calendar/actions"
import { CALENDAR_EVENT_TYPES, type CalendarEventType } from "../constants"

interface CalendarDayProps {
  day: number
  date: Date
  dateString: string
  dayBookings: CalendarBooking[]
  isToday: boolean
  onDateClick: (dateString: string) => void
  onBookingClick: (booking: CalendarBooking) => void
}

const TYPE_CSS_VAR: Record<CalendarEventType, string> = {
  PHOTO_SHOOT: "var(--calendar-photo-shoot)",
  VIDEO_SHOOT: "var(--calendar-video-shoot)",
  CONSULTATION: "var(--calendar-consultation)",
  PHOTO_SELECTION: "var(--calendar-photo-selection)",
  OTHERS: "var(--calendar-others)",
  LEAVE: "var(--calendar-leave)",
  BLOCKER: "var(--calendar-blocker)",
}

const TYPE_FG: Record<CalendarEventType, string> = {
  PHOTO_SHOOT: "#ffffff",
  VIDEO_SHOOT: "#ffffff",
  CONSULTATION: "#0f1e10",
  PHOTO_SELECTION: "#0f1e10",
  OTHERS: "#0f1e10",
  LEAVE: "#ffffff",
  BLOCKER: "var(--calendar-blocker-foreground)",
}

const TYPE_ORDER: CalendarEventType[] = [
  "PHOTO_SHOOT",
  "VIDEO_SHOOT",
  "CONSULTATION",
  "PHOTO_SELECTION",
  "OTHERS",
  "LEAVE",
  "BLOCKER",
]

export function CalendarDay({
  day,
  dateString,
  dayBookings,
  isToday,
  onDateClick,
}: CalendarDayProps) {
  const typeCounts = dayBookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.appointmentType] = (acc[b.appointmentType] || 0) + 1
    return acc
  }, {})

  const presentTypes = TYPE_ORDER.filter((t) => (typeCounts[t] || 0) > 0)

  return (
    <div
      className={`cal-day-cell h-24 sm:h-28 border border-border p-1 sm:p-1.5 cursor-pointer relative bg-card/40 ${
        isToday ? "bg-primary/10 border-primary/40" : ""
      }`}
      onClick={() => onDateClick(dateString)}
    >
      <div
        className={`text-xs sm:text-sm font-semibold mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full ${
          isToday ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
      >
        {day}
      </div>
      {presentTypes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {presentTypes.map((t) => {
            const count = typeCounts[t]
            const label = CALENDAR_EVENT_TYPES[t].label
            return (
              <div
                key={t}
                title={`${label}: ${count}`}
                aria-label={`${label}: ${count}`}
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none shadow-sm ring-1 ring-border/40"
                style={{
                  backgroundColor: TYPE_CSS_VAR[t],
                  color: TYPE_FG[t],
                }}
              >
                {count}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

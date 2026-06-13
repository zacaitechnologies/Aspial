"use client"

import { CalendarBooking } from "@/app/(main)/calendar/actions"
import { CALENDAR_EVENT_TYPES, type CalendarEventType } from "../constants"
import { CalendarTooltip } from "./CalendarEventTooltip"
import { DayTypeTooltipContent } from "./DayTypeTooltipContent"
import { EventTooltipContent } from "./EventTooltipContent"

interface CalendarDayProps {
  day: number
  date: Date
  dateString: string
  dayBookings: CalendarBooking[]
  isToday: boolean
  onDateClick: (dateString: string) => void
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
  const isCancelledAppointment = (b: CalendarBooking) =>
    b.type === "appointment" && b.status === "cancelled"

  // Cancelled appointments get their own grey chip instead of counting toward type colors
  const typeCounts = dayBookings.reduce<Record<string, number>>((acc, b) => {
    if (isCancelledAppointment(b)) return acc
    acc[b.appointmentType] = (acc[b.appointmentType] || 0) + 1
    return acc
  }, {})

  const cancelledBookings = dayBookings.filter(isCancelledAppointment)

  const presentTypes = TYPE_ORDER.filter((t) => (typeCounts[t] || 0) > 0)

  return (
    <div
      className={`cal-day-cell min-w-0 overflow-hidden p-1 sm:p-1.5 cursor-pointer relative ${
        isToday ? "cal-day-cell--today" : ""
      }`}
      onClick={() => onDateClick(dateString)}
    >
      <div
        className={`cal-day-number mb-1 inline-flex items-center justify-center ${
          isToday
            ? "cal-day-number--today w-8 h-8 text-base sm:text-lg font-extrabold text-foreground"
            : "w-6 h-6 text-xs sm:text-sm font-semibold text-foreground"
        }`}
      >
        {day}
      </div>
      {(presentTypes.length > 0 || cancelledBookings.length > 0) && (
        <div className="mt-1 flex min-w-0 flex-wrap gap-1">
          {presentTypes.map((t) => {
            const count = typeCounts[t]
            const label = CALENDAR_EVENT_TYPES[t].label
            return (
              <CalendarTooltip
                key={t}
                side="top"
                align="start"
                content={<DayTypeTooltipContent type={t} bookings={dayBookings} />}
              >
                <button
                  type="button"
                  aria-label={`${label}: ${count}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none shadow-sm ring-1 ring-border/40"
                  style={{
                    backgroundColor: TYPE_CSS_VAR[t],
                    color: TYPE_FG[t],
                  }}
                >
                  {count}
                </button>
              </CalendarTooltip>
            )
          })}
          {cancelledBookings.length > 0 && (
            <CalendarTooltip
              side="top"
              align="start"
              content={
                cancelledBookings.length === 1 ? (
                  <EventTooltipContent booking={cancelledBookings[0]} />
                ) : (
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold leading-snug">Cancelled appointments</p>
                    <ul className="space-y-2">
                      {cancelledBookings.map((booking) => (
                        <li
                          key={booking.id}
                          className="border-t border-border pt-2 first:border-0 first:pt-0"
                        >
                          <EventTooltipContent booking={booking} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              }
            >
              <button
                type="button"
                aria-label={`Cancelled: ${cancelledBookings.length}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none shadow-sm ring-1 ring-border/40 bg-muted text-muted-foreground line-through"
              >
                {cancelledBookings.length}
              </button>
            </CalendarTooltip>
          )}
        </div>
      )}
    </div>
  )
}

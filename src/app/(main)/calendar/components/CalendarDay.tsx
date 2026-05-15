"use client"

import { CalendarBooking } from "@/app/(main)/calendar/actions"
import { mergeAdjacentBookings } from "@/app/(main)/calendar/utils/calendar-utils"
import { useMemo } from "react"

interface CalendarDayProps {
  day: number
  date: Date
  dateString: string
  dayBookings: CalendarBooking[]
  isToday: boolean
  onDateClick: (dateString: string) => void
  onBookingClick: (booking: CalendarBooking) => void
}

export function CalendarDay({
  day,
  date,
  dateString,
  dayBookings,
  isToday,
  onDateClick,
  onBookingClick
}: CalendarDayProps) {
  const merged = useMemo(() => mergeAdjacentBookings(dayBookings), [dayBookings])

  return (
    <div
      className={`calendar-day h-24 border border-border p-0.5 sm:p-1 cursor-pointer relative ${
        isToday ? "bg-primary/10 border-primary/30" : ""
      }`}
      onClick={() => onDateClick(dateString)}
    >
      <div className={`text-xs sm:text-sm font-medium mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>
        {day}
      </div>
      <div className="space-y-1">
        {merged.slice(0, 2).map((booking) => (
          <div
            key={booking.id}
            className={`text-xs px-1 py-0.5 rounded truncate ${booking.color} cursor-pointer`}
            onClick={(e) => {
              e.stopPropagation()
              onBookingClick(booking)
            }}
          >
            {booking.title}
          </div>
        ))}
        {merged.length > 2 && (
          <div className="text-xs text-muted-foreground px-1">
            +{merged.length - 2} more
          </div>
        )}
      </div>
    </div>
  )
}
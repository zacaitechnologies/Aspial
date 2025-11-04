"use client"

import { CalendarBooking } from "@/app/(main)/calander/actions"

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

  return (
    <div
      className={`calendar-day h-24 border border-gray-100 p-1 cursor-pointer relative ${
        isToday ? "bg-blue-50 border-blue-200" : ""
      }`}
      onClick={() => onDateClick(dateString)}
    >
      <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-700"}`}>
        {day}
      </div>
      <div className="space-y-1">
        {dayBookings.slice(0, 2).map((booking) => (
          <div
            key={booking.id}
            className={`text-xs px-1 py-0.5 rounded text-white truncate ${booking.color} cursor-pointer`}
            onClick={(e) => {
              e.stopPropagation()
              onBookingClick(booking)
            }}
          >
            {booking.title}
          </div>
        ))}
        {dayBookings.length > 2 && (
          <div className="text-xs text-gray-500 px-1">
            +{dayBookings.length - 2} more
          </div>
        )}
      </div>
    </div>
  )
} 
"use client"

import { createPortal } from "react-dom"
import { CalendarBooking } from "@/app/(main)/calander/actions"
import { Calendar, Clock, MapPin, Users } from "lucide-react"

interface BookingTooltipProps {
  booking: CalendarBooking
  isVisible: boolean
}

export function BookingTooltip({ booking, isVisible }: BookingTooltipProps) {
  if (!isVisible) return null

  const tooltipContent = (
    <div
      className="fixed !z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-4 !w-60"
      style={{ top: 'var(--tooltip-top)', left: 'var(--tooltip-left)' }}
    >
      <div className="text-sm font-medium text-gray-900 mb-2">{booking.title}</div>
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(booking.date).toLocaleDateString()}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {booking.startTime} - {booking.endTime}
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {booking.location}
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {booking.attendees} attendees
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500">{booking.description}</div>
      </div>
    </div>
  )

  return typeof window !== "undefined"
    ? createPortal(tooltipContent, document.body)
    : null
} 
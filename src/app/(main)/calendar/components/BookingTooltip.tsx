"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { CalendarBooking } from "@/app/(main)/calendar/actions"
import { formatDateStringDirect } from "@/lib/date-utils"
import { Calendar, Clock, MapPin, Users, Tag } from "lucide-react"
import { formatAppointmentCategoryLabel } from "../utils/calendar-utils"
import { formatAppointmentEventTitle } from "../utils/appointment-display"

interface BookingTooltipProps {
  booking: CalendarBooking
  isVisible: boolean
}

export function BookingTooltip({ booking, isVisible }: BookingTooltipProps) {
  const [mounted, setMounted] = useState(false)
  const categoryLabel = formatAppointmentCategoryLabel(booking)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isVisible) return null

  // Render portal only after mount so server and first client render match (avoids hydration mismatch)
  if (!mounted) return null

  const tooltipContent = (
    <div
      className="fixed !z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-4 !w-60"
      style={{ top: 'var(--tooltip-top)', left: 'var(--tooltip-left)' }}
    >
      <div className="mb-2 text-sm font-medium text-foreground">
        {booking.type === "appointment" ? (
          <>
            <p className="font-semibold text-foreground">
              {formatAppointmentEventTitle(booking)}
            </p>
            {booking.creatorName ? (
              <p className="mt-1 text-foreground">
                <span className="text-muted-foreground">Booked by: </span>
                <span className="font-medium">{booking.creatorName}</span>
              </p>
            ) : null}
          </>
        ) : (
          booking.title
        )}
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDateStringDirect(booking.date)}
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
        {booking.type === "appointment" && categoryLabel && (
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            <span>Category: {categoryLabel}</span>
          </div>
        )}
      </div>
      {booking.description ? (
        <div className="mt-2 border-t border-border pt-2">
          <div className="text-xs text-muted-foreground">{booking.description}</div>
        </div>
      ) : null}
    </div>
  )

  return createPortal(tooltipContent, document.body)
} 
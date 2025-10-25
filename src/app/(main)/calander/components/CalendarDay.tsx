"use client"

import { useState, useRef, useEffect } from "react"
import { CalendarBooking } from "@/app/(main)/calander/actions"
import { BookingTooltip } from "./BookingTooltip"

interface CalendarDayProps {
  day: number
  date: Date
  dateString: string
  dayBookings: CalendarBooking[]
  isToday: boolean
  isHovered: boolean
  onDateClick: (dateString: string) => void
  onBookingClick: (booking: CalendarBooking) => void
  onHoverChange: (dateString: string) => void
}

export function CalendarDay({
  day,
  date,
  dateString,
  dayBookings,
  isToday,
  isHovered,
  onDateClick,
  onBookingClick,
  onHoverChange
}: CalendarDayProps) {
  const [hoveredBooking, setHoveredBooking] = useState<CalendarBooking | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleBookingMouseEnter = (booking: CalendarBooking, event: React.MouseEvent) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
      tooltipTimeoutRef.current = null
    }
    
    // Calculate tooltip position relative to viewport
    const rect = event.currentTarget.getBoundingClientRect()
    const tooltipTop = rect.top - 10 // 10px above the element
    const tooltipLeft = rect.left + rect.width / 2 // center horizontally
    
    // Set CSS variables for tooltip positioning
    document.documentElement.style.setProperty('--tooltip-top', `${tooltipTop}px`)
    document.documentElement.style.setProperty('--tooltip-left', `${tooltipLeft}px`)
    
    console.log('Setting tooltip:', { booking: booking.title, showTooltip: true, top: tooltipTop, left: tooltipLeft })
    setHoveredBooking(booking)
    setShowTooltip(true)
  }

  const handleBookingMouseLeave = () => {
    console.log('Mouse leave, setting timeout')
    tooltipTimeoutRef.current = setTimeout(() => {
      console.log('Timeout fired, hiding tooltip')
      setShowTooltip(false)
      setHoveredBooking(null)
    }, 100) // Reduced delay to 100ms
  }

  const handleTooltipMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
      tooltipTimeoutRef.current = null
    }
  }

  const handleTooltipMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false)
      setHoveredBooking(null)
    }, 100)
  }

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      className={`calendar-day h-24 border border-gray-100 p-1 cursor-pointer transition-all duration-200 hover:bg-gray-50 relative ${
        isToday ? "bg-blue-50 border-blue-200" : ""
      } ${isHovered ? "shadow-md transform scale-105" : ""}`}
      onMouseEnter={() => onHoverChange(dateString)}
      onMouseLeave={() => onHoverChange("")}
      onClick={() => onDateClick(dateString)}
    >
      <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-700"}`}>
        {day}
      </div>
      <div className="space-y-1">
        {dayBookings.slice(0, 2).map((booking, index) => (
          <div
            key={booking.id}
            className={`text-xs px-1 py-0.5 rounded text-white truncate ${booking.color} 
              transition-all duration-200 hover:opacity-75 animate-in slide-in-from-left-2 cursor-pointer`}
            style={{ animationDelay: `${index * 100}ms` }}
            onMouseEnter={(e) => handleBookingMouseEnter(booking, e)}
            onMouseLeave={handleBookingMouseLeave}
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

      {/* Tooltip */}
      {hoveredBooking && showTooltip && (
        <div
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <BookingTooltip 
            booking={hoveredBooking} 
            isVisible={true} 
          />
        </div>
      )}
    </div>
  )
} 
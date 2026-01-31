"use client"

import { useMemo, useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Users, Calendar as CalendarIcon } from "lucide-react"
import { formatDateStringDirect } from "@/lib/date-utils"
import { CalendarBooking } from "../actions"

interface DateEventsDialogProps {
  isOpen: boolean
  onClose: () => void
  date: string
  events: CalendarBooking[]
  onEventClick: (event: CalendarBooking) => void
}

const eventTypeColors = {
  appointment: "bg-blue-500",
  task: "bg-red-500"
}

const eventTypeLabels = {
  appointment: "Appointment",
  task: "Task"
}

export function DateEventsDialog({
  isOpen,
  onClose,
  date,
  events,
  onEventClick
}: DateEventsDialogProps) {
  // Memoize formatted title so it doesn't recalc on every render during animation
  const formattedTitle = useMemo(
    () => formatDateStringDirect(date, { includeWeekday: true, format: "long" }),
    [date]
  )

  // Defer painting event list until after open animation starts (smoother zoom)
  const [showContent, setShowContent] = useState(false)
  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => {
        setShowContent(true)
      })
      return () => cancelAnimationFrame(id)
    }
    setShowContent(false)
  }, [isOpen])

  const formatTime = (timeString: string) => {
    if (timeString === "00:00" && events.some(e => e.type === "task")) {
      return "All day"
    }
    return timeString
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto will-change-transform">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Events for {formattedTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className={`space-y-4 transition-opacity duration-150 ${showContent ? "opacity-100" : "opacity-0"}`}>
          {!showContent ? (
            <div className="min-h-[120px]" aria-hidden />
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No events scheduled</p>
              <p className="text-sm">This day is free of any bookings or tasks.</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="border rounded-lg p-4 cursor-pointer"
                onClick={() => onEventClick(event)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={`${eventTypeColors[event.type]} text-white`}
                    >
                      {eventTypeLabels[event.type]}
                    </Badge>
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {event.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  {event.attendees > 1 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{event.attendees} attendees</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

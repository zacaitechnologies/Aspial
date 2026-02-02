"use client"

import { CalendarBooking } from "@/app/(main)/calander/actions"
import { APPOINTMENT_TYPES } from "@/app/(main)/calander/constants"
import { formatDateStringDirect } from "@/lib/date-utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface BookingDetailsDialogProps {
  booking: CalendarBooking | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (booking: CalendarBooking) => void
  onDelete?: (bookingId: string) => void
}

export function BookingDetailsDialog({ 
  booking, 
  isOpen, 
  onClose
}: BookingDetailsDialogProps) {
  if (!booking) return null

  const appointmentTypeLabel = APPOINTMENT_TYPES[booking.appointmentType]?.label || 'Others'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Booking Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={booking.color}>
              {appointmentTypeLabel}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">Booking name:</span>
              <span className="text-muted-foreground">{booking.bookingName ?? booking.title}</span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{booking.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{booking.description}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDateStringDirect(booking.date)}</span>
              </div>
              {booking.type !== "task" && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{booking.startTime} - {booking.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{booking.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{booking.attendees} attendees</span>
                  </div>
                </>
              )}
              {booking.type === "task" && (
                <>
                  {booking.taskStartDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Start: {formatDateStringDirect(booking.taskStartDate)}</span>
                    </div>
                  )}
                  {booking.taskDueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Due: {formatDateStringDirect(booking.taskDueDate)}</span>
                    </div>
                  )}
                  {booking.projectName && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>Project: {booking.projectName}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
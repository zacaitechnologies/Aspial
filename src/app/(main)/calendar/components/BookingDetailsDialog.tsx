"use client"

import { useState } from "react"
import { CalendarBooking } from "@/app/(main)/calendar/actions"
import { CALENDAR_EVENT_TYPES } from "@/app/(main)/calendar/constants"
import { formatDateStringDirect } from "@/lib/date-utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, User, UserCircle, Users, Pencil, Trash2, ShieldAlert, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface BookingDetailsDialogProps {
  booking: CalendarBooking | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (booking: CalendarBooking) => void
  onDelete?: (booking: CalendarBooking) => void
  isAdmin?: boolean
}

function leaveStatusLabel(booking: CalendarBooking): string | null {
  if (booking.type !== "leave") return null
  const raw = booking.originalData
  if (raw === null || typeof raw !== "object" || !("status" in raw)) return null
  const s = (raw as { status?: unknown }).status
  return typeof s === "string" ? s : null
}

export function BookingDetailsDialog({
  booking,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isAdmin = false,
}: BookingDetailsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!booking) return null

  const appointmentTypeLabel = CALENDAR_EVENT_TYPES[booking.appointmentType]?.label || "Others"
  const leaveStatus = leaveStatusLabel(booking)
  const isBlocker = booking.type === "blocker"
  const blockerData = isBlocker
    ? (booking.originalData as {
        blockerId: number
        blocksAppointments: boolean
        startDateTime: string
        endDateTime: string
        allDay?: boolean
      })
    : null

  const handleDelete = async () => {
    if (!onDelete || !booking) return
    setIsDeleting(true)
    try {
      await onDelete(booking)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isBlocker ? "Blocker Details" : booking.type === "leave" ? "Leave details" : "Booking Details"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={booking.color}>
              {appointmentTypeLabel}
            </Badge>
            {isBlocker && blockerData?.blocksAppointments && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Blocks Appointments
              </Badge>
            )}
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
              {booking.type === "appointment" && booking.creatorName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Booked by:</span>
                  <span>{booking.creatorName}</span>
                </div>
              )}
              {booking.type === "leave" && booking.creatorName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Applicant:</span>
                  <span>{booking.creatorName}</span>
                </div>
              )}
              {booking.type === "task" && booking.assigneeName && (
                <div className="flex items-center gap-2 text-sm">
                  <UserCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span>{booking.assigneeName}</span>
                </div>
              )}
              {isBlocker && booking.creatorName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created by:</span>
                  <span>{booking.creatorName}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDateStringDirect(booking.date)}</span>
              </div>
              {booking.type === "appointment" && (
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
              {isBlocker && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{blockerData?.allDay ? "All day" : `${booking.startTime} - ${booking.endTime}`}</span>
                </div>
              )}
              {booking.type === "leave" && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{booking.startTime} - {booking.endTime}</span>
                  </div>
                  {leaveStatus && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="capitalize">{leaveStatus.toLowerCase()}</span>
                    </div>
                  )}
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

          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              {isBlocker && isAdmin && onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(booking)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
              {isBlocker && isAdmin && onDelete && (
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                  Delete
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

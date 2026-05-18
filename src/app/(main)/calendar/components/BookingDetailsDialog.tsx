"use client"

import { useState } from "react"
import { CalendarBooking } from "@/app/(main)/calendar/actions"
import { CALENDAR_EVENT_TYPES } from "@/app/(main)/calendar/constants"
import { formatDateStringDirect } from "@/lib/date-utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, User, UserCircle, Users, Pencil, Trash2, ShieldAlert, Loader2, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface BookingDetailsDialogProps {
  booking: CalendarBooking | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (booking: CalendarBooking) => void
  onDelete?: (booking: CalendarBooking) => void
  onEditBooking?: (booking: CalendarBooking) => void
  onCancelBooking?: (booking: CalendarBooking) => void
  isAdmin?: boolean
}

function leaveStatusLabel(booking: CalendarBooking): string | null {
  if (booking.type !== "leave") return null
  const raw = booking.originalData
  if (raw === null || typeof raw !== "object" || !("status" in raw)) return null
  const s = (raw as { status?: unknown }).status
  return typeof s === "string" ? s : null
}

function mergedPartCount(booking: CalendarBooking): number {
  const raw = booking.originalData
  if (raw === null || typeof raw !== "object" || !("kind" in raw)) return 0
  const meta = raw as { kind?: unknown; parts?: unknown }
  if (meta.kind !== "merged" || !Array.isArray(meta.parts)) return 0
  return meta.parts.length
}

export function BookingDetailsDialog({
  booking,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onEditBooking,
  onCancelBooking,
  isAdmin = false,
}: BookingDetailsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  if (!booking) return null

  const appointmentTypeLabel = CALENDAR_EVENT_TYPES[booking.appointmentType]?.label || "Others"
  const leaveStatus = leaveStatusLabel(booking)
  const partCount = mergedPartCount(booking)
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

  const handleCancelBooking = async () => {
    if (!onCancelBooking || !booking) return
    setIsCancelling(true)
    try {
      await onCancelBooking(booking)
    } finally {
      setIsCancelling(false)
    }
  }

  const isAppointment = booking?.type === "appointment"
  const isMerged = partCount > 1
  // Merged events represent multiple booking rows — editing/cancelling one
  // would be misleading, so route the user to the appointment-bookings page.
  const canEditAppointment = isAppointment && !isMerged && (booking?.isUserBooking || isAdmin)

  // Extract additional details from originalData for appointments. Merged
  // events wrap the first booking's originalData under `first`.
  const appointmentOriginalData = (() => {
    if (!isAppointment || !booking?.originalData) return null
    const raw = booking.originalData as Record<string, unknown>
    const source = raw.kind === "merged" && raw.first ? (raw.first as Record<string, unknown>) : raw
    return source as {
      companyName?: string | null
      contactNumber?: string | null
      remarks?: string | null
      purpose?: string | null
    }
  })()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isBlocker ? "Blocker Details" : booking.type === "leave" ? "Leave details" : "Booking Details"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className={booking.color}>
              {appointmentTypeLabel}
            </Badge>
            <div className="flex items-center gap-2">
              {isMerged && (
                <Badge variant="outline" className="text-xs">
                  {partCount} consecutive bookings
                </Badge>
              )}
              {isBlocker && blockerData?.blocksAppointments && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Blocks Appointments
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {isAppointment ? (
              <>
                {booking.bookingName && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">Booking name:</span>
                    <span className="text-muted-foreground">{booking.bookingName}</span>
                  </div>
                )}
                {booking.creatorName && (
                  <p className="text-lg text-foreground">
                    <span className="font-medium text-muted-foreground">Booked by: </span>
                    <span className="font-bold">{booking.creatorName}</span>
                  </p>
                )}
                {booking.description ? (
                  <p className="text-sm text-muted-foreground">{booking.description}</p>
                ) : null}
              </>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-foreground">{booking.title}</h3>
                {booking.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{booking.description}</p>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              {booking.type === "appointment" && booking.creatorEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="truncate">{booking.creatorEmail}</span>
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

          {/* Appointment-specific extra details */}
          {isAppointment && appointmentOriginalData && (
            <div className="space-y-2 pt-2 border-t">
              {appointmentOriginalData.companyName && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Company:</span>
                  <span>{appointmentOriginalData.companyName}</span>
                </div>
              )}
              {appointmentOriginalData.contactNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Contact:</span>
                  <span>{appointmentOriginalData.contactNumber}</span>
                </div>
              )}
              {appointmentOriginalData.remarks && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Remarks:</span>
                  <span>{appointmentOriginalData.remarks}</span>
                </div>
              )}
            </div>
          )}

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
              {canEditAppointment && onEditBooking && (
                <Button variant="outline" size="sm" onClick={() => onEditBooking(booking)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
              {canEditAppointment && onCancelBooking && (
                <Button variant="destructive" size="sm" onClick={handleCancelBooking} disabled={isCancelling}>
                  {isCancelling ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                  Cancel Booking
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

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAppointment, updateAppointment } from "@/app/(main)/appointment-bookings/actions"
import { APPOINTMENT_TYPES } from "@/app/(main)/calander/constants"

interface Appointment {
  id: number
  name: string
  location?: string | null
  brand?: string | null
  description?: string | null
  appointmentType?: string
  isAvailable: boolean
}

interface AppointmentFormProps {
  appointment?: Appointment
  onClose: () => void
  onSuccess?: () => void
}

export function AppointmentForm({ appointment, onClose, onSuccess }: AppointmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [appointmentType, setAppointmentType] = useState<string>(appointment?.appointmentType || "OTHERS")

  async function handleSubmit(formData: FormData) {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      formData.append("appointmentType", appointmentType)
      const result = appointment 
        ? await updateAppointment(appointment.id, formData) 
        : await createAppointment(formData)

      if (result.success) {
        onSuccess?.()
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md border rounded-lg p-6">
      <div>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={appointment?.name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={appointment?.location || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" name="brand" defaultValue={appointment?.brand || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={appointment?.description || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointmentType">Appointment Type *</Label>
            <Select value={appointmentType} onValueChange={setAppointmentType} required>
              <SelectTrigger className="w-full bg-background border-2 border-accent">
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APPOINTMENT_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {appointment && (
            <div className="flex items-center space-x-2">
              <Checkbox id="isAvailable" name="isAvailable" defaultChecked={appointment.isAvailable} />
              <Label htmlFor="isAvailable">Available</Label>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : appointment ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

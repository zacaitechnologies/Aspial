"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createStudioBooking } from "@/app/(main)/equipment-bookings/actions"
import { useSession } from "@/app/(main)/contexts/SessionProvider"

interface Studio {
  id: number
  name: string
  location: string
  capacity: number
  description: string | null
  isActive: boolean
}

interface StudioBookingFormProps {
  studio: Studio
  onClose: () => void
}

export function StudioBookingForm({ studio, onClose }: StudioBookingFormProps) {
  const { enhancedUser } = useSession()
  const [formData, setFormData] = useState({
    startDateTime: "",
    endDateTime: "",
    purpose: "",
    attendees: 1,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      // Validate date/time
      const startDateTime = new Date(formData.startDateTime)
      const endDateTime = new Date(formData.endDateTime)
      
      if (startDateTime >= endDateTime) {
        setError("End date and time must be later than start date and time")
        setIsSubmitting(false)
        return
      }

      // Get user name from session
      const userName = enhancedUser.profile 
        ? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim() 
        : enhancedUser.email || 'Unknown User'
      
      const data = new FormData()
      data.append("studioId", studio.id.toString())
      data.append("bookedBy", userName)
      data.append("startDate", startDateTime.toISOString())
      data.append("endDate", endDateTime.toISOString())
      data.append("purpose", formData.purpose)
      data.append("attendees", formData.attendees.toString())

      const result = await createStudioBooking(data)
      
      if (result.success) {
        onClose()
      } else {
        setError("Failed to create booking: " + result.error)
      }
    } catch (error) {
      console.error("Error creating booking:", error)
      setError("An error occurred while creating the booking")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="bookedBy">Booked By</Label>
        <Input
          id="bookedBy"
          value={enhancedUser.profile 
            ? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim() 
            : enhancedUser.email || 'Unknown User'
          }
          disabled
          className="bg-gray-50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDateTime">Start Date & Time</Label>
        <Input
          id="startDateTime"
          type="datetime-local"
          value={formData.startDateTime}
          onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endDateTime">End Date & Time</Label>
        <Input
          id="endDateTime"
          type="datetime-local"
          value={formData.endDateTime}
          onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="purpose">Purpose</Label>
        <Textarea
          id="purpose"
          value={formData.purpose}
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          placeholder="What is this booking for?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="attendees">Number of Attendees</Label>
        <Input
          id="attendees"
          type="number"
          min="1"
          max={studio.capacity}
          value={formData.attendees}
          onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) || 1 })}
          required
        />
        <p className="text-sm text-muted-foreground">
          Studio capacity: {studio.capacity} people
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Creating..." : "Create Booking"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
} 
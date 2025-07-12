"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBooking } from "@/app/(main)/equipment-bookings/actions"

interface Equipment {
  id: number
  name: string
}

interface BookingFormProps {
  equipment: Equipment
  onClose: () => void
}

export function BookingForm({ equipment, onClose }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(formData: FormData) {
    setError("")
    setIsSubmitting(true)
    
    // Validate date/time
    const startDateTime = formData.get("startDate") as string
    const endDateTime = formData.get("endDate") as string
    
    if (new Date(startDateTime) >= new Date(endDateTime)) {
      setError("End date and time must be later than start date and time")
      setIsSubmitting(false)
      return
    }
    
    formData.append("equipmentId", equipment.id.toString())

    const result = await createBooking(formData)

    if (result.success) {
      onClose()
    }
    setIsSubmitting(false)
  }

  const now = new Date()
  const defaultStart = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
  const defaultEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000) // 3 hours from now

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Book Equipment: {equipment.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="bookedBy">Booked By</Label>
            <Input id="bookedBy" name="bookedBy" required placeholder="Enter your name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date & Time</Label>
            <Input
              id="startDate"
              name="startDate"
              type="datetime-local"
              defaultValue={defaultStart.toISOString().slice(0, 16)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date & Time</Label>
            <Input
              id="endDate"
              name="endDate"
              type="datetime-local"
              defaultValue={defaultEnd.toISOString().slice(0, 16)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose (Optional)</Label>
            <Textarea id="purpose" name="purpose" placeholder="Describe the purpose of booking" />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Booking..." : "Book Equipment"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

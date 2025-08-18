"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { createStudio, updateStudio } from "@/app/(main)/equipment-bookings/actions"

interface Studio {
  id: number
  name: string
  location: string
  capacity: number
  description: string | null
  isActive: boolean
}

interface StudioFormProps {
  studio?: Studio
  onClose: () => void
}

export function StudioForm({ studio, onClose }: StudioFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)

    const result = studio ? await updateStudio(studio.id, formData) : await createStudio(formData)

    if (result.success) {
      onClose()
    }
    setIsSubmitting(false)
  }

  return (
    <div className="w-full max-w-md border rounded-lg p-6">
      <div>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={studio?.name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={studio?.location} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" name="capacity" type="number" defaultValue={studio?.capacity} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={studio?.description || ""} />
          </div>

          {studio && (
            <div className="flex items-center space-x-2">
              <Checkbox id="isActive" name="isActive" defaultChecked={studio.isActive} />
              <Label htmlFor="isActive">Active</Label>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : studio ? "Update" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
                 </form>
       </div>
     </div>
  )
}

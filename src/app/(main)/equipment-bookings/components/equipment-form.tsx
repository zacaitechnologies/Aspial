"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { createEquipment, updateEquipment } from "@/app/(main)/equipment-bookings/actions"

interface Equipment {
  id: number
  name: string
  type: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  condition: string
  isAvailable: boolean
}

interface EquipmentFormProps {
  equipment?: Equipment
  onClose: () => void
  onSuccess?: () => void
}

export function EquipmentForm({ equipment, onClose, onSuccess }: EquipmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true)

    try {
      const result = equipment ? await updateEquipment(equipment.id, formData) : await createEquipment(formData)

      if (result.success) {
        onSuccess?.()
        onClose()
      } else {
        console.error("Form submission failed:", result.error)
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
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={equipment?.name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Input id="type" name="type" defaultValue={equipment?.type} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" name="brand" defaultValue={equipment?.brand || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" defaultValue={equipment?.model || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input id="serialNumber" name="serialNumber" defaultValue={equipment?.serialNumber || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select name="condition" defaultValue={equipment?.condition || "Good"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Excellent">Excellent</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>



          {equipment && (
            <div className="flex items-center space-x-2">
              <Checkbox id="isAvailable" name="isAvailable" defaultChecked={equipment.isAvailable} />
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
              ) : equipment ? (
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

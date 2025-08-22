"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createBooking, createStudioBooking } from "@/app/(main)/equipment-bookings/actions"
import { format } from "date-fns"
import { useSession } from "@/app/(main)/contexts/SessionProvider"

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

interface Studio {
  id: number
  name: string
  location: string
  capacity: number
  description: string | null
  isActive: boolean
}

interface MultipleBookingFormProps {
  item: Equipment | Studio
  slots: { start: Date; end: Date }[]
  isStudio: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function MultipleBookingForm({ item, slots, isStudio, onClose, onSuccess }: MultipleBookingFormProps) {
  const { enhancedUser } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [purpose, setPurpose] = useState("")
  const [attendees, setAttendees] = useState("")

  // Get user name from session
  const userName = enhancedUser.profile 
    ? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim() 
    : enhancedUser.email || 'Unknown User'

  // Function to group consecutive slots
  const groupConsecutiveSlots = (slots: { start: Date; end: Date }[]) => {
    if (slots.length === 0) return []
    
    // Sort slots by start time
    const sortedSlots = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime())
    const groups: { start: Date; end: Date }[][] = []
    let currentGroup: { start: Date; end: Date }[] = [sortedSlots[0]]
    
    for (let i = 1; i < sortedSlots.length; i++) {
      const currentSlot = sortedSlots[i]
      const lastSlotInGroup = currentGroup[currentGroup.length - 1]
      
      // Check if current slot is consecutive (starts when the previous one ends)
      if (currentSlot.start.getTime() === lastSlotInGroup.end.getTime()) {
        currentGroup.push(currentSlot)
      } else {
        // Start a new group
        groups.push([...currentGroup])
        currentGroup = [currentSlot]
      }
    }
    
    // Add the last group
    groups.push(currentGroup)
    
    return groups
  }

  // Group consecutive slots
  const slotGroups = groupConsecutiveSlots(slots)
  
  // Calculate total duration for display
  const totalDuration = slots.length * 60 // minutes
  const totalHours = Math.floor(totalDuration / 60)
  const remainingMinutes = totalDuration % 60
  const durationText = totalHours > 0 
    ? `${totalHours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`.trim()
    : `${remainingMinutes}m`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Create bookings for each group of consecutive slots
      for (const group of slotGroups) {
        const formData = new FormData()
        
        if (isStudio) {
          formData.append("studioId", item.id.toString())
          formData.append("attendees", attendees)
        } else {
          formData.append("equipmentId", item.id.toString())
        }
        
        formData.append("bookedBy", userName)
        // Use the start time of the first slot and end time of the last slot
        formData.append("startDate", group[0].start.toISOString())
        formData.append("endDate", group[group.length - 1].end.toISOString())
        formData.append("purpose", purpose)

        if (isStudio) {
          await createStudioBooking(formData)
        } else {
          await createBooking(formData)
        }
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Failed to create bookings:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          Book {isStudio ? 'Studio' : 'Equipment'}: {item.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {slots.length} slot{slots.length > 1 ? 's' : ''} selected ({durationText}) - {slotGroups.length} booking{slotGroups.length > 1 ? 's' : ''} will be created
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bookedBy">Booked By</Label>
          <Input
            id="bookedBy"
            value={userName}
            disabled
            className="bg-gray-50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purpose">Purpose</Label>
          <Textarea
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="What will this be used for?"
            rows={3}
          />
        </div>

                 {isStudio && (
           <div className="space-y-2">
             <Label htmlFor="attendees">Number of Attendees</Label>
             <Input
               id="attendees"
               type="number"
               value={attendees}
               onChange={(e) => setAttendees(e.target.value)}
               required
               min="1"
               max={(item as Studio).capacity}
               placeholder={`Max: ${(item as Studio).capacity}`}
             />
           </div>
         )}

        <div className="space-y-2">
          <Label>Selected Time Slots</Label>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {slotGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-1">
                {group.length > 1 && (
                  <div className="text-xs text-blue-600 font-medium">
                    Group {groupIndex + 1} (Combined)
                  </div>
                )}
                {group.map((slot, slotIndex) => (
                  <div key={`${groupIndex}-${slotIndex}`} className="text-sm bg-muted p-2 rounded">
                    {format(slot.start, "HH:mm")} - {format(slot.end, "HH:mm")}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Creating..." : `Create ${slotGroups.length} Booking${slotGroups.length > 1 ? 's' : ''}`}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

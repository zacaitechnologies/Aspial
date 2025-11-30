"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Users, Wrench } from "lucide-react"
import { format, addHours, startOfDay, isBefore, isAfter } from "date-fns"
import { cn } from "@/lib/utils"

interface Booking {
  id: number
  bookedBy: string
  startDate: Date
  endDate: Date
  purpose: string | null
  status: string
}

interface StudioBooking {
  id: number
  bookedBy: string
  startDate: Date
  endDate: Date
  purpose: string | null
  attendees: number
  status: string
}

interface Equipment {
  id: number
  name: string
  type: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  condition: string
  isAvailable: boolean
  bookings?: Booking[]
}

interface Studio {
  id: number
  name: string
  location: string
  capacity: number
  description: string | null
  isActive: boolean
  bookings?: StudioBooking[]
}

interface BookingListProps {
  selectedDate: Date
  equipment: Equipment[]
  studios: Studio[]
  onBookEquipment: (equipment: Equipment, slots: { start: Date; end: Date }[]) => void
  onBookStudio: (studio: Studio, slots: { start: Date; end: Date }[]) => void
}

export function BookingList({ 
  selectedDate, 
  equipment, 
  studios, 
  onBookEquipment, 
  onBookStudio 
}: BookingListProps) {
  const [selectedSlots, setSelectedSlots] = useState<{
    [key: string]: { start: Date; end: Date }[]
  }>({})



  const generateTimeSlots = (date: Date) => {
    const slots = []
    const startOfSelectedDay = startOfDay(date)
    
    // Generate slots from 8 AM to 10 PM (14 hours)
    for (let i = 0; i < 14; i++) {
      const startTime = addHours(startOfSelectedDay, 8 + i)
      const endTime = addHours(startTime, 1)
      
      // Check if slot is in the past
      const isPast = isBefore(startTime, new Date())
      
      slots.push({
        start: startTime,
        end: endTime,
        isPast,
        timeLabel: format(startTime, "HH:mm")
      })
    }
    
    return slots
  }

  const timeSlots = generateTimeSlots(selectedDate)

  const isSlotBooked = (item: Equipment | Studio, slot: { start: Date; end: Date }) => {
    const bookings = item.bookings || []
    // Filter to only active bookings and check for overlaps
    return bookings.some(booking => {
      // Only check active bookings
      if (booking.status !== 'active') return false
      
      // Convert booking dates to Date objects if they're strings
      const bookingStart = booking.startDate instanceof Date 
        ? booking.startDate 
        : new Date(booking.startDate)
      const bookingEnd = booking.endDate instanceof Date 
        ? booking.endDate 
        : new Date(booking.endDate)
      
      // Check if slot overlaps with booking
      // Two time ranges overlap if: slotStart < bookingEnd AND slotEnd > bookingStart
      return slot.start < bookingEnd && slot.end > bookingStart
    })
  }

  const handleSlotClick = (itemId: string, slot: { start: Date; end: Date }) => {
    setSelectedSlots(prev => {
      const currentSlots = prev[itemId] || []
      const slotExists = currentSlots.some(s => s.start.getTime() === slot.start.getTime())
      
      if (slotExists) {
        // Remove slot if already selected
        return {
          ...prev,
          [itemId]: currentSlots.filter(s => s.start.getTime() !== slot.start.getTime())
        }
      } else {
        // Add slot if not selected
        return {
          ...prev,
          [itemId]: [...currentSlots, slot]
        }
      }
    })
  }

  const handleBook = (item: Equipment | Studio) => {
    const itemId = 'type' in item ? `Equipment-${item.id}` : `Studio-${item.id}`
    const selectedSlotArray = selectedSlots[itemId]
    if (!selectedSlotArray || selectedSlotArray.length === 0) return

    if ('type' in item) {
      // Equipment - pass all selected slots at once
      onBookEquipment(item as Equipment, selectedSlotArray)
    } else {
      // Studio - pass all selected slots at once
      onBookStudio(item as Studio, selectedSlotArray)
    }
    
    // Clear selection
    setSelectedSlots(prev => ({
      ...prev,
      [itemId]: []
    }))
  }

  const renderEquipmentItem = (equipment: Equipment) => {
    const itemId = `Equipment-${equipment.id}`
    const selectedSlotArray = selectedSlots[itemId] || []

    return (
      <Card key={itemId} className="p-4">
        <div className="flex gap-4">
          {/* Left side - Equipment info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{equipment.name}</h3>
                <p className="text-sm text-muted-foreground">{equipment.type}</p>
              </div>
              <Badge variant={equipment.isAvailable ? "default" : "secondary"}>
                {equipment.isAvailable ? "Available" : "Unavailable"}
              </Badge>
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              {equipment.brand && equipment.model && (
                <p className="flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  {equipment.brand} {equipment.model}
                </p>
              )}
              <p>Condition: {equipment.condition}</p>
            </div>
          </div>

          {/* Right side - Time slots */}
          <div className="flex-1">
            <div className="grid grid-cols-7 gap-1">
                             {timeSlots.map((slot, index) => {
                 const isBooked = isSlotBooked(equipment, slot)
                 const isSelected = selectedSlotArray?.some(s => s.start.getTime() === slot.start.getTime())
                 const isDisabled = !equipment.isAvailable || slot.isPast || isBooked

                 return (
                   <button
                     key={index}
                     onClick={() => !isDisabled && handleSlotClick(itemId, slot)}
                     disabled={isDisabled}
                     className={cn(
                       "p-2 text-xs border rounded transition-colors",
                       {
                         // Booked slots should be red, even if disabled
                         "bg-red-100 text-red-600 border-red-200 cursor-not-allowed": isBooked,
                         // Selected slots (blue) take precedence over other states
                         "bg-blue-500 text-white border-blue-600": isSelected && !isBooked,
                         // Disabled but not booked (gray)
                         "bg-gray-100 text-gray-400 cursor-not-allowed": isDisabled && !isBooked,
                         // Available slots (white)
                         "bg-white hover:bg-gray-50 border-gray-200": !isDisabled && !isSelected && !isBooked,
                       }
                     )}
                     title={
                       isBooked
                         ? "Already booked"
                         : isDisabled
                         ? "Unavailable"
                         : `${slot.timeLabel} - ${format(slot.end, "HH:mm")}`
                     }
                   >
                     {slot.timeLabel}
                   </button>
                 )
               })}
            </div>
            
                         {selectedSlotArray && selectedSlotArray.length > 0 && (
               <div className="mt-2 flex gap-2">
                 <Button 
                   size="sm" 
                   onClick={() => handleBook(equipment)}
                   className="flex-1"
                 >
                   Book {selectedSlotArray.length} slot{selectedSlotArray.length > 1 ? 's' : ''} ({selectedSlotArray.length * 60} min)
                 </Button>
               </div>
             )}
          </div>
        </div>
      </Card>
    )
  }

  const renderStudioItem = (studio: Studio) => {
    const itemId = `Studio-${studio.id}`
    const selectedSlotArray = selectedSlots[itemId] || []

    return (
      <Card key={itemId} className="p-4">
        <div className="flex gap-4">
          {/* Left side - Studio info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{studio.name}</h3>
                {studio.description && (
                  <p className="text-sm text-muted-foreground">{studio.description}</p>
                )}
              </div>
              <Badge variant={studio.isActive ? "default" : "secondary"}>
                {studio.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {studio.location}
              </p>
              <p className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Capacity: {studio.capacity} people
              </p>
            </div>
          </div>

          {/* Right side - Time slots */}
          <div className="flex-1">
            <div className="grid grid-cols-7 gap-1">
                             {timeSlots.map((slot, index) => {
                 const isBooked = isSlotBooked(studio, slot)
                 const isSelected = selectedSlotArray?.some(s => s.start.getTime() === slot.start.getTime())
                 const isDisabled = !studio.isActive || slot.isPast || isBooked

                 return (
                   <button
                     key={index}
                     onClick={() => !isDisabled && handleSlotClick(itemId, slot)}
                     disabled={isDisabled}
                     className={cn(
                       "p-2 text-xs border rounded transition-colors",
                       {
                         // Booked slots should be red, even if disabled
                         "bg-red-100 text-red-600 border-red-200 cursor-not-allowed": isBooked,
                         // Selected slots (blue) take precedence over other states
                         "bg-blue-500 text-white border-blue-600": isSelected && !isBooked,
                         // Disabled but not booked (gray)
                         "bg-gray-100 text-gray-400 cursor-not-allowed": isDisabled && !isBooked,
                         // Available slots (white)
                         "bg-white hover:bg-gray-50 border-gray-200": !isDisabled && !isSelected && !isBooked,
                       }
                     )}
                     title={
                       isBooked
                         ? "Already booked"
                         : isDisabled
                         ? "Unavailable"
                         : `${slot.timeLabel} - ${format(slot.end, "HH:mm")}`
                     }
                   >
                     {slot.timeLabel}
                   </button>
                 )
               })}
            </div>
            
                         {selectedSlotArray && selectedSlotArray.length > 0 && (
               <div className="mt-2 flex gap-2">
                 <Button 
                   size="sm" 
                   onClick={() => handleBook(studio)}
                   className="flex-1"
                 >
                   Book {selectedSlotArray.length} slot{selectedSlotArray.length > 1 ? 's' : ''} ({selectedSlotArray.length * 60} min)
                 </Button>
               </div>
             )}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>Available slots for {format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
      </div>

      {/* Equipment Section */}
      {equipment.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Equipment
          </h2>
          <div className="space-y-3">
            {equipment.map(renderEquipmentItem)}
          </div>
        </div>
      )}

      {/* Studios Section */}
      {studios.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Studios
          </h2>
          <div className="space-y-3">
            {studios.map(renderStudioItem)}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-4 pt-4 border-t">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
          Available
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          Selected
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
          Booked
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-100 rounded"></div>
          Unavailable
        </div>
      </div>
    </div>
  )
}

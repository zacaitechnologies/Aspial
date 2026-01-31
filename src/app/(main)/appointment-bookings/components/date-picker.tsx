"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon } from "lucide-react"
import { formatLocalDate } from "@/lib/date-utils"

interface DatePickerProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({ selectedDate, onDateChange, minDate, maxDate }: DatePickerProps) {
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    if (value) {
      const date = new Date(value)
      onDateChange(date)
    } else {
      // If no date is selected, default to today
      onDateChange(new Date())
    }
  }

  const getMinDate = () => {
    const today = new Date()
    const min = minDate || today
    return min > today ? formatLocalDate(min) : formatLocalDate(today)
  }

  const getMaxDate = () => {
    if (!maxDate) return undefined
    return formatLocalDate(maxDate)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="date-picker" className="flex items-center gap-2">
        <CalendarIcon className="w-4 h-4" />
        Select Date
      </Label>
      <Input
        id="date-picker"
        type="date"
        value={selectedDate ? formatLocalDate(selectedDate) : ''}
        onChange={handleDateChange}
        min={getMinDate()}
        max={getMaxDate()}
        className="w-full bg-background border-2 border-accent"
        placeholder="Select a date"
      />
    </div>
  )
}

"use client"

import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarView, getPreviousWeek, getNextWeek, getPreviousDay, getNextDay, formatDateRange, getWeekStart, getWeekEnd } from "../utils/calendar-utils"
import { useState } from "react"

interface DatePickerProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  viewMode?: CalendarView
}

export function DatePicker({ currentDate, onDateChange, viewMode = 'month' }: DatePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const navigateMonth = (direction: "prev" | "next") => {
    const currentDay = currentDate.getDate()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    let targetMonth, targetYear
    
    if (direction === "prev") {
      if (currentMonth === 0) {
        targetMonth = 11
        targetYear = currentYear - 1
      } else {
        targetMonth = currentMonth - 1
        targetYear = currentYear
      }
    } else {
      if (currentMonth === 11) {
        targetMonth = 0
        targetYear = currentYear + 1
      } else {
        targetMonth = currentMonth + 1
        targetYear = currentYear
      }
    }
    
    // Create new date with day 1 to avoid rollover issues
    const newDate = new Date(targetYear, targetMonth, 1)
    
    // Calculate the last day of the target month
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
    
    // Set the appropriate day (either the same day or the last day of the month)
    const targetDay = Math.min(currentDay, daysInTargetMonth)
    newDate.setDate(targetDay)
    
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const navigate = (direction: "prev" | "next") => {
    if (viewMode === 'week') {
      onDateChange(direction === "prev" ? getPreviousWeek(currentDate) : getNextWeek(currentDate))
    } else if (viewMode === 'day') {
      onDateChange(direction === "prev" ? getPreviousDay(currentDate) : getNextDay(currentDate))
    } else {
      navigateMonth(direction)
    }
  }

  const getDisplayText = () => {
    if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate)
      const weekEnd = getWeekEnd(currentDate)
      return formatDateRange(weekStart, weekEnd)
    } else if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } else {
      return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    }
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date)
      setCalendarOpen(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("prev")}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal min-w-[240px]"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getDisplayText()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={handleCalendarSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={goToToday}
      >
        Today
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("next")}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
} 
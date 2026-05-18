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
    <div className="flex w-full min-w-0 items-center gap-1 sm:gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("prev")}
        className="shrink-0 px-2 sm:px-3"
        aria-label="Previous"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-0 flex-1">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full min-w-0 justify-start px-2 text-left font-normal sm:px-3"
            >
              <CalendarIcon className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
              <span className="truncate">{getDisplayText()}</span>
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
        className="shrink-0 px-2 text-xs sm:px-3 sm:text-sm"
      >
        Today
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("next")}
        className="shrink-0 px-2 sm:px-3"
        aria-label="Next"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

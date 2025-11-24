"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DatePickerProps {
  currentDate: Date
  onDateChange: (date: Date) => void
}

export function DatePicker({ currentDate, onDateChange }: DatePickerProps) {
  const currentYear = new Date().getFullYear()
  // Generate years from 2020 to 5 years in the future
  const startYear = 2020
  const endYear = currentYear + 5
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i)
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const handleYearChange = (year: string) => {
    const newDate = new Date(currentDate)
    newDate.setFullYear(parseInt(year))
    onDateChange(newDate)
  }

  const handleMonthChange = (month: string) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(months.indexOf(month))
    onDateChange(newDate)
  }

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

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigateMonth("prev")}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Select
          value={months[currentDate.getMonth()]}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month, index) => (
              <SelectItem key={month} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentDate.getFullYear().toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        onClick={() => navigateMonth("next")}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
} 
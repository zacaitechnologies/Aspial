"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { LeaveApplicationDTO } from "../types"
import { isMalaysiaNonWorkingDay, leaveTypeColorMap, leaveTypeOptions } from "../types"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LeaveCalendarProps {
  applications: LeaveApplicationDTO[]
  showEmployeeName?: boolean
}

export default function LeaveCalendar({
  applications,
  showEmployeeName = false,
}: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [pickerOpen, setPickerOpen] = useState(false)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const approvedLeaves = useMemo(
    () =>
      applications.filter(
        (a) => a.status === "APPROVED" || a.status === "PENDING"
      ),
    [applications]
  )

  function getLeavesForDay(day: Date) {
    return approvedLeaves.filter((leave) => {
      const start = new Date(leave.startDate)
      const end = new Date(leave.endDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return day >= start && day <= end
    })
  }

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const getLabel = (type: string) =>
    leaveTypeOptions.find((o) => o.value === type)?.label ?? type

  return (
    <Card className="shadow-sm border bg-card">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            Leave Calendar
          </CardTitle>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-border"
                >
                  <CalendarDays className="h-4 w-4" />
                  Go to month
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  selected={currentMonth}
                  onSelect={(d) => {
                    if (d) {
                      setCurrentMonth(startOfMonth(d))
                      setPickerOpen(false)
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-1 rounded-md border border-border bg-background px-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[130px] text-center text-foreground tabular-nums">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {weekDays.map((day) => (
            <div
              key={day}
              className="bg-muted/50 p-2 text-center text-xs font-semibold text-foreground"
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day) => {
            const dayLeaves = getLeavesForDay(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isToday = isSameDay(day, new Date())
            const isSundayOff = isMalaysiaNonWorkingDay(day)

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "bg-background p-1 min-h-[64px] sm:min-h-[72px]",
                  !isCurrentMonth && "bg-muted/30",
                  isSundayOff && isCurrentMonth && "bg-muted/20"
                )}
              >
                <div
                  className={cn(
                    "text-xs mb-0.5 font-medium tabular-nums",
                    isToday &&
                      "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-semibold",
                    !isToday && !isCurrentMonth && "text-muted-foreground",
                    !isToday && isCurrentMonth && "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayLeaves.slice(0, 3).map((leave) => {
                    const chipClass =
                      leaveTypeColorMap[leave.leaveType] ??
                      "bg-muted text-foreground border border-border"
                    return (
                      <TooltipProvider key={leave.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded-sm truncate cursor-default font-medium border",
                                chipClass,
                                leave.status === "PENDING" && "opacity-80 ring-1 ring-foreground/20"
                              )}
                            >
                              {showEmployeeName
                                ? `${leave.user.firstName} ${leave.user.lastName.charAt(0)}.`
                                : getLabel(leave.leaveType)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {showEmployeeName &&
                                `${leave.user.firstName} ${leave.user.lastName} - `}
                              {getLabel(leave.leaveType)}
                              {leave.status === "PENDING" && " (Pending)"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })}
                  {dayLeaves.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1 font-medium">
                      +{dayLeaves.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LeaveApplicationDTO } from "../types"
import { leaveTypeColorMap, leaveTypeOptions } from "../types"
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
  isWeekend,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
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
  const [currentMonth, setCurrentMonth] = useState(new Date())

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
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Leave Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-muted rounded-md overflow-hidden">
          {/* Header */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="bg-background p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {/* Days */}
          {calendarDays.map((day) => {
            const dayLeaves = getLeavesForDay(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isToday = isSameDay(day, new Date())
            const isWeekendDay = isWeekend(day)

            return (
              <div
                key={day.toISOString()}
                className={`bg-background p-1 min-h-[60px] ${
                  !isCurrentMonth ? "opacity-30" : ""
                } ${isWeekendDay ? "bg-muted/30" : ""}`}
              >
                <div
                  className={`text-xs mb-0.5 ${
                    isToday
                      ? "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center"
                      : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayLeaves.slice(0, 3).map((leave) => {
                    const bgColor =
                      leaveTypeColorMap[leave.leaveType]?.split(" ")[0] ?? "bg-gray-100"
                    const textColor =
                      leaveTypeColorMap[leave.leaveType]?.split(" ")[1] ?? "text-gray-800"
                    return (
                      <TooltipProvider key={leave.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`text-[10px] px-1 py-0.5 rounded truncate cursor-default ${bgColor} ${textColor} ${
                                leave.status === "PENDING" ? "opacity-60" : ""
                              }`}
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
                    <div className="text-[10px] text-muted-foreground px-1">
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

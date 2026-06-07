"use client"

import { useState, useMemo, useCallback, useEffect, type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DatePicker } from "@/app/(main)/calendar/components/DatePicker"
import {
  CalendarTooltip,
  CalendarEventTooltipProvider,
} from "@/app/(main)/calendar/components/CalendarEventTooltip"
import { calendarLeaveSurfaceClass } from "@/app/(main)/calendar/utils/event-surface-styles"
import type { LeaveApplicationDTO, LeaveTypeDTO } from "../types"
import { formatLeaveTypeName } from "../types"
import LeaveDayPopover from "./LeaveDayPopover"
import { LeaveTooltipContent } from "./LeaveTooltipContent"
import { parseLocalDateString, toBusinessTZParts } from "@/lib/date-utils"
import { getMalaysiaDateStr } from "@/lib/malaysia-time"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface LeaveCalendarProps {
  applications: LeaveApplicationDTO[]
  showEmployeeName?: boolean
  leaveTypes?: LeaveTypeDTO[]
}

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const MAX_VISIBLE_LEAVES = 2

/** Build YYYY-MM-DD for a grid cell from calendar year/month/day (no local TZ shift). */
function formatCalendarDayStr(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
}

export default function LeaveCalendar({
  applications,
  showEmployeeName = false,
  leaveTypes,
}: LeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() =>
    parseLocalDateString(getMalaysiaDateStr())
  )
  const [todayStr, setTodayStr] = useState<string | null>(null)

  useEffect(() => {
    setTodayStr(getMalaysiaDateStr())
  }, [])

  const approvedLeaves = useMemo(
    () =>
      applications.filter(
        (a) => a.status === "APPROVED" || a.status === "PENDING"
      ),
    [applications]
  )

  const getLeavesForDay = useCallback(
    (dayStr: string) => {
      return approvedLeaves
        .filter((leave) => {
          const startStr = toBusinessTZParts(new Date(leave.startDate)).dateStr
          const endStr = toBusinessTZParts(new Date(leave.endDate)).dateStr
          return dayStr >= startStr && dayStr <= endStr
        })
        .sort((a, b) => a.id - b.id)
    },
    [approvedLeaves]
  )

  const getLabel = (type: string) => formatLeaveTypeName(type, leaveTypes)

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const year = currentDate.getFullYear()
    const monthIndex = currentDate.getMonth()
    const cells: ReactNode[] = []

    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div
          key={`pad-${i}`}
          className="cal-day-cell cal-day-cell--empty"
          aria-hidden
        />
      )
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = formatCalendarDayStr(year, monthIndex, day)
      const date = parseLocalDateString(dayStr)
      const isToday = todayStr !== null && dayStr === todayStr
      const dayLeaves = getLeavesForDay(dayStr)
      const hasLeaves = dayLeaves.length > 0

      const cellContent = (
        <>
          <div
            className={cn(
              "cal-day-number mb-1 inline-flex items-center justify-center",
              isToday
                ? "cal-day-number--today h-8 w-8 text-base font-extrabold text-foreground sm:text-lg"
                : "h-6 w-6 text-xs font-semibold text-foreground sm:text-sm"
            )}
          >
            {day}
          </div>
          {hasLeaves && (
            <div className="mt-1 space-y-0.5">
              {dayLeaves.slice(0, MAX_VISIBLE_LEAVES).map((leave) => (
                <CalendarTooltip
                  key={leave.id}
                  side="top"
                  align="start"
                  content={
                    <LeaveTooltipContent
                      leave={leave}
                      showEmployeeName={showEmployeeName}
                      leaveTypes={leaveTypes}
                    />
                  }
                >
                  <div
                    role="presentation"
                    className={cn(
                      "w-full truncate rounded-sm px-1 py-0.5 text-left text-[10px] font-medium transition-shadow hover:shadow-sm hover:brightness-[0.98]",
                      calendarLeaveSurfaceClass(leave.status)
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {showEmployeeName
                      ? `${leave.user.firstName} ${leave.user.lastName.charAt(0)}.`
                      : getLabel(leave.leaveType)}
                  </div>
                </CalendarTooltip>
              ))}
              {dayLeaves.length > MAX_VISIBLE_LEAVES && (
                <div className="px-1 text-[10px] font-medium text-muted-foreground">
                  +{dayLeaves.length - MAX_VISIBLE_LEAVES} more
                </div>
              )}
            </div>
          )}
        </>
      )

      if (hasLeaves) {
        cells.push(
          <Popover key={dayStr}>
            <PopoverTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                aria-label={`View leaves on ${format(date, "PPP")}`}
                className={cn(
                  "cal-day-cell relative min-w-0 cursor-pointer overflow-hidden p-1 text-left sm:p-1.5",
                  isToday && "cal-day-cell--today"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                }}
              >
                {cellContent}
              </div>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-auto border-border bg-card p-0 shadow-md"
            >
              <LeaveDayPopover
                date={date}
                leaves={dayLeaves}
                showEmployeeName={showEmployeeName}
                leaveTypes={leaveTypes}
              />
            </PopoverContent>
          </Popover>
        )
      } else {
        cells.push(
          <div
            key={dayStr}
            className={cn(
              "cal-day-cell relative min-w-0 overflow-hidden p-1 sm:p-1.5",
              isToday && "cal-day-cell--today"
            )}
          >
            {cellContent}
          </div>
        )
      }
    }

    return cells
  }

  return (
    <CalendarEventTooltipProvider>
    <div className="calendar-page">
      <Card className="cal-toolbar-card overflow-hidden !gap-0 !border-0 !bg-transparent !px-0 !py-0 !shadow-none">
        <div className="cal-toolbar border-b border-border px-0 py-3">
          <div className="flex w-full min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <h2 className="shrink-0 text-base font-semibold text-foreground">
              Leave Calendar
            </h2>
            <div className="min-w-0 w-full xl:max-w-xl">
              <DatePicker
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                viewMode="month"
              />
            </div>
          </div>
        </div>

        <CardContent className="!bg-transparent !p-0 pt-3">
          <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-1.5">
            {WEEKDAY_HEADERS.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-bold text-primary"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="cal-month-grid relative grid grid-cols-7 gap-1 sm:gap-1.5">
            {renderCalendarDays()}
          </div>
        </CardContent>
      </Card>
    </div>
    </CalendarEventTooltipProvider>
  )
}

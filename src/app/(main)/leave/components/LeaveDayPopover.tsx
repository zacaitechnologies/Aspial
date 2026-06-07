"use client"

import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { calendarLeaveLegendDotClass } from "@/app/(main)/calendar/utils/event-surface-styles"
import type { LeaveApplicationDTO, LeaveTypeDTO } from "../types"
import { formatLeaveTypeName } from "../types"
import { formatMYTDateForDisplay, toBusinessTZParts } from "@/lib/date-utils"

interface LeaveDayPopoverProps {
  date: Date
  leaves: LeaveApplicationDTO[]
  showEmployeeName: boolean
  leaveTypes?: LeaveTypeDTO[]
}

const HALF_DAY_PILL: Record<string, string> = {
  FIRST_HALF: "AM",
  SECOND_HALF: "PM",
}

export default function LeaveDayPopover({
  date,
  leaves,
  showEmployeeName,
  leaveTypes,
}: LeaveDayPopoverProps) {
  return (
    <div className="w-[320px] max-h-[60vh] overflow-y-auto rounded-md bg-card sm:w-[380px]">
      <div className="border-b border-border bg-card px-3 py-2">
        <p className="text-sm font-semibold text-foreground">
          {format(date, "EEEE, d MMMM yyyy")}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {leaves.length} {leaves.length === 1 ? "leave" : "leaves"} on this day
        </p>
      </div>

      <ul className="divide-y divide-border bg-card">
        {leaves.map((leave) => {
          const startStr = toBusinessTZParts(leave.startDate).dateStr
          const endStr = toBusinessTZParts(leave.endDate).dateStr
          const isMultiDay = startStr !== endStr
          const halfDayPill = HALF_DAY_PILL[leave.halfDay]
          const typeLabel = formatLeaveTypeName(leave.leaveType, leaveTypes)
          const statusLabel =
            leave.status.charAt(0) + leave.status.slice(1).toLowerCase()

          return (
            <li key={leave.id} className="space-y-1.5 bg-card px-3 py-2.5">
              {showEmployeeName && (
                <p className="text-sm font-semibold text-foreground">
                  {leave.user.firstName} {leave.user.lastName}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    calendarLeaveLegendDotClass(leave.status)
                  )}
                  aria-hidden
                />
                <span className="font-medium text-foreground">{typeLabel}</span>
                <span className="text-muted-foreground">·</span>
                <span className="capitalize text-muted-foreground">{statusLabel}</span>
                {halfDayPill && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                      {halfDayPill}
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {isMultiDay
                  ? `${formatMYTDateForDisplay(leave.startDate)} → ${formatMYTDateForDisplay(leave.endDate)}`
                  : formatMYTDateForDisplay(leave.startDate)}
                {" · "}
                {leave.totalDays} {leave.totalDays === 1 ? "day" : "days"}
              </p>

              {leave.reason && (
                <p className="whitespace-pre-wrap break-words text-xs text-foreground">
                  {leave.reason}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

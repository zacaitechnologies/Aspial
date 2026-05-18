"use client"

import { format } from "date-fns"
import { LeaveStatusBadge, LeaveTypeBadge } from "./LeaveStatusBadge"
import type { LeaveApplicationDTO, LeaveTypeDTO } from "../types"
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
    <div className="w-[320px] sm:w-[380px] max-h-[60vh] overflow-y-auto">
      <div className="px-3 py-2 border-b bg-muted/40">
        <p className="text-sm font-semibold text-foreground">
          {format(date, "EEEE, d MMMM yyyy")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {leaves.length} {leaves.length === 1 ? "leave" : "leaves"} on this day
        </p>
      </div>

      <ul className="divide-y">
        {leaves.map((leave) => {
          const startStr = toBusinessTZParts(leave.startDate).dateStr
          const endStr = toBusinessTZParts(leave.endDate).dateStr
          const isMultiDay = startStr !== endStr
          const halfDayPill = HALF_DAY_PILL[leave.halfDay]

          return (
            <li key={leave.id} className="px-3 py-2.5 space-y-1.5">
              {showEmployeeName && (
                <p className="text-sm font-semibold text-foreground">
                  {leave.user.firstName} {leave.user.lastName}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <LeaveTypeBadge type={leave.leaveType} types={leaveTypes} />
                <LeaveStatusBadge status={leave.status} />
                {halfDayPill && (
                  <span className="inline-flex items-center rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                    {halfDayPill}
                  </span>
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
                <p className="text-xs text-foreground whitespace-pre-wrap break-words">
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

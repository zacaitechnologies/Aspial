import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { calendarLeaveLegendDotClass } from "@/app/(main)/calendar/utils/event-surface-styles"
import type { LeaveApplicationDTO, LeaveTypeDTO } from "../types"
import { formatLeaveTypeName } from "../types"
import { formatMYTDateForDisplay, toBusinessTZParts } from "@/lib/date-utils"

interface LeaveTooltipContentProps {
  leave: LeaveApplicationDTO
  showEmployeeName?: boolean
  leaveTypes?: LeaveTypeDTO[]
}

const HALF_DAY_LABEL: Record<string, string> = {
  FIRST_HALF: "First half (AM)",
  SECOND_HALF: "Second half (PM)",
}

export function LeaveTooltipContent({
  leave,
  showEmployeeName = false,
  leaveTypes,
}: LeaveTooltipContentProps) {
  const typeLabel = formatLeaveTypeName(leave.leaveType, leaveTypes)
  const startStr = toBusinessTZParts(leave.startDate).dateStr
  const endStr = toBusinessTZParts(leave.endDate).dateStr
  const isMultiDay = startStr !== endStr
  const statusLabel = leave.status.charAt(0) + leave.status.slice(1).toLowerCase()
  const halfDayLabel = HALF_DAY_LABEL[leave.halfDay]

  const dateRange = isMultiDay
    ? `${formatMYTDateForDisplay(leave.startDate)} – ${formatMYTDateForDisplay(leave.endDate)}`
    : formatMYTDateForDisplay(leave.startDate)

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full",
            calendarLeaveLegendDotClass(leave.status)
          )}
          aria-hidden
        />
        <p className="font-semibold leading-snug">
          {showEmployeeName
            ? `${leave.user.firstName} ${leave.user.lastName}`
            : typeLabel}
        </p>
      </div>
      {showEmployeeName && (
        <p className="text-muted-foreground">{typeLabel}</p>
      )}
      <div className="flex items-center gap-1.5">
        <CalendarDays className="h-3 w-3 shrink-0 opacity-70" />
        <span>
          {dateRange}
          {" · "}
          {leave.totalDays} {leave.totalDays === 1 ? "day" : "days"}
        </span>
      </div>
      <p className="capitalize text-muted-foreground">
        {statusLabel}
        {halfDayLabel ? ` · ${halfDayLabel}` : ""}
      </p>
      {leave.reason && (
        <p className="line-clamp-3 text-muted-foreground">{leave.reason}</p>
      )}
    </div>
  )
}

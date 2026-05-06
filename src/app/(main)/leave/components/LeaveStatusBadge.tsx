"use client"

import { Badge } from "@/components/ui/badge"
import { leaveStatusColorMap, leaveTypeChipClasses, formatLeaveTypeName, type LeaveTypeDTO } from "../types"

export function LeaveStatusBadge({ status }: { status: string }) {
  const colorClass = leaveStatusColorMap[status] ?? "bg-muted text-foreground"
  const label = status.charAt(0) + status.slice(1).toLowerCase()
  return (
    <Badge variant="outline" className={`${colorClass} border-0 font-medium`}>
      {label}
    </Badge>
  )
}

interface LeaveTypeBadgeProps {
  /** Leave-type code (FK to leave_type.code), e.g. "ANNUAL". */
  type: string
  /** Optional list of all known leave types so we can show the human-readable name. */
  types?: Pick<LeaveTypeDTO, "code" | "name">[]
}

export function LeaveTypeBadge({ type, types }: LeaveTypeBadgeProps) {
  const colorClass = leaveTypeChipClasses(type)
  const label = formatLeaveTypeName(type, types)
  return (
    <Badge variant="outline" className={`${colorClass} border font-medium`}>
      {label}
    </Badge>
  )
}

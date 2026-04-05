"use client"

import { Badge } from "@/components/ui/badge"
import { leaveStatusColorMap, leaveTypeColorMap, leaveTypeOptions } from "../types"

export function LeaveStatusBadge({ status }: { status: string }) {
  const colorClass = leaveStatusColorMap[status] ?? "bg-muted text-foreground"
  const label = status.charAt(0) + status.slice(1).toLowerCase()
  return (
    <Badge variant="outline" className={`${colorClass} border-0 font-medium`}>
      {label}
    </Badge>
  )
}

export function LeaveTypeBadge({ type }: { type: string }) {
  const colorClass = leaveTypeColorMap[type] ?? "bg-muted text-foreground border border-border"
  const label =
    leaveTypeOptions.find((o) => o.value === type)?.label ??
    type
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ")
  return (
    <Badge variant="outline" className={`${colorClass} border font-medium`}>
      {label}
    </Badge>
  )
}

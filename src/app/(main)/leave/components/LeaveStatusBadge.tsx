"use client"

import { Badge } from "@/components/ui/badge"
import { leaveStatusColorMap, leaveTypeColorMap } from "../types"

export function LeaveStatusBadge({ status }: { status: string }) {
  const colorClass = leaveStatusColorMap[status] ?? "bg-gray-100 text-gray-800"
  const label = status.charAt(0) + status.slice(1).toLowerCase()
  return (
    <Badge variant="outline" className={`${colorClass} border-0 font-medium`}>
      {label}
    </Badge>
  )
}

export function LeaveTypeBadge({ type }: { type: string }) {
  const colorClass = leaveTypeColorMap[type] ?? "bg-gray-100 text-gray-800"
  const label = type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ")
  return (
    <Badge variant="outline" className={`${colorClass} border-0 font-medium`}>
      {label}
    </Badge>
  )
}

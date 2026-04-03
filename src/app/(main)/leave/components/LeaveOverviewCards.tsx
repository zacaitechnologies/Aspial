"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle, XCircle, CalendarDays } from "lucide-react"
import type { LeaveStats } from "../types"

interface LeaveOverviewCardsProps {
  stats: LeaveStats
}

export default function LeaveOverviewCards({ stats }: LeaveOverviewCardsProps) {
  const items = [
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "On Leave Today",
      value: stats.onLeaveToday,
      icon: CalendarDays,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.bg}`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

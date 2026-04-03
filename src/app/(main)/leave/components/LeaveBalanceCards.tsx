"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { LeaveBalanceDTO } from "../types"
import { leaveTypeOptions } from "../types"

interface LeaveBalanceCardsProps {
  balances: LeaveBalanceDTO[]
}

export default function LeaveBalanceCards({ balances }: LeaveBalanceCardsProps) {
  const getLabel = (type: string) =>
    leaveTypeOptions.find((o) => o.value === type)?.label ?? type

  // Show main leave types first
  const primaryTypes = ["ANNUAL", "MEDICAL", "EMERGENCY", "UNPAID"]
  const primaryBalances = balances.filter((b) => primaryTypes.includes(b.leaveType))
  const otherBalances = balances.filter((b) => !primaryTypes.includes(b.leaveType))
  const sorted = [...primaryBalances, ...otherBalances]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {sorted.map((b) => (
        <Card key={b.leaveType} className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {getLabel(b.leaveType)}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {b.leaveType === "UNPAID" ? b.used : b.balance}
              </span>
              {b.leaveType !== "UNPAID" && (
                <span className="text-sm text-muted-foreground">/ {b.entitled}</span>
              )}
            </div>
            {b.pending > 0 && (
              <p className="text-xs text-yellow-600 mt-1">{b.pending} pending</p>
            )}
            {b.leaveType === "UNPAID" && (
              <p className="text-xs text-muted-foreground mt-1">days taken</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

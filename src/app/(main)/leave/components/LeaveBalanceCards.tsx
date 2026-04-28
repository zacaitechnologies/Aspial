"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { LeaveBalanceDTO } from "../types"
import PaidLeaveRing from "./PaidLeaveRing"

interface LeaveBalanceCardsProps {
  balances: LeaveBalanceDTO[]
}

export default function LeaveBalanceCards({ balances }: LeaveBalanceCardsProps) {
  const paid = balances.find((b) => b.leaveType === "PAID")
  const unpaid = balances.find((b) => b.leaveType === "UNPAID")

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
      <PaidLeaveRing paidBalance={paid} />
      <Card className="border bg-card shadow-sm flex flex-col justify-center">
        <CardContent className="p-6 sm:p-8">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Unpaid leave
          </p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {unpaid ? (unpaid.used % 1 === 0 ? unpaid.used : unpaid.used.toFixed(1)) : 0}
            <span className="text-sm font-normal text-muted-foreground ml-2">days taken</span>
          </p>
          {unpaid && unpaid.pending > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              {unpaid.pending} day(s) pending approval
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Unpaid leave does not deduct from your paid entitlement.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

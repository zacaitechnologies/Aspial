"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { LeaveBalanceDTO, LeaveTypeDTO } from "../types"
import PaidLeaveRing from "./PaidLeaveRing"

interface LeaveBalanceCardsProps {
  balances: LeaveBalanceDTO[]
  /** Dynamic list of leave types — drives which balances to surface and their labels. */
  leaveTypes?: LeaveTypeDTO[]
}

export default function LeaveBalanceCards({ balances, leaveTypes }: LeaveBalanceCardsProps) {
  // Pick a primary "paid" type to feature in the ring. Annual is the default;
  // fall back to any non-unpaid type so the UI keeps working as types are added.
  const annualBalance = balances.find((b) => b.leaveType === "ANNUAL")
  const ringBalance =
    annualBalance ??
    balances.find((b) => {
      const meta = leaveTypes?.find((t) => t.code === b.leaveType)
      return meta && !meta.isUnpaid
    })

  const ringLabel =
    leaveTypes?.find((t) => t.code === (ringBalance?.leaveType ?? "ANNUAL"))?.name ??
    "Annual leave"

  // Sum up usage for unpaid leave types so the second card stays a single tile.
  const unpaidBalances = balances.filter((b) => {
    const meta = leaveTypes?.find((t) => t.code === b.leaveType)
    return meta?.isUnpaid ?? b.leaveType === "UNPAID"
  })
  const unpaidUsed = unpaidBalances.reduce((s, b) => s + b.used, 0)
  const unpaidPending = unpaidBalances.reduce((s, b) => s + b.pending, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
      <PaidLeaveRing paidBalance={ringBalance} label={ringLabel} />
      <Card className="border bg-card shadow-sm flex flex-col justify-center">
        <CardContent className="p-6 sm:p-8">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Unpaid leave
          </p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {unpaidUsed % 1 === 0 ? unpaidUsed : unpaidUsed.toFixed(1)}
            <span className="text-sm font-normal text-muted-foreground ml-2">days taken</span>
          </p>
          {unpaidPending > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              {unpaidPending} day(s) pending approval
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

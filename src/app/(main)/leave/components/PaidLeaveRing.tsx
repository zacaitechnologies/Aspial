"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LeaveBalanceDTO } from "../types"

interface PaidLeaveRingProps {
  paidBalance: LeaveBalanceDTO | undefined
  className?: string
}

/**
 * Circular progress for remaining paid leave (balance vs entitled).
 */
export default function PaidLeaveRing({ paidBalance, className }: PaidLeaveRingProps) {
  const entitled = paidBalance?.entitled ?? 14
  const balance = Math.max(0, paidBalance?.balance ?? 0)
  const used = paidBalance?.used ?? 0
  const pending = paidBalance?.pending ?? 0
  const pct = entitled > 0 ? Math.min(100, Math.max(0, (balance / entitled) * 100)) : 0

  const r = 56
  const stroke = 10
  const c = 2 * Math.PI * r
  const dashOffset = c - (pct / 100) * c

  return (
    <Card className={cn("overflow-hidden border bg-card shadow-sm", className)}>
      <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8">
        <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
          Paid leave remaining
        </p>
        <div className="relative h-[140px] w-[140px] shrink-0">
          <svg
            className="h-full w-full -rotate-90"
            viewBox="0 0 140 140"
            aria-hidden
          >
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              className="stroke-muted"
              strokeWidth={stroke}
            />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold tabular-nums text-foreground">
              {balance % 1 === 0 ? balance : balance.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">days left</span>
          </div>
        </div>
        <dl className="mt-6 grid w-full grid-cols-3 gap-2 text-center text-xs sm:text-sm border-t border-border pt-4">
          <div>
            <dt className="text-muted-foreground">Entitled</dt>
            <dd className="font-semibold tabular-nums text-foreground">{entitled}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Used</dt>
            <dd className="font-semibold tabular-nums text-foreground">{used}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pending</dt>
            <dd className="font-semibold tabular-nums text-foreground">{pending}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

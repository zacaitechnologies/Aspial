"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getKpiBand,
  isKpiRedFlag,
  formatPeriod,
  type KpiSection,
} from "../config"

export function BandBadge({ score, className }: { score: number; className?: string }) {
  const band = getKpiBand(score)
  return (
    <Badge variant="outline" className={cn(band.className, className)}>
      {band.label}
    </Badge>
  )
}

export function RedFlagBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-red-300 bg-red-100 text-red-800", className)}>
      <AlertTriangle className="size-3" /> Red flag
    </Badge>
  )
}

export function SectionBadge({ section }: { section: KpiSection }) {
  const isSales = section === "sales"
  return (
    <Badge
      variant="outline"
      className={cn(
        isSales
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-blue-200 bg-blue-50 text-blue-700"
      )}
    >
      {isSales ? "Sales" : "Operations"}
    </Badge>
  )
}

/** Big final-score number coloured by its band, with optional red flag. */
export function ScoreNumber({
  score,
  size = "lg",
}: {
  score: number | null
  size?: "lg" | "md"
}) {
  const flagged = isKpiRedFlag(score)
  const band = typeof score === "number" ? getKpiBand(score) : null
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        size === "lg" ? "text-3xl" : "text-xl",
        flagged ? "text-red-700" : band?.textClassName ?? "text-muted-foreground"
      )}
    >
      {typeof score === "number" ? score : "—"}
    </span>
  )
}

type Period = { year: number; month: number }

export function PeriodSelect({
  value,
  onChange,
  disabled,
}: {
  value: Period
  onChange: (period: Period) => void
  disabled?: boolean
}) {
  const monthValue = `${value.year}-${String(value.month).padStart(2, "0")}`

  function handleValueChange(nextValue: string) {
    const [rawYear, rawMonth] = nextValue.split("-")
    const year = Number(rawYear)
    const month = Number(rawMonth)
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return
    }
    onChange({ year, month })
  }

  return (
    <Input
      disabled={disabled}
      type="month"
      value={monthValue}
      onChange={(e) => handleValueChange(e.target.value)}
      onWheel={(e) => {
        // Prevent wheel from accidentally stepping months and causing jerky scrolling.
        ;(e.currentTarget as HTMLInputElement).blur()
      }}
      className="h-9 w-[12rem] border-2 border-accent bg-card pl-3 pr-10 text-sm [&::-webkit-calendar-picker-indicator]:mr-1 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      aria-label="Select month"
    />
  )
}

export { formatPeriod }

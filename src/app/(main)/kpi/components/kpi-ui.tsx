"use client"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getKpiBand,
  isKpiRedFlag,
  formatPeriod,
  MONTH_NAMES,
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

/** Month/year picker spanning the last `monthsBack` months ending at `anchor`. */
export function PeriodSelect({
  anchor,
  value,
  onChange,
  monthsBack = 12,
  disabled,
}: {
  anchor: Period
  value: Period
  onChange: (period: Period) => void
  monthsBack?: number
  disabled?: boolean
}) {
  const options: Period[] = []
  for (let i = 0; i < monthsBack; i++) {
    // Walk backwards from the anchor month.
    const totalMonths = anchor.year * 12 + (anchor.month - 1) - i
    const year = Math.floor(totalMonths / 12)
    const month = (totalMonths % 12) + 1
    options.push({ year, month })
  }
  // Make sure the current selection is always selectable, even if outside the window.
  if (!options.some((o) => o.year === value.year && o.month === value.month)) {
    options.unshift(value)
  }

  return (
    <Select
      disabled={disabled}
      value={`${value.year}-${value.month}`}
      onValueChange={(v) => {
        const [y, m] = v.split("-").map(Number)
        onChange({ year: y, month: m })
      }}
    >
      <SelectTrigger className="h-9 w-[11rem] bg-card border-2 border-accent text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
            {MONTH_NAMES[o.month - 1]} {o.year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { formatPeriod }

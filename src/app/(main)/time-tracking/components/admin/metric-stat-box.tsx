import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type MetricStatTone = "blue" | "amber" | "green" | "violet" | "slate"

const toneStyles: Record<
  MetricStatTone,
  { box: string; label: string; value: string; valueLg: string }
> = {
  blue: {
    box: "border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50",
    label: "text-gray-600",
    value: "text-blue-900",
    valueLg: "text-lg font-bold tabular-nums text-blue-900",
  },
  amber: {
    box: "border-amber-200 bg-linear-to-br from-amber-50 to-orange-50",
    label: "text-gray-600",
    value: "text-orange-950",
    valueLg: "text-lg font-bold tabular-nums text-orange-950",
  },
  green: {
    box: "border-green-200 bg-linear-to-br from-green-50 to-emerald-50",
    label: "text-gray-600",
    value: "text-green-900",
    valueLg: "text-lg font-bold tabular-nums text-green-900",
  },
  violet: {
    box: "border-violet-200 bg-linear-to-br from-violet-50 to-purple-50",
    label: "text-gray-600",
    value: "text-violet-900",
    valueLg: "text-lg font-bold tabular-nums text-violet-900",
  },
  slate: {
    box: "border-slate-200 bg-linear-to-br from-slate-50 to-gray-50",
    label: "text-gray-600",
    value: "text-slate-900",
    valueLg: "text-xs font-semibold text-slate-900",
  },
}

interface MetricStatBoxProps {
  tone: MetricStatTone
  label: string
  value: ReactNode
  icon?: React.ReactNode
  largeValue?: boolean
  className?: string
}

export function MetricStatBox({
  tone,
  label,
  value,
  icon,
  largeValue = false,
  className,
}: MetricStatBoxProps) {
  const styles = toneStyles[tone]

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-center min-w-[4.5rem]",
        styles.box,
        className,
      )}
    >
      <p
        className={cn(
          "mb-0.5 text-[10px] font-medium uppercase tracking-wide",
          styles.label,
          icon && "flex items-center justify-center gap-1",
        )}
      >
        {icon}
        {label}
      </p>
      <p className={largeValue ? styles.valueLg : cn("text-base font-bold tabular-nums", styles.value)}>
        {value}
      </p>
    </div>
  )
}

export function MetricStatBadge({
  tone,
  children,
  className,
}: {
  tone: MetricStatTone
  children: ReactNode
  className?: string
}) {
  const styles = toneStyles[tone]
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 font-mono text-xs font-bold",
        styles.box,
        styles.value,
        className,
      )}
    >
      {children}
    </span>
  )
}

export const dashboardSummaryCardStyles: Record<
  MetricStatTone,
  { card: string; value: string; icon: string }
> = {
  blue: {
    card: "border-2 border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50",
    value: "text-blue-900",
    icon: "bg-blue-100 text-blue-700",
  },
  amber: {
    card: "border-2 border-amber-200 bg-linear-to-br from-amber-50 to-orange-50",
    value: "text-orange-950",
    icon: "bg-amber-100 text-amber-800",
  },
  green: {
    card: "border-2 border-green-200 bg-linear-to-br from-green-50 to-emerald-50",
    value: "text-green-900",
    icon: "bg-green-100 text-green-800",
  },
  violet: {
    card: "border-2 border-violet-200 bg-linear-to-br from-violet-50 to-purple-50",
    value: "text-violet-900",
    icon: "bg-violet-100 text-violet-800",
  },
  slate: {
    card: "border-2 border-slate-200 bg-linear-to-br from-slate-50 to-gray-50",
    value: "text-slate-900",
    icon: "bg-slate-100 text-slate-700",
  },
}

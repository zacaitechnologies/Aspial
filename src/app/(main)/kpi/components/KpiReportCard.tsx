"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarDays, Eye, MoreVertical, Pencil, Plus, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBusinessDateTimeDisplay } from "@/lib/date-utils"
import { formatPeriod, isKpiRedFlag } from "../config"
import type { AdminKpiReportListItem } from "../types"
import { BandBadge, RedFlagBadge, SectionBadge } from "./kpi-ui"

function StatusBadge({ status }: { status: AdminKpiReportListItem["status"] }) {
  if (status === "finalized")
    return (
      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
        Finalized
      </Badge>
    )
  if (status === "draft") return <Badge variant="secondary">Draft</Badge>
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not started
    </Badge>
  )
}

function borderAccentClass(status: AdminKpiReportListItem["status"]) {
  if (status === "finalized") return "border-l-emerald-500"
  if (status === "draft") return "border-l-blue-500"
  return "border-l-border"
}

export function KpiReportCard({
  row,
  onView,
  onRate,
}: {
  row: AdminKpiReportListItem
  onView: (employeeId: string, year: number, month: number) => void
  onRate: (employeeId: string, year: number, month: number) => void
}) {
  const isFinalized = row.status === "finalized"
  const needsRating = row.status === "not_started"

  return (
    <Card
      className={cn(
        "cursor-pointer border-l-4 py-0",
        borderAccentClass(row.status)
      )}
      onClick={() => onView(row.employeeId, row.year, row.month)}
    >
      <CardContent className="p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
          <div className="min-w-0 flex-1 w-full">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <CardTitle
                className={cn(
                  "min-w-0 max-w-full truncate text-base font-semibold",
                  isFinalized ? "text-muted-foreground" : "text-foreground"
                )}
                title={row.employeeName}
              >
                {row.employeeName}
              </CardTitle>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <StatusBadge status={row.status} />
                <SectionBadge section={row.section} />
                {row.finalScore != null && <BandBadge score={row.finalScore} />}
                {isKpiRedFlag(row.finalScore) && <RedFlagBadge />}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarDays className="size-3 shrink-0" />
                <span className="font-medium text-foreground">{formatPeriod(row.year, row.month)}</span>
              </div>
              <span className="text-border">•</span>
              <div className="flex items-center gap-1">
                <User className="size-3 shrink-0" />
                <span>{row.section === "sales" ? "Sales" : "Operations"}</span>
              </div>
              {row.createdAt && (
                <>
                  <span className="text-border">•</span>
                  <span>
                    Created{" "}
                    {formatBusinessDateTimeDisplay(new Date(row.createdAt))}
                  </span>
                </>
              )}
            </div>
          </div>

            <div
              className="flex w-full shrink-0 items-center justify-end gap-2 border-t border-border/60 pt-3 sm:w-auto sm:border-t-0 sm:pt-0"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="text-right">
              <div
                className={cn(
                  "rounded border px-2.5 py-1.5 sm:px-3",
                  row.finalScore != null
                    ? isKpiRedFlag(row.finalScore)
                      ? "border-red-200 bg-red-50"
                      : "border-blue-200 bg-blue-50"
                    : "border-border bg-muted/40"
                )}
              >
                <p className="mb-0.5 text-[10px] text-muted-foreground">Score</p>
                <p
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    row.finalScore != null
                      ? isKpiRedFlag(row.finalScore)
                        ? "text-red-900"
                        : "text-blue-900"
                      : "text-muted-foreground"
                  )}
                >
                  {row.finalScore != null ? row.finalScore : "—"}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 hover:bg-accent"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Report actions"
                >
                  <MoreVertical className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onView(row.employeeId, row.year, row.month)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Eye className="mr-2 size-4" />
                  View report
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRate(row.employeeId, row.year, row.month)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {needsRating ? (
                    <>
                      <Plus className="mr-2 size-4" />
                      Start rating
                    </>
                  ) : (
                    <>
                      <Pencil className="mr-2 size-4" />
                      Edit rating
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

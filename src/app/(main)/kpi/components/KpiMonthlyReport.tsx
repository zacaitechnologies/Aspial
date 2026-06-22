"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { KPI_REPLY_LABELS, formatPeriod, isKpiRedFlag } from "../config"
import type { MonthlyReportRow } from "../types"
import { BandBadge, RedFlagBadge, SectionBadge } from "./kpi-ui"

function StatusBadge({ status }: { status: MonthlyReportRow["status"] }) {
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

export function KpiMonthlyReport({
  rows,
  period,
  onOpenEmployee,
}: {
  rows: MonthlyReportRow[]
  period: { year: number; month: number }
  onOpenEmployee: (employeeId: string) => void
}) {
  const finalizedCount = rows.filter((r) => r.status === "finalized").length
  const redFlagCount = rows.filter((r) => isKpiRedFlag(r.finalScore)).length

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <h2 className="text-lg font-semibold text-foreground">Monthly Performance Report</h2>
          <p className="text-sm text-muted-foreground">
            {formatPeriod(period.year, period.month)} · {rows.length} employees · {finalizedCount} finalized
            {redFlagCount > 0 ? ` · ${redFlagCount} red flag${redFlagCount === 1 ? "" : "s"}` : ""}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Final score</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Reply</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.employeeId}
                  className="cursor-pointer"
                  onClick={() => onOpenEmployee(row.employeeId)}
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <SectionBadge section={row.section} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {row.finalScore != null ? row.finalScore : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.finalScore != null ? <BandBadge score={row.finalScore} /> : <span className="text-muted-foreground">—</span>}
                      {isKpiRedFlag(row.finalScore) && <RedFlagBadge />}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.replyChoice ? KPI_REPLY_LABELS[row.replyChoice] : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No employees to display.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

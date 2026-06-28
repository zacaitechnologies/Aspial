"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Lock, Pencil, Plus } from "lucide-react"
import { formatBusinessDateTimeDisplay } from "@/lib/date-utils"
import {
  KPI_REPLY_LABELS,
  KPI_SECTION_CATEGORIES,
  formatPeriod,
  isKpiRedFlag,
  type KpiCategoryKey,
} from "../config"
import type { EmployeeRatingData } from "../types"
import { KpiCategoryCard } from "./KpiCategoryCard"
import { BandBadge, RedFlagBadge, ScoreNumber, SectionBadge } from "./kpi-ui"

export function KpiReportDetailView({
  data,
  period,
  onEdit,
}: {
  data: EmployeeRatingData
  period: { year: number; month: number }
  onEdit: () => void
}) {
  const section = data.section
  const report = data.report
  const finalized = report?.status === "finalized"
  const notStarted = report == null
  const displayScore = report?.finalScore ?? null

  function scoreFor(category: KpiCategoryKey): number | null {
    if (category === "teamwork") return data.teamwork.average
    return report?.scores.find((s) => s.category === category)?.score ?? null
  }

  function commentFor(category: KpiCategoryKey): string {
    return report?.scores.find((s) => s.category === category)?.comment ?? ""
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{data.employeeName}</h2>
              <SectionBadge section={section} />
              {notStarted ? (
                <Badge variant="outline" className="text-muted-foreground">
                  Not started
                </Badge>
              ) : finalized ? (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                  <Lock className="size-3" /> Finalized
                </Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{formatPeriod(period.year, period.month)}</p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Final score</p>
              <ScoreNumber score={displayScore} />
              <span className="ml-1 text-sm text-muted-foreground">/ 100</span>
            </div>
            {displayScore != null && (
              <div className="flex flex-col items-end gap-1">
                <BandBadge score={displayScore} />
                {isKpiRedFlag(displayScore) && <RedFlagBadge />}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {notStarted && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No KPI rating has been submitted for this employee this month yet.
          </CardContent>
        </Card>
      )}

      {finalized && report && (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="space-y-2 py-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-green-800">
              <CheckCircle2 className="size-4" />
              Finalized
              {report.finalizedAt
                ? ` on ${formatBusinessDateTimeDisplay(new Date(report.finalizedAt))}`
                : ""}
              .
            </p>
            {report.replyChoice ? (
              <div className="rounded-md border bg-card p-3">
                <p className="font-medium text-foreground">
                  Employee reply: {KPI_REPLY_LABELS[report.replyChoice]}
                </p>
                {report.replyComment && (
                  <p className="mt-1 text-muted-foreground">“{report.replyComment}”</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Awaiting the employee’s reply.</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {KPI_SECTION_CATEGORIES[section].map((cat) => (
          <KpiCategoryCard
            key={cat}
            section={section}
            category={cat}
            score={scoreFor(cat)}
            comment={commentFor(cat)}
            readOnly
            teamwork={cat === "teamwork" ? data.teamwork : undefined}
            overdueTasks={cat === "deadline_reliability" ? data.overdueTasks : undefined}
          />
        ))}
      </div>

      {report?.overallComment && (
        <Card>
          <CardContent className="space-y-1 py-4">
            <p className="text-sm font-medium text-foreground">Overall manager comments</p>
            <p className="text-sm text-muted-foreground">{report.overallComment}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={onEdit} className="gap-1.5">
          {notStarted ? (
            <>
              <Plus className="size-4" />
              Start rating
            </>
          ) : (
            <>
              <Pencil className="size-4" />
              Edit rating
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

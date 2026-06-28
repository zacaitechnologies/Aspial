"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, ClipboardCheck, FileText, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBusinessDateTimeDisplay } from "@/lib/date-utils"
import {
  KPI_CATEGORY_META,
  KPI_SECTION_CATEGORIES,
  formatPeriod,
  getCategoryWeight,
  isKpiRedFlag,
  type KpiCategoryKey,
} from "../config"
import type { ColleagueToRate, KpiReportDTO } from "../types"
import { BandBadge, PeriodSelect, RedFlagBadge, ScoreNumber, SectionBadge } from "./kpi-ui"
import { KpiReplyCard } from "./KpiReplyCard"
import { PeerTeamworkRating } from "./PeerTeamworkRating"

type Period = { year: number; month: number }

function CategoryBreakdown({ report }: { report: KpiReportDTO }) {
  return (
    <div className="divide-y rounded-lg border">
      {KPI_SECTION_CATEGORIES[report.section].map((cat) => {
        const score = report.scores.find((s) => s.category === cat)?.score ?? null
        const comment = report.scores.find((s) => s.category === cat)?.comment ?? null
        return (
          <div key={cat} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="font-medium text-foreground">{KPI_CATEGORY_META[cat as KpiCategoryKey].label}</span>
              <span className="ml-1 text-xs text-muted-foreground">({getCategoryWeight(report.section, cat)}%)</span>
              {comment && <p className="text-xs text-muted-foreground">“{comment}”</p>}
            </div>
            <span className="shrink-0 tabular-nums font-semibold text-foreground">
              {score != null ? score : "—"}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function reportBorderClass(report: KpiReportDTO) {
  if (!report.replyChoice) return "border-l-amber-500"
  if (isKpiRedFlag(report.finalScore)) return "border-l-red-500"
  return "border-l-emerald-500"
}

function ReportCard({ report, onReplied }: { report: KpiReportDTO; onReplied: (r: KpiReportDTO) => void }) {
  const needsReply = !report.replyChoice

  return (
    <Card className={cn("border-l-4 py-0", reportBorderClass(report))}>
      <CardContent className="space-y-3 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-semibold text-foreground">
                {formatPeriod(report.year, report.month)}
              </CardTitle>
              <SectionBadge section={report.section} />
              {needsReply ? (
                <Badge variant="secondary">Reply needed</Badge>
              ) : (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                  Replied
                </Badge>
              )}
              {report.finalScore != null && <BandBadge score={report.finalScore} />}
              {isKpiRedFlag(report.finalScore) && <RedFlagBadge />}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarDays className="size-3 shrink-0" />
                <span>{report.section === "sales" ? "Sales" : "Operations"}</span>
              </div>
              {report.finalizedAt && (
                <>
                  <span className="text-border">•</span>
                  <span>Finalized {formatBusinessDateTimeDisplay(new Date(report.finalizedAt))}</span>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div
              className={cn(
                "rounded border px-2.5 py-1.5 sm:px-3",
                report.finalScore != null
                  ? isKpiRedFlag(report.finalScore)
                    ? "border-red-200 bg-red-50"
                    : "border-blue-200 bg-blue-50"
                  : "border-border bg-muted/40"
              )}
            >
              <p className="mb-0.5 text-[10px] text-muted-foreground">Score</p>
              <ScoreNumber score={report.finalScore} size="md" />
            </div>
          </div>
        </div>

        <CategoryBreakdown report={report} />
        {report.overallComment && (
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manager comments</p>
            <p className="mt-1 text-foreground">{report.overallComment}</p>
          </div>
        )}
        <KpiReplyCard report={report} onReplied={onReplied} />
      </CardContent>
    </Card>
  )
}

export function KpiEmployeeView({
  reports: initialReports,
  initialPeriod,
  initialColleagues,
}: {
  reports: KpiReportDTO[]
  initialPeriod: Period
  initialColleagues: ColleagueToRate[]
}) {
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [tab, setTab] = useState<"reports" | "teamwork">("reports")
  const [reports, setReports] = useState<KpiReportDTO[]>(initialReports)

  const reportForPeriod = useMemo(
    () => reports.find((r) => r.year === period.year && r.month === period.month) ?? null,
    [reports, period.year, period.month]
  )

  function handleReplied(updated: KpiReportDTO) {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold sm:text-3xl">KPI Performance</h1>
          <p className="text-muted-foreground">
            Review your finalized reports and submit anonymous teamwork ratings for colleagues each month.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Review month</span>
          <PeriodSelect value={period} onChange={setPeriod} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "reports" | "teamwork")} className="w-full">
        <div className="relative">
          <TabsList className="grid w-full grid-cols-2 border border-primary bg-transparent transition-all duration-300 ease-in-out">
            <TabsTrigger
              value="reports"
              className="relative z-10 flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
            >
              <FileText className="size-4" />
              My Reports
            </TabsTrigger>
            <TabsTrigger
              value="teamwork"
              className="relative z-10 flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
            >
              <Users className="size-4" />
              Rate Colleagues
            </TabsTrigger>
          </TabsList>
          <div
            className={`pointer-events-none absolute top-1 z-0 h-[calc(100%-8px)] rounded-md bg-primary transition-all duration-300 ease-in-out ${
              tab === "reports" ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
            }`}
            aria-hidden
          />
        </div>
      </Tabs>

      {tab === "reports" ? (
        reportForPeriod ? (
          <ReportCard report={reportForPeriod} onReplied={handleReplied} />
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <ClipboardCheck className="mx-auto mb-3 size-10 opacity-40" />
              <p>No finalized KPI report for {formatPeriod(period.year, period.month)}.</p>
            </CardContent>
          </Card>
        )
      ) : (
        <PeerTeamworkRating
          period={period}
          initialPeriod={initialPeriod}
          initialColleagues={initialColleagues}
        />
      )}
    </div>
  )
}

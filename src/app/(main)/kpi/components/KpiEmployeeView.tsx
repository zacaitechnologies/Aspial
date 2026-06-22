"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Award, ClipboardCheck } from "lucide-react"
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
import { BandBadge, RedFlagBadge, ScoreNumber, SectionBadge } from "./kpi-ui"
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

function ReportCard({ report, onReplied }: { report: KpiReportDTO; onReplied: (r: KpiReportDTO) => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{formatPeriod(report.year, report.month)}</h3>
          <SectionBadge section={report.section} />
          {!report.replyChoice && <Badge variant="secondary">Reply needed</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <ScoreNumber score={report.finalScore} size="md" />
          <span className="text-xs text-muted-foreground">/ 100</span>
          {report.finalScore != null && <BandBadge score={report.finalScore} />}
          {isKpiRedFlag(report.finalScore) && <RedFlagBadge />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 py-4">
        <CategoryBreakdown report={report} />
        {report.overallComment && (
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manager comments</p>
            <p className="mt-1 text-foreground">{report.overallComment}</p>
          </div>
        )}
        {report.finalizedAt && (
          <p className="text-xs text-muted-foreground">
            Finalized on {formatBusinessDateTimeDisplay(new Date(report.finalizedAt))}
          </p>
        )}
        <KpiReplyCard report={report} onReplied={onReplied} />
      </CardContent>
    </Card>
  )
}

export function KpiEmployeeView({
  reports: initialReports,
  anchor,
  initialPeriod,
  initialColleagues,
}: {
  reports: KpiReportDTO[]
  anchor: Period
  initialPeriod: Period
  initialColleagues: ColleagueToRate[]
}) {
  const [reports, setReports] = useState<KpiReportDTO[]>(initialReports)

  function handleReplied(updated: KpiReportDTO) {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">My KPI</h1>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">My Reports</TabsTrigger>
          <TabsTrigger value="teamwork">Rate Colleagues</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 space-y-3">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <ClipboardCheck className="mx-auto mb-3 size-10 opacity-40" />
                <p>You don’t have any finalized KPI reports yet.</p>
              </CardContent>
            </Card>
          ) : (
            reports.map((r) => <ReportCard key={r.id} report={r} onReplied={handleReplied} />)
          )}
        </TabsContent>

        <TabsContent value="teamwork" className="mt-4">
          <PeerTeamworkRating
            anchor={anchor}
            initialPeriod={initialPeriod}
            initialColleagues={initialColleagues}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

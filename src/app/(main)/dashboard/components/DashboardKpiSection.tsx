"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Users } from "lucide-react"
import {
  BandBadge,
  RedFlagBadge,
  ScoreNumber,
} from "@/app/(main)/kpi/components/kpi-ui"
import { formatPeriod, isKpiRedFlag } from "@/app/(main)/kpi/config"
import { KpiReplyCard } from "@/app/(main)/kpi/components/KpiReplyCard"
import type { KpiReportDTO } from "@/app/(main)/kpi/types"

export function DashboardKpiSection({
  latestReport,
  unratedColleagues,
  period,
}: {
  latestReport: KpiReportDTO | null
  unratedColleagues: number
  period: { year: number; month: number }
}) {
  const [report, setReport] = useState<KpiReportDTO | null>(latestReport)

  if (!report && unratedColleagues === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">My KPI</h2>
      </div>

      {report && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {formatPeriod(report.year, report.month)} report
                </span>
                {!report.replyChoice && <Badge variant="secondary">Reply needed</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <ScoreNumber score={report.finalScore} size="md" />
                <span className="text-xs text-muted-foreground">/ 100</span>
                {report.finalScore != null && <BandBadge score={report.finalScore} />}
                {isKpiRedFlag(report.finalScore) && <RedFlagBadge />}
              </div>
            </div>

            <KpiReplyCard report={report} onReplied={setReport} />

            <Link href="/kpi" className="inline-block text-xs font-medium text-primary hover:underline">
              View full KPI history
            </Link>
          </CardContent>
        </Card>
      )}

      {unratedColleagues > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="flex items-center gap-2 text-sm text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              You have {unratedColleagues} colleague{unratedColleagues === 1 ? "" : "s"} left to rate for{" "}
              {formatPeriod(period.year, period.month)}.
            </p>
            <Link href="/kpi" className="text-sm font-medium text-primary hover:underline">
              Rate now
            </Link>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

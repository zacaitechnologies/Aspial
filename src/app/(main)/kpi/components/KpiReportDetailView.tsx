"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2, Lock, Pencil, Plus, RotateCcw } from "lucide-react"
import { formatBusinessDateTimeDisplay } from "@/lib/date-utils"
import { revertToDraft } from "../actions"
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
  onReverted,
}: {
  data: EmployeeRatingData
  period: { year: number; month: number }
  onEdit: () => void
  onReverted: () => void
}) {
  const { toast } = useToast()
  const section = data.section
  const report = data.report
  const finalized = report?.status === "finalized"
  const notStarted = report == null
  const displayScore = report?.finalScore ?? null

  const [revertOpen, setRevertOpen] = useState(false)
  const [reverting, setReverting] = useState(false)

  async function handleRevert() {
    setReverting(true)
    try {
      await revertToDraft({ employeeId: data.employeeId, year: period.year, month: period.month })
      toast({
        title: "Reverted to draft",
        description: `${data.employeeName}'s KPI is now a draft. Peer ratings have been cleared.`,
      })
      setRevertOpen(false)
      onReverted()
    } catch (e) {
      toast({ title: "Could not revert", description: (e as Error).message, variant: "destructive" })
    } finally {
      setReverting(false)
    }
  }

  function scoreFor(category: KpiCategoryKey): number | null {
    if (category === "teamwork") return data.teamwork.average
    return report?.scores.find((s) => s.category === category)?.score ?? null
  }

  function commentFor(category: KpiCategoryKey): string {
    return report?.scores.find((s) => s.category === category)?.comment ?? ""
  }

  return (
    <div className="space-y-4">
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Final score
              </p>
              <div className="flex items-baseline gap-1">
                <ScoreNumber score={displayScore} />
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
            </div>
            {displayScore != null && (
              <div className="flex flex-col items-end gap-1">
                <BandBadge score={displayScore} />
                {isKpiRedFlag(displayScore) && <RedFlagBadge />}
              </div>
            )}
            {finalized && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-2 border-accent bg-card text-muted-foreground"
                onClick={() => setRevertOpen(true)}
              >
                <RotateCcw className="size-4" />
                Revert to draft
              </Button>
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
        <Card className="gap-0 border-green-200 bg-green-50/40 py-0">
          <CardContent className="space-y-2 py-3 text-sm">
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
                  <p className="mt-1 text-muted-foreground">"{report.replyComment}"</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Awaiting the employee's reply.</p>
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

      <div className="flex flex-wrap items-center justify-end gap-2">
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

      <ConfirmationDialog
        isOpen={revertOpen}
        onClose={() => setRevertOpen(false)}
        onConfirm={handleRevert}
        title={`Revert ${data.employeeName}'s KPI to draft?`}
        description={
          `This will un-finalize the report and permanently delete all peer teamwork ratings submitted for ${formatPeriod(period.year, period.month)}. ` +
          `Any employee reply will be cleared (if one was submitted) and the report will be hidden from their dashboard until you finalize it again. ` +
          `Peers will be able to re-submit ratings. Continue?`
        }
        confirmText="Revert to draft"
        variant="warning"
        isLoading={reverting}
      />
    </div>
  )
}

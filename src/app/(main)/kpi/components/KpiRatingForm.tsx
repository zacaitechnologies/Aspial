"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2, Lock, Save } from "lucide-react"
import { formatBusinessDateTimeDisplay } from "@/lib/date-utils"
import { saveReportDraft, finalizeReport } from "../actions"
import {
  KPI_REPLY_LABELS,
  KPI_SECTION_CATEGORIES,
  computeFinalScore,
  formatPeriod,
  getAdminRatedCategories,
  isKpiRedFlag,
  type KpiCategoryKey,
} from "../config"
import type { EmployeeRatingData, KpiReportDTO } from "../types"
import { KpiCategoryCard } from "./KpiCategoryCard"
import { BandBadge, RedFlagBadge, ScoreNumber, SectionBadge } from "./kpi-ui"

type LocalScore = { score: number | null; comment: string }

export function KpiRatingForm({
  data,
  period,
  onChanged,
}: {
  data: EmployeeRatingData
  period: { year: number; month: number }
  onChanged: (report: KpiReportDTO | null) => void
}) {
  const { toast } = useToast()
  const section = data.section
  const adminCategories = getAdminRatedCategories(section)
  const finalized = data.report?.status === "finalized"

  const [scores, setScores] = useState<Record<string, LocalScore>>(() => {
    const seed: Record<string, LocalScore> = {}
    for (const cat of adminCategories) {
      const existing = data.report?.scores.find((s) => s.category === cat)
      seed[cat] = { score: existing?.score ?? null, comment: existing?.comment ?? "" }
    }
    return seed
  })
  const [overallComment, setOverallComment] = useState(data.report?.overallComment ?? "")
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  const liveFinalScore = useMemo(() => {
    const map: Partial<Record<KpiCategoryKey, number | null>> = {}
    for (const cat of adminCategories) map[cat] = scores[cat]?.score ?? null
    if (data.teamwork.average != null) map.teamwork = data.teamwork.average
    return computeFinalScore(section, map)
  }, [scores, adminCategories, data.teamwork.average, section])

  const displayScore = finalized ? data.report?.finalScore ?? liveFinalScore : liveFinalScore

  function setScore(cat: string, value: number | null) {
    setScores((prev) => ({ ...prev, [cat]: { ...prev[cat], score: value } }))
  }
  function setComment(cat: string, value: string) {
    setScores((prev) => ({ ...prev, [cat]: { ...prev[cat], comment: value } }))
  }

  function buildScorePayload() {
    return adminCategories.map((cat) => ({
      category: cat,
      score: scores[cat]?.score ?? null,
      comment: scores[cat]?.comment ?? "",
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await saveReportDraft({
        employeeId: data.employeeId,
        year: period.year,
        month: period.month,
        overallComment,
        scores: buildScorePayload(),
      })
      onChanged(saved)
      toast({ title: "Draft saved", description: `${data.employeeName} · ${formatPeriod(period.year, period.month)}` })
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleFinalize() {
    setFinalizing(true)
    try {
      // Persist latest edits first, then lock.
      await saveReportDraft({
        employeeId: data.employeeId,
        year: period.year,
        month: period.month,
        overallComment,
        scores: buildScorePayload(),
      })
      await finalizeReport({ employeeId: data.employeeId, year: period.year, month: period.month })
      toast({ title: "Report finalized", description: `${data.employeeName} will see it on their dashboard.` })
      setConfirmOpen(false)
      onChanged(null) // force parent refetch
    } catch (e) {
      toast({ title: "Could not finalize", description: (e as Error).message, variant: "destructive" })
    } finally {
      setFinalizing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{data.employeeName}</h2>
              <SectionBadge section={section} />
              {finalized ? (
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
            <div className="flex flex-col items-end gap-1">
              <BandBadge score={displayScore} />
              {isKpiRedFlag(displayScore) && <RedFlagBadge />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finalized banner + employee reply */}
      {finalized && data.report && (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="space-y-2 py-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-green-800">
              <CheckCircle2 className="size-4" />
              Finalized{data.report.finalizedAt ? ` on ${formatBusinessDateTimeDisplay(new Date(data.report.finalizedAt))}` : ""}.
            </p>
            {data.report.replyChoice ? (
              <div className="rounded-md border bg-card p-3">
                <p className="font-medium text-foreground">
                  Employee reply: {KPI_REPLY_LABELS[data.report.replyChoice]}
                </p>
                {data.report.replyComment && (
                  <p className="mt-1 text-muted-foreground">“{data.report.replyComment}”</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Awaiting the employee’s reply.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category cards */}
      <div className="space-y-3">
        {KPI_SECTION_CATEGORIES[section].map((cat) => (
          <KpiCategoryCard
            key={cat}
            section={section}
            category={cat}
            score={scores[cat]?.score ?? null}
            comment={scores[cat]?.comment ?? ""}
            onScoreChange={(v) => setScore(cat, v)}
            onCommentChange={(v) => setComment(cat, v)}
            disabled={finalized}
            teamwork={cat === "teamwork" ? data.teamwork : undefined}
            overdueTasks={cat === "deadline_reliability" ? data.overdueTasks : undefined}
          />
        ))}
      </div>

      {/* Overall comment */}
      <Card>
        <CardContent className="space-y-1 py-4">
          <Label className="text-sm font-medium">Overall manager comments</Label>
          <Textarea
            disabled={finalized}
            value={overallComment}
            onChange={(e) => setOverallComment(e.target.value)}
            placeholder="Summary of performance, key achievements, and areas to develop…"
            className="min-h-[80px] text-sm"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {!finalized && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving || finalizing}>
            <Save className="size-4" /> {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={saving || finalizing}>
            <Lock className="size-4" /> Finalize & send
          </Button>
        </div>
      )}

      <ConfirmationDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleFinalize}
        title={`Finalize ${data.employeeName}'s KPI?`}
        description={
          data.teamwork.count === 0
            ? "No peer teamwork ratings have been submitted yet, so Teamwork will count as 0. Once finalized, the report is locked and sent to the employee's dashboard for their reply. Continue?"
            : "Once finalized, the report is locked and sent to the employee's dashboard, where they must reply. Continue?"
        }
        confirmText="Finalize & send"
        variant={data.teamwork.count === 0 ? "warning" : "info"}
        isLoading={finalizing}
      />
    </div>
  )
}

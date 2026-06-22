"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Users, ClipboardList, CalendarClock } from "lucide-react"
import { formatMYTDateForDisplay } from "@/lib/date-utils"
import {
  KPI_CATEGORY_META,
  KPI_STANDARDS,
  getCategoryWeight,
  getKpiBand,
  type KpiCategoryKey,
  type KpiSection,
} from "../config"
import type { OverdueTaskDTO, TeamworkSummary } from "../types"

function StandardBox({ category }: { category: KpiCategoryKey }) {
  const standard = KPI_STANDARDS[category]
  if (!standard) return null
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
      <p className="font-semibold uppercase tracking-wide text-amber-700">Standard / reference</p>
      <p className="mt-1.5 leading-relaxed">{standard.description}</p>
      {standard.measurementSource && (
        <p className="mt-2">
          <span className="font-semibold">Measurement source:</span> {standard.measurementSource}
        </p>
      )}
      {standard.evaluationAreas && standard.evaluationAreas.length > 0 && (
        <div className="mt-2">
          <span className="font-semibold">Suggested evaluation areas:</span>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {standard.evaluationAreas.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {standard.target && (
        <p className="mt-2 rounded-md bg-amber-100 px-2 py-1 font-medium">
          🎯 Target: {standard.target}
        </p>
      )}
    </div>
  )
}

function OverdueTasksBox({ tasks }: { tasks: OverdueTaskDTO[] }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-semibold text-red-700">
        <CalendarClock className="size-3.5" />
        Overdue tasks this month ({tasks.length}) — reference only, does not affect the score
      </p>
      {tasks.length === 0 ? (
        <p className="mt-1.5 text-muted-foreground">No overdue tasks for this period. 🎉</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="font-medium text-foreground">{t.title}</span>
                <span className="text-muted-foreground"> · {t.projectName}</span>
              </span>
              <span className="shrink-0 text-red-700">
                due {formatMYTDateForDisplay(new Date(t.dueDate))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function KpiCategoryCard({
  section,
  category,
  score,
  comment,
  onScoreChange,
  onCommentChange,
  disabled,
  teamwork,
  overdueTasks,
}: {
  section: KpiSection
  category: KpiCategoryKey
  score: number | null
  comment: string
  onScoreChange: (value: number | null) => void
  onCommentChange: (value: string) => void
  disabled?: boolean
  teamwork?: TeamworkSummary
  overdueTasks?: OverdueTaskDTO[]
}) {
  const meta = KPI_CATEGORY_META[category]
  const weight = getCategoryWeight(section, category)
  const band = typeof score === "number" ? getKpiBand(score) : null

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center gap-2 border-b py-3 px-4 space-y-0">
        <h3 className="flex-1 text-sm font-semibold text-foreground">{meta.label}</h3>
        {meta.peerRated && (
          <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
            <Users className="size-3" /> Peer-rated
          </Badge>
        )}
        <Badge variant="secondary" className="font-semibold tabular-nums">
          {weight}%
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        <StandardBox category={category} />

        {meta.peerRated ? (
          // Teamwork — read-only average of peer ratings (admin does not rate this).
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {teamwork?.average != null ? teamwork.average : "—"}
              </span>
              <div className="text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <ClipboardList className="size-3.5" />
                  {teamwork && teamwork.count > 0
                    ? `Average of ${teamwork.count} peer rating${teamwork.count === 1 ? "" : "s"}`
                    : "No peer ratings submitted yet"}
                </p>
                <p className="mt-0.5">Rated by colleagues — not editable here.</p>
              </div>
            </div>
            {teamwork && teamwork.comments.length > 0 && (
              <ul className="mt-2 space-y-1 border-t pt-2 text-xs text-muted-foreground">
                {teamwork.comments.map((c, i) => (
                  <li key={i} className="italic">“{c}”</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={disabled}
                value={score ?? 0}
                onChange={(e) => onScoreChange(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed"
                aria-label={`${meta.label} score`}
              />
              <Input
                type="number"
                min={0}
                max={100}
                disabled={disabled}
                value={score ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value
                  if (v === "") return onScoreChange(null)
                  onScoreChange(Math.max(0, Math.min(100, Number(v))))
                }}
                className="h-9 w-20 text-center tabular-nums"
              />
              {band && (
                <Badge variant="outline" className={`${band.className} shrink-0`}>
                  {band.label}
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Comment (optional)</Label>
              <Textarea
                disabled={disabled}
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder={`Feedback for ${meta.label}…`}
                className="min-h-[60px] text-sm"
              />
            </div>
          </>
        )}

        {meta.showsOverdueTasks && overdueTasks && <OverdueTasksBox tasks={overdueTasks} />}
      </CardContent>
    </Card>
  )
}

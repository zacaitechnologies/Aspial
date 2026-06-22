"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2, Loader2, Users } from "lucide-react"
import { getColleaguesToRate, submitTeamworkRating } from "../actions"
import { formatPeriod } from "../config"
import type { ColleagueToRate } from "../types"
import { PeriodSelect, SectionBadge } from "./kpi-ui"

type Period = { year: number; month: number }
type Edit = { score: number | null; comment: string }

function seedEdits(list: ColleagueToRate[]): Record<string, Edit> {
  const map: Record<string, Edit> = {}
  for (const c of list) map[c.supabaseId] = { score: c.myScore, comment: c.myComment ?? "" }
  return map
}

export function PeerTeamworkRating({
  anchor,
  initialPeriod,
  initialColleagues,
}: {
  anchor: Period
  initialPeriod: Period
  initialColleagues: ColleagueToRate[]
}) {
  const { toast } = useToast()
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [colleagues, setColleagues] = useState<ColleagueToRate[]>(initialColleagues)
  const [edits, setEdits] = useState<Record<string, Edit>>(() => seedEdits(initialColleagues))
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const didMount = useRef(false)

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    let active = true
    setLoading(true)
    getColleaguesToRate(period.year, period.month)
      .then((list) => {
        if (!active) return
        setColleagues(list)
        setEdits(seedEdits(list))
      })
      .catch((e) => active && toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" }))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [period.year, period.month, toast])

  function setEdit(id: string, patch: Partial<Edit>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function save(c: ColleagueToRate) {
    const edit = edits[c.supabaseId]
    if (edit?.score == null) {
      toast({ title: "Add a score", description: `Give ${c.name} a teamwork score from 0–100.` })
      return
    }
    setSavingId(c.supabaseId)
    try {
      await submitTeamworkRating({
        rateeId: c.supabaseId,
        year: period.year,
        month: period.month,
        score: edit.score,
        comment: edit.comment,
      })
      setColleagues((prev) =>
        prev.map((x) =>
          x.supabaseId === c.supabaseId ? { ...x, myScore: edit.score, myComment: edit.comment } : x
        )
      )
      toast({ title: "Rating saved", description: `Teamwork rating for ${c.name} recorded.` })
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSavingId(null)
    }
  }

  const remaining = colleagues.filter((c) => c.myScore == null).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className="size-5 text-muted-foreground" /> Rate your colleagues’ teamwork
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatPeriod(period.year, period.month)} · your ratings are averaged anonymously ·{" "}
            {remaining === 0 ? "all colleagues rated 🎉" : `${remaining} left to rate`}
          </p>
        </div>
        <PeriodSelect anchor={anchor} value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : colleagues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            There are no colleagues to rate.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {colleagues.map((c) => {
            const edit = edits[c.supabaseId] ?? { score: null, comment: "" }
            const rated = c.myScore != null
            return (
              <Card key={c.supabaseId} className="py-0">
                <CardContent className="flex flex-col gap-3 py-3 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate font-medium text-foreground">{c.name}</span>
                    <SectionBadge section={c.section} />
                    {rated && (
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                        <CheckCircle2 className="size-3" /> Rated
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={edit.score ?? 0}
                      onChange={(e) => setEdit(c.supabaseId, { score: Number(e.target.value) })}
                      className="h-2 w-28 cursor-pointer accent-primary"
                      aria-label={`${c.name} teamwork score`}
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={edit.score ?? ""}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value
                        setEdit(c.supabaseId, {
                          score: v === "" ? null : Math.max(0, Math.min(100, Number(v))),
                        })
                      }}
                      className="h-9 w-20 text-center tabular-nums"
                    />
                    <Input
                      value={edit.comment}
                      onChange={(e) => setEdit(c.supabaseId, { comment: e.target.value })}
                      placeholder="Comment (optional)"
                      className="h-9 w-44"
                    />
                    <Button size="sm" onClick={() => save(c)} disabled={savingId === c.supabaseId}>
                      {savingId === c.supabaseId ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

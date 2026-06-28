"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { CheckCircle2, Lock, Search, Users2 } from "lucide-react"
import { getColleaguesToRate, submitTeamworkRating } from "../actions"
import { formatPeriod } from "../config"
import type { ColleagueToRate } from "../types"
import { SectionBadge } from "./kpi-ui"
import { cn } from "@/lib/utils"

type Period = { year: number; month: number }
type Edit = { score: number | null; comment: string }

function seedEdits(list: ColleagueToRate[]): Record<string, Edit> {
  const map: Record<string, Edit> = {}
  for (const c of list) map[c.supabaseId] = { score: c.myScore, comment: c.myComment ?? "" }
  return map
}

export function PeerTeamworkRating({
  period,
  initialPeriod,
  initialColleagues,
}: {
  period: Period
  initialPeriod: Period
  initialColleagues: ColleagueToRate[]
}) {
  const isInitialPeriod =
    period.year === initialPeriod.year && period.month === initialPeriod.month

  const [colleagues, setColleagues] = useState<ColleagueToRate[]>(
    isInitialPeriod ? initialColleagues : []
  )
  const [edits, setEdits] = useState<Record<string, Edit>>(() =>
    seedEdits(isInitialPeriod ? initialColleagues : [])
  )
  const [loading, setLoading] = useState(!isInitialPeriod)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const didMount = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      if (isInitialPeriod) return
    }

    let active = true
    setLoading(true)
    setColleagues([])

    getColleaguesToRate(period.year, period.month)
      .then((list) => {
        if (!active) return
        setColleagues(list)
        setEdits(seedEdits(list))
      })
      .catch(
        (e) =>
          active &&
          toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" })
      )
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [period.year, period.month, isInitialPeriod])

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

  const filtered = useMemo(() => {
    if (!searchQuery) return colleagues
    const q = searchQuery.toLowerCase()
    return colleagues.filter((c) => c.name.toLowerCase().includes(q))
  }, [colleagues, searchQuery])

  const remaining = colleagues.filter((c) => c.myScore == null).length

  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search colleague..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="border-2 border-accent bg-card pl-10"
          />
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {loading
            ? "Loading…"
            : `${remaining === 0 ? "All colleagues rated" : `${remaining} left to rate`} · ${formatPeriod(period.year, period.month)}`}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-primary">
          <div className="mb-4 size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-lg font-medium">Loading colleagues…</p>
        </div>
      ) : colleagues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            There are no colleagues to rate for {formatPeriod(period.year, period.month)}.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Users2 className="mx-auto mb-4 size-12 text-muted-foreground" />
          <p className="text-muted-foreground">No colleagues match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const edit = edits[c.supabaseId] ?? { score: null, comment: "" }
            const rated = c.myScore != null
            const locked = c.kpiLocked
            return (
              <Card
                key={c.supabaseId}
                className={cn(
                  "border-l-4 py-0",
                  locked ? "border-l-muted opacity-70" : rated ? "border-l-emerald-500" : "border-l-border"
                )}
              >
                <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-foreground">{c.name}</span>
                    <SectionBadge section={c.section} />
                    {locked ? (
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        <Lock className="size-3" /> KPI finalized
                      </Badge>
                    ) : rated ? (
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                        <CheckCircle2 className="size-3" /> Rated
                      </Badge>
                    ) : null}
                  </div>
                  {locked ? (
                    <p className="text-xs text-muted-foreground">
                      Rating closed — this colleague's KPI has been finalized.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
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
                        className="h-9 w-20 border-2 border-accent bg-card text-center tabular-nums"
                      />
                      <Input
                        value={edit.comment}
                        onChange={(e) => setEdit(c.supabaseId, { comment: e.target.value })}
                        placeholder="Comment (optional)"
                        className="h-9 w-44 border-2 border-accent bg-card"
                      />
                      <Button size="sm" onClick={() => save(c)} disabled={savingId === c.supabaseId}>
                        {savingId === c.supabaseId ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

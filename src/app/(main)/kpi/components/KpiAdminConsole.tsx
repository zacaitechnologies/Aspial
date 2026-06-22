"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Search, Users2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getEmployeeRatingData, getMonthlyReportRows } from "../actions"
import type { EmployeeRatingData, KpiReportDTO, MonthlyReportRow, RateableEmployee } from "../types"
import { PeriodSelect, SectionBadge } from "./kpi-ui"
import { KpiRatingForm } from "./KpiRatingForm"
import { KpiMonthlyReport } from "./KpiMonthlyReport"

type Period = { year: number; month: number }

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function KpiAdminConsole({
  employees,
  anchor,
  initialPeriod,
}: {
  employees: RateableEmployee[]
  anchor: Period
  initialPeriod: Period
}) {
  const { toast } = useToast()
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [tab, setTab] = useState<"rate" | "report">("rate")
  const [search, setSearch] = useState("")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ratingData, setRatingData] = useState<EmployeeRatingData | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [reportRows, setReportRows] = useState<MonthlyReportRow[] | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  // Load the selected employee's rating data when employee / period / refresh changes.
  useEffect(() => {
    if (!selectedId) {
      setRatingData(null)
      return
    }
    let active = true
    setLoadingData(true)
    getEmployeeRatingData(selectedId, period.year, period.month)
      .then((d) => active && setRatingData(d))
      .catch((e) => active && toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" }))
      .finally(() => active && setLoadingData(false))
    return () => {
      active = false
    }
  }, [selectedId, period.year, period.month, refreshKey, toast])

  // Load the monthly report when that tab is active.
  useEffect(() => {
    if (tab !== "report") return
    let active = true
    setLoadingReport(true)
    getMonthlyReportRows(period.year, period.month)
      .then((r) => active && setReportRows(r))
      .catch((e) => active && toast({ title: "Failed to load report", description: (e as Error).message, variant: "destructive" }))
      .finally(() => active && setLoadingReport(false))
    return () => {
      active = false
    }
  }, [tab, period.year, period.month, refreshKey, toast])

  function handleChanged(report: KpiReportDTO | null) {
    if (report) {
      setRatingData((prev) => (prev ? { ...prev, report } : prev))
    } else {
      setRefreshKey((k) => k + 1) // finalized → refetch fresh state
    }
  }

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users2 className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">KPI Performance</h1>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelect anchor={anchor} value={period} onChange={setPeriod} />
          <Tabs value={tab} onValueChange={(v) => setTab(v as "rate" | "report")}>
            <TabsList>
              <TabsTrigger value="rate">Rate</TabsTrigger>
              <TabsTrigger value="report">Monthly Report</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {tab === "report" ? (
        loadingReport || !reportRows ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <KpiMonthlyReport
            rows={reportRows}
            period={period}
            onOpenEmployee={(id) => {
              setSelectedId(id)
              setTab("rate")
            }}
          />
        )
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Employee list */}
          <Card className="lg:w-72 lg:shrink-0 py-0">
            <CardContent className="p-3">
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employees…"
                  className="h-9 pl-8"
                />
              </div>
              <div className="max-h-[70vh] space-y-1 overflow-y-auto">
                {filtered.map((emp) => (
                  <button
                    key={emp.supabaseId}
                    onClick={() => setSelectedId(emp.supabaseId)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted",
                      selectedId === emp.supabaseId && "bg-muted"
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(emp.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{emp.name}</span>
                    </span>
                    <SectionBadge section={emp.section} />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">No employees found.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rating area */}
          <div className="min-w-0 flex-1">
            {!selectedId ? (
              <Card>
                <CardContent className="py-20 text-center text-muted-foreground">
                  <Users2 className="mx-auto mb-3 size-10 opacity-40" />
                  <p>Select an employee to start rating.</p>
                </CardContent>
              </Card>
            ) : loadingData || !ratingData ? (
              <div className="flex justify-center py-20 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : (
              <KpiRatingForm
                key={`${selectedId}-${period.year}-${period.month}-${refreshKey}`}
                data={ratingData}
                period={period}
                onChanged={handleChanged}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

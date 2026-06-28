"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { BarChart3, ClipboardList, Loader2 } from "lucide-react"
import { getEmployeeRatingData, getMonthlyReportRows } from "../actions"
import type { EmployeeRatingData, KpiReportDTO, MonthlyReportRow, RateableEmployee } from "../types"
import { formatPeriod } from "../config"
import { PeriodSelect } from "./kpi-ui"
import { KpiRatingForm } from "./KpiRatingForm"
import { KpiReportDetailView } from "./KpiReportDetailView"
import { KpiMonthlyReport } from "./KpiMonthlyReport"
import { KpiReportList } from "./KpiReportList"

type Period = { year: number; month: number }

type ReportTarget = { employeeId: string; year: number; month: number }
type DialogMode = "view" | "edit"

export function KpiAdminConsole({
  employees,
  initialPeriod,
}: {
  employees: RateableEmployee[]
  initialPeriod: Period
}) {
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [tab, setTab] = useState<"rate" | "report">("rate")
  const [refreshKey, setRefreshKey] = useState(0)

  const [dialogTarget, setDialogTarget] = useState<ReportTarget | null>(null)
  const [dialogMode, setDialogMode] = useState<DialogMode>("view")
  const [reportData, setReportData] = useState<EmployeeRatingData | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  const [reportRows, setReportRows] = useState<MonthlyReportRow[] | null>(null)
  const [loadingMonthlyReport, setLoadingMonthlyReport] = useState(false)

  useEffect(() => {
    if (!dialogTarget) {
      setReportData(null)
      return
    }
    let active = true
    setLoadingReport(true)
    getEmployeeRatingData(dialogTarget.employeeId, dialogTarget.year, dialogTarget.month)
      .then((d) => active && setReportData(d))
      .catch((e) =>
        active &&
        toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" })
      )
      .finally(() => active && setLoadingReport(false))
    return () => {
      active = false
    }
  }, [dialogTarget, refreshKey])

  useEffect(() => {
    if (tab !== "report") return
    let active = true
    setLoadingMonthlyReport(true)
    getMonthlyReportRows(period.year, period.month)
      .then((r) => active && setReportRows(r))
      .catch((e) =>
        active &&
        toast({ title: "Failed to load report", description: (e as Error).message, variant: "destructive" })
      )
      .finally(() => active && setLoadingMonthlyReport(false))
    return () => {
      active = false
    }
  }, [tab, period.year, period.month, refreshKey])

  function handleChanged(report: KpiReportDTO | null) {
    if (report) {
      setReportData((prev) => (prev ? { ...prev, report } : prev))
      setRefreshKey((k) => k + 1)
    } else {
      setRefreshKey((k) => k + 1)
    }
  }

  function openView(employeeId: string, year: number, month: number) {
    setDialogMode("view")
    setDialogTarget({ employeeId, year, month })
  }

  function openEdit(employeeId: string, year: number, month: number) {
    setDialogMode("edit")
    setDialogTarget({ employeeId, year, month })
  }

  function closeDialog() {
    setDialogTarget(null)
    setReportData(null)
  }

  const dialogTitle =
    reportData && dialogTarget
      ? `${reportData.employeeName} · ${formatPeriod(dialogTarget.year, dialogTarget.month)}`
      : dialogMode === "view"
        ? "KPI Report"
        : "Rate KPI"

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold sm:text-3xl">KPI Performance</h1>
          <p className="text-muted-foreground">
            Select a month, review the rating queue, and quickly spot unrated employees and red flags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Review month</span>
          <PeriodSelect value={period} onChange={setPeriod} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "rate" | "report")} className="w-full">
        <div className="relative">
          <TabsList className="grid w-full grid-cols-2 border border-primary bg-transparent transition-all duration-300 ease-in-out">
            <TabsTrigger
              value="rate"
              className="relative z-10 flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
            >
              <ClipboardList className="size-4" />
              Monthly Rating Queue
            </TabsTrigger>
            <TabsTrigger
              value="report"
              className="relative z-10 flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
            >
              <BarChart3 className="size-4" />
              Monthly Report Board
            </TabsTrigger>
          </TabsList>
          <div
            className={`pointer-events-none absolute top-1 z-0 h-[calc(100%-8px)] rounded-md bg-primary transition-all duration-300 ease-in-out ${
              tab === "rate" ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
            }`}
            aria-hidden
          />
        </div>
      </Tabs>

      {tab === "report" ? (
        loadingMonthlyReport || !reportRows ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <KpiMonthlyReport
            rows={reportRows}
            period={period}
            onOpenEmployee={(id) => openView(id, period.year, period.month)}
          />
        )
      ) : (
        <KpiReportList
          employees={employees}
          period={period}
          onPeriodChange={setPeriod}
          refreshKey={refreshKey}
          onView={openView}
          onRate={openEdit}
        />
      )}

      <Dialog open={dialogTarget != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          {loadingReport || !reportData || !dialogTarget ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : dialogMode === "view" ? (
            <KpiReportDetailView
              key={`view-${dialogTarget.employeeId}-${dialogTarget.year}-${dialogTarget.month}-${refreshKey}`}
              data={reportData}
              period={{ year: dialogTarget.year, month: dialogTarget.month }}
              onEdit={() => setDialogMode("edit")}
            />
          ) : (
            <KpiRatingForm
              key={`edit-${dialogTarget.employeeId}-${dialogTarget.year}-${dialogTarget.month}-${refreshKey}`}
              data={reportData}
              period={{ year: dialogTarget.year, month: dialogTarget.month }}
              onChanged={handleChanged}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

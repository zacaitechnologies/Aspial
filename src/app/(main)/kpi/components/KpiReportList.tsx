"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { ClipboardList, Filter, Search, User, Users2 } from "lucide-react"
import { getAdminKpiReportList } from "../actions"
import type { AdminKpiReportListItem, RateableEmployee } from "../types"
import { PeriodSelect } from "./kpi-ui"
import { KpiReportCard } from "./KpiReportCard"

type Period = { year: number; month: number }

const ALL = "all"

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "not_started", label: "Not rated yet" },
  { value: "draft", label: "In progress (Draft)" },
  { value: "finalized", label: "Finalized" },
] as const

export function KpiReportList({
  employees,
  period,
  onPeriodChange,
  refreshKey,
  onView,
  onRate,
}: {
  employees: RateableEmployee[]
  period: Period
  onPeriodChange: (period: Period) => void
  refreshKey: number
  onView: (employeeId: string, year: number, month: number) => void
  onRate: (employeeId: string, year: number, month: number) => void
}) {
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(ALL)
  const [employeeFilter, setEmployeeFilter] = useState<string>(ALL)

  const [rows, setRows] = useState<AdminKpiReportListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    let active = true
    setLoading(true)
    setRows([])

    getAdminKpiReportList({
      year: period.year,
      month: period.month,
      employeeId: employeeFilter === ALL ? null : employeeFilter,
    })
      .then((list) => active && setRows(list))
      .catch((e) =>
        active &&
        toast({ title: "Failed to load KPI list", description: (e as Error).message, variant: "destructive" })
      )
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [period.year, period.month, employeeFilter, refreshKey])

  const filtered = useMemo(() => {
    let result = rows
    if (statusFilter !== ALL) {
      result = result.filter((r) => r.status === statusFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((r) => r.employeeName.toLowerCase().includes(q))
    }
    return result
  }, [rows, statusFilter, searchQuery])

  const hasActiveFilters =
    statusFilter !== ALL || employeeFilter !== ALL || searchQuery.length > 0

  function clearFilters() {
    setStatusFilter(ALL)
    setEmployeeFilter(ALL)
    setSearchInput("")
    setSearchQuery("")
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search employee..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="border-2 border-accent bg-card pl-10"
          />
        </div>

        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="min-w-[9.5rem] w-auto max-w-full border-2 border-accent bg-card">
            <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <User className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="All employees" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.supabaseId} value={e.supabaseId}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="min-w-[9.5rem] w-auto max-w-full border-2 border-accent bg-card">
            <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <Filter className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="All statuses" />
            </span>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <PeriodSelect value={period} onChange={onPeriodChange} />

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="shrink-0 border-2 border-accent bg-card"
          >
            Clear Filters
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {loading ? "Loading…" : `Showing ${filtered.length} of ${rows.length} reports`}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-primary">
          <div className="mb-4 size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-lg font-medium">Loading KPI reports…</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((row) => (
              <KpiReportCard
                key={`${row.employeeId}-${row.year}-${row.month}`}
                row={row}
                onView={onView}
                onRate={onRate}
              />
            ))}
          </div>

          {filtered.length === 0 && rows.length === 0 && !hasActiveFilters && (
            <div className="py-12 text-center">
              <ClipboardList className="mx-auto mb-4 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">No employees found for this month.</p>
            </div>
          )}

          {filtered.length === 0 && hasActiveFilters && (
            <div className="py-12 text-center">
              <Users2 className="mx-auto mb-4 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">No KPI reports match the selected filters.</p>
              <Button variant="outline" className="mt-4 border-2 border-accent bg-card" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

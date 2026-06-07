"use client"

import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { calToolbarControlClass } from "@/app/(main)/calendar/utils/calendar-toolbar-styles"
import {
  leaveTableHeadClass,
  leaveTableHeadRowClass,
  leaveTableShellClass,
} from "../leave-table-styles"
import { LeaveTypeBadge, LeaveStatusBadge } from "./LeaveStatusBadge"
import type { EmployeeLeaveOverview as EmployeeLeaveOverviewType, LeaveTypeDTO } from "../types"
import { formatLeaveTypeName } from "../types"
import { formatMYTDateForDisplay } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

interface EmployeeLeaveOverviewProps {
  employees: EmployeeLeaveOverviewType[]
  /** Malaysia calendar year for balances shown in the summary columns */
  selectedYear: number
  yearMin: number
  yearMax: number
  /** Optional list of all leave types (dynamic). When omitted, columns are derived from existing balances. */
  leaveTypes?: LeaveTypeDTO[]
  onYearChange: (year: number) => void
}

export default function EmployeeLeaveOverviewTable({
  employees,
  selectedYear,
  yearMin,
  yearMax,
  leaveTypes,
  onYearChange,
}: EmployeeLeaveOverviewProps) {
  const [search, setSearch] = useState("")

  const filtered = employees.filter((e) => {
    const name = `${e.firstName} ${e.lastName}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  // Determine which leave-type columns to show: prefer the explicit list (sorted)
  // and fall back to the union of codes that actually appear in employees' balances.
  const summaryColumns = useMemo(() => {
    if (leaveTypes && leaveTypes.length > 0) {
      return leaveTypes
        .filter((t) => t.isActive)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
        .map((t) => ({ code: t.code, name: t.name, isUnpaid: t.isUnpaid }))
    }
    const codes = new Set<string>()
    for (const emp of employees) {
      for (const b of emp.balances) codes.add(b.leaveType)
    }
    return Array.from(codes)
      .sort()
      .map((c) => ({ code: c, name: formatLeaveTypeName(c), isUnpaid: c === "UNPAID" }))
  }, [leaveTypes, employees])

  const yearOptions = Array.from(
    { length: yearMax - yearMin + 1 },
    (_, i) => yearMin + i
  )

  const tableHeadClass = leaveTableHeadClass

  return (
    <div className="flex flex-col gap-3">
      <div className="border-b border-border pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="shrink-0 text-base font-semibold text-foreground">
            Employee overview
          </h2>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="whitespace-nowrap text-sm text-muted-foreground">Year</span>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => onYearChange(Number.parseInt(v, 10))}
            >
              <SelectTrigger
                className={cn("w-[min(100vw-4rem,140px)]", calToolbarControlClass)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn("pl-9 shadow-xs", calToolbarControlClass)}
          />
        </div>
      </div>

      <div className={leaveTableShellClass}>
          <Table>
            <TableHeader>
              <TableRow className={leaveTableHeadRowClass}>
                <TableHead className={cn("sticky left-0 z-20", tableHeadClass)}>
                  Employee
                </TableHead>
                <TableHead className={tableHeadClass}>Role</TableHead>
                <TableHead className={tableHeadClass}>Last leave</TableHead>
                <TableHead className={tableHeadClass}>Next leave</TableHead>
                {summaryColumns.map((t) => (
                  <TableHead key={t.code} className={cn("whitespace-nowrap", tableHeadClass)}>
                    {t.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4 + summaryColumns.length}
                    className="text-center text-muted-foreground py-10"
                  >
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((emp) => (
                  <TableRow key={emp.userId} className="hover:bg-muted/30">
                    <TableCell className="sticky left-0 z-10 bg-card font-medium text-foreground">
                      {emp.firstName} {emp.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp.staffRole ?? "—"}
                    </TableCell>
                    <TableCell>
                      {emp.lastLeave ? (
                        <div className="space-y-0.5">
                          <p className="text-sm text-foreground">
                            {formatMYTDateForDisplay(new Date(emp.lastLeave.startDate), { includeYear: false })}
                            {String(emp.lastLeave.startDate) !== String(emp.lastLeave.endDate) && (
                              <> - {formatMYTDateForDisplay(new Date(emp.lastLeave.endDate), { includeYear: false })}</>
                            )}
                          </p>
                          <LeaveTypeBadge type={emp.lastLeave.leaveType} types={leaveTypes} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.nextLeave ? (
                        <div className="space-y-0.5">
                          <p className="text-sm text-foreground">
                            {formatMYTDateForDisplay(new Date(emp.nextLeave.startDate), { includeYear: false })}
                            {String(emp.nextLeave.startDate) !== String(emp.nextLeave.endDate) && (
                              <> - {formatMYTDateForDisplay(new Date(emp.nextLeave.endDate), { includeYear: false })}</>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <LeaveTypeBadge type={emp.nextLeave.leaveType} types={leaveTypes} />
                            <LeaveStatusBadge status={emp.nextLeave.status} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    {summaryColumns.map((t) => {
                      const bal = emp.balances.find((b) => b.leaveType === t.code)
                      return (
                        <TableCell key={t.code} className="text-sm">
                          {bal ? (
                            t.isUnpaid ? (
                              <span>
                                <span className="font-medium tabular-nums text-foreground">
                                  {bal.used}
                                </span>
                                <span className="text-muted-foreground"> taken</span>
                              </span>
                            ) : (
                              <span>
                                <span className="font-medium tabular-nums text-foreground">
                                  {bal.used}
                                </span>
                                <span className="text-muted-foreground">/{bal.entitled}</span>
                              </span>
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeaveTypeBadge, LeaveStatusBadge } from "./LeaveStatusBadge"
import type { EmployeeLeaveOverview as EmployeeLeaveOverviewType } from "../types"
import { leaveTypeOptions } from "../types"
import { format } from "date-fns"
import { Search } from "lucide-react"

interface EmployeeLeaveOverviewProps {
  employees: EmployeeLeaveOverviewType[]
  /** Malaysia calendar year for balances shown in the summary columns */
  selectedYear: number
  yearMin: number
  yearMax: number
  onYearChange: (year: number) => void
}

const summaryLeaveTypes = ["PAID", "UNPAID"] as const

export default function EmployeeLeaveOverviewTable({
  employees,
  selectedYear,
  yearMin,
  yearMax,
  onYearChange,
}: EmployeeLeaveOverviewProps) {
  const [search, setSearch] = useState("")

  const filtered = employees.filter((e) => {
    const name = `${e.firstName} ${e.lastName}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const getLabel = (type: string) =>
    leaveTypeOptions.find((o) => o.value === type)?.label ?? type

  const yearOptions = Array.from(
    { length: yearMax - yearMin + 1 },
    (_, i) => yearMin + i
  )

  return (
    <Card className="border bg-card shadow-sm">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground">
              Employee overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Paid / unpaid balances for calendar year {selectedYear} (Malaysia time). Last
              and next leave are based on today&apos;s date.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Year</span>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => onYearChange(Number.parseInt(v, 10))}
            >
              <SelectTrigger className="w-[min(100vw-4rem,140px)]">
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
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="rounded-lg border border-border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-foreground font-semibold">Employee</TableHead>
                <TableHead className="text-foreground font-semibold">Role</TableHead>
                <TableHead className="text-foreground font-semibold">Last leave</TableHead>
                <TableHead className="text-foreground font-semibold">Next leave</TableHead>
                {summaryLeaveTypes.map((type) => (
                  <TableHead key={type} className="text-foreground font-semibold whitespace-nowrap">
                    {getLabel(type)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4 + summaryLeaveTypes.length}
                    className="text-center text-muted-foreground py-10"
                  >
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((emp) => (
                  <TableRow key={emp.userId} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">
                      {emp.firstName} {emp.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp.staffRole ?? "—"}
                    </TableCell>
                    <TableCell>
                      {emp.lastLeave ? (
                        <div className="space-y-0.5">
                          <p className="text-sm text-foreground">
                            {format(new Date(emp.lastLeave.startDate), "MMM d")}
                            {emp.lastLeave.startDate !== emp.lastLeave.endDate && (
                              <> - {format(new Date(emp.lastLeave.endDate), "MMM d")}</>
                            )}
                          </p>
                          <LeaveTypeBadge type={emp.lastLeave.leaveType} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.nextLeave ? (
                        <div className="space-y-0.5">
                          <p className="text-sm text-foreground">
                            {format(new Date(emp.nextLeave.startDate), "MMM d")}
                            {emp.nextLeave.startDate !== emp.nextLeave.endDate && (
                              <> - {format(new Date(emp.nextLeave.endDate), "MMM d")}</>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <LeaveTypeBadge type={emp.nextLeave.leaveType} />
                            <LeaveStatusBadge status={emp.nextLeave.status} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    {summaryLeaveTypes.map((type) => {
                      const bal = emp.balances.find((b) => b.leaveType === type)
                      return (
                        <TableCell key={type} className="text-sm whitespace-nowrap">
                          {bal ? (
                            type === "UNPAID" ? (
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
      </CardContent>
    </Card>
  )
}

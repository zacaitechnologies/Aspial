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
import { LeaveTypeBadge, LeaveStatusBadge } from "./LeaveStatusBadge"
import type { EmployeeLeaveOverview as EmployeeLeaveOverviewType } from "../types"
import { leaveTypeOptions } from "../types"
import { format } from "date-fns"
import { Search } from "lucide-react"

interface EmployeeLeaveOverviewProps {
  employees: EmployeeLeaveOverviewType[]
}

const primaryLeaveTypes = ["ANNUAL", "MEDICAL", "EMERGENCY"]

export default function EmployeeLeaveOverviewTable({
  employees,
}: EmployeeLeaveOverviewProps) {
  const [search, setSearch] = useState("")

  const filtered = employees.filter((e) => {
    const name = `${e.firstName} ${e.lastName}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const getLabel = (type: string) =>
    leaveTypeOptions.find((o) => o.value === type)?.label ?? type

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Leave</TableHead>
              <TableHead>Next Leave</TableHead>
              {primaryLeaveTypes.map((type) => (
                <TableHead key={type}>{getLabel(type)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4 + primaryLeaveTypes.length}
                  className="text-center text-muted-foreground py-8"
                >
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow key={emp.userId}>
                  <TableCell className="font-medium">
                    {emp.firstName} {emp.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {emp.staffRole ?? "-"}
                  </TableCell>
                  <TableCell>
                    {emp.lastLeave ? (
                      <div className="space-y-0.5">
                        <p className="text-sm">
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
                        <p className="text-sm">
                          {format(new Date(emp.nextLeave.startDate), "MMM d")}
                          {emp.nextLeave.startDate !== emp.nextLeave.endDate && (
                            <> - {format(new Date(emp.nextLeave.endDate), "MMM d")}</>
                          )}
                        </p>
                        <div className="flex gap-1">
                          <LeaveTypeBadge type={emp.nextLeave.leaveType} />
                          <LeaveStatusBadge status={emp.nextLeave.status} />
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  {primaryLeaveTypes.map((type) => {
                    const bal = emp.balances.find((b) => b.leaveType === type)
                    return (
                      <TableCell key={type} className="text-sm">
                        {bal ? (
                          <span>
                            <span className="font-medium">{bal.used}</span>
                            <span className="text-muted-foreground">/{bal.entitled}</span>
                          </span>
                        ) : (
                          "-"
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

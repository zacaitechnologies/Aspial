"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Download, Loader2, ChevronDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getMalaysiaDateStr } from "@/lib/malaysia-time"
import { fetchLeaveApplicationsForExport } from "../action"
import { exportLeaveApplicationsToExcel } from "../utils/export-leave"
import type { LeaveTypeDTO } from "../types"
import { leaveStatusOptions } from "../types"
import type { LeaveStatus } from "@prisma/client"

interface UserOption {
  id: string
  firstName: string
  lastName: string
  email: string
  profilePicture: string | null
}

interface ExportLeaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allUsers: UserOption[]
  leaveTypes: LeaveTypeDTO[]
}

const ALL_STATUSES: LeaveStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]

function firstOfCurrentMonthMYT(): string {
  const today = getMalaysiaDateStr()
  return `${today.slice(0, 7)}-01`
}

export default function ExportLeaveDialog({
  open,
  onOpenChange,
  allUsers,
  leaveTypes,
}: ExportLeaveDialogProps) {
  const { toast } = useToast()

  const [startDate, setStartDate] = useState<string>(() => firstOfCurrentMonthMYT())
  const [endDate, setEndDate] = useState<string>(() => getMalaysiaDateStr())
  const [statuses, setStatuses] = useState<LeaveStatus[]>(ALL_STATUSES)
  const [userIds, setUserIds] = useState<string[]>([])
  const [leaveTypeCodes, setLeaveTypeCodes] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState("")

  const dateRangeInvalid = startDate > endDate
  const noStatusesSelected = statuses.length === 0
  const submitDisabled = isExporting || dateRangeInvalid || noStatusesSelected

  const toggleStatus = (status: LeaveStatus) => {
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const toggleLeaveType = (code: string) => {
    setLeaveTypeCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const toggleUser = (id: string) => {
    setUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    )
  }

  const selectedUsers = useMemo(
    () => allUsers.filter((u) => userIds.includes(u.id)),
    [allUsers, userIds]
  )

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    if (!q) return allUsers
    return allUsers.filter((u) => {
      const name = `${u.firstName} ${u.lastName}`.toLowerCase()
      return name.includes(q) || u.email.toLowerCase().includes(q)
    })
  }, [allUsers, employeeSearch])

  async function handleExport() {
    if (submitDisabled) return
    setIsExporting(true)
    try {
      const rows = await fetchLeaveApplicationsForExport({
        startDate,
        endDate,
        statuses,
        userIds,
        leaveTypeCodes,
      })

      exportLeaveApplicationsToExcel(rows, leaveTypes, { startDate, endDate })

      toast({
        title:
          rows.length === 0
            ? "Exported 0 applications"
            : `Exported ${rows.length} leave application${rows.length === 1 ? "" : "s"}`,
        description:
          rows.length === 0
            ? "The file was downloaded with column headers but no data rows."
            : undefined,
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export leave applications</DialogTitle>
          <DialogDescription>
            Download an Excel file containing leave applications matching the
            filters below. Leaves whose date range overlaps the selected period
            are included.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Date range */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Date range</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="export-start" className="text-xs text-muted-foreground">
                  Start
                </Label>
                <Input
                  id="export-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="export-end" className="text-xs text-muted-foreground">
                  End
                </Label>
                <Input
                  id="export-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            {dateRangeInvalid && (
              <p className="text-xs text-destructive">
                End date must be on or after start date.
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {leaveStatusOptions.map((opt) => {
                const checked = statuses.includes(opt.value)
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleStatus(opt.value)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                )
              })}
            </div>
            {noStatusesSelected && (
              <p className="text-xs text-destructive">
                Select at least one status.
              </p>
            )}
          </div>

          {/* Employees */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Employees</Label>
            <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeePopoverOpen}
                  className={cn(
                    "w-full justify-between font-normal min-h-[2.5rem] h-auto",
                    selectedUsers.length === 0 && "text-muted-foreground"
                  )}
                >
                  <div className="flex flex-wrap gap-1 flex-1">
                    {selectedUsers.length === 0 ? (
                      <span>All employees</span>
                    ) : (
                      selectedUsers.map((user) => (
                        <Badge key={user.id} variant="secondary" className="text-xs">
                          {user.firstName} {user.lastName}
                          <span
                            className="ml-1 inline-flex rounded-full hover:bg-muted-foreground/20"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleUser(user.id)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </Badge>
                      ))
                    )}
                  </div>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-2"
                align="start"
              >
                <Input
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="mb-2 h-8 text-sm"
                />
                <div className="max-h-[15rem] overflow-y-auto space-y-1">
                  {filteredEmployees.map((user) => {
                    const isSelected = userIds.includes(user.id)
                    return (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUser(user.id)}
                        />
                        <span className="flex-1 truncate">
                          {user.firstName} {user.lastName}
                        </span>
                      </label>
                    )
                  })}
                  {filteredEmployees.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No employees found
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Leave empty to include all employees.
            </p>
          </div>

          {/* Leave types */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Leave types</Label>
            <div className="grid grid-cols-2 gap-2">
              {leaveTypes.map((t) => {
                const checked = leaveTypeCodes.includes(t.code)
                return (
                  <label
                    key={t.code}
                    className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleLeaveType(t.code)}
                    />
                    <span className="text-sm truncate">{t.name}</span>
                  </label>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to include all leave types.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={submitDisabled}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

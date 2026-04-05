"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Settings2 } from "lucide-react"
import LeaveOverviewCards from "./LeaveOverviewCards"
import LeaveApplicationTable from "./LeaveApplicationTable"
import LeaveApplicationForm from "./LeaveApplicationForm"
import LeaveDetailDialog from "./LeaveDetailDialog"
import AdminEditLeaveDialog from "./AdminEditLeaveDialog"
import ChangeRequestsTable from "./ChangeRequestsTable"
import EmployeeLeaveOverviewTable from "./EmployeeLeaveOverview"
import LeaveCalendar from "./LeaveCalendar"
import LeaveEntitlementSettings from "./LeaveEntitlementSettings"
import EmployeeBalanceEditDialog from "./EmployeeBalanceEditDialog"
import {
  approveLeave,
  rejectLeave,
  cancelLeave,
  fetchLeaveBalances,
} from "../action"
import { useToast } from "@/components/ui/use-toast"
import type {
  LeaveApplicationDTO,
  LeaveStats,
  LeaveChangeRequestDTO,
  EmployeeLeaveOverview,
  EntitlementDefaultDTO,
  LeaveBalanceDTO,
} from "../types"
import { leaveTypeOptions, leaveStatusOptions } from "../types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface AdminLeaveViewProps {
  initialApplications: LeaveApplicationDTO[]
  initialEmployeeOverview: EmployeeLeaveOverview[]
  initialStats: LeaveStats
  initialChangeRequests: LeaveChangeRequestDTO[]
  initialEntitlementDefaults: EntitlementDefaultDTO[]
  allUsers: { id: string; firstName: string; lastName: string; email: string; profilePicture: string | null }[]
  currentUserId: string
  /** Malaysia calendar year (used for balance year when applying leave). */
  currentYear: number
  /** Calendar year for the employee overview table (filter). */
  overviewYear: number
}

export default function AdminLeaveView({
  initialApplications,
  initialEmployeeOverview,
  initialStats,
  initialChangeRequests,
  initialEntitlementDefaults,
  allUsers,
  currentUserId,
  currentYear,
  overviewYear,
}: AdminLeaveViewProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [showApplyForm, setShowApplyForm] = useState(false)
  const [selectedApp, setSelectedApp] = useState<LeaveApplicationDTO | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [editingApp, setEditingApp] = useState<LeaveApplicationDTO | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showBalanceEdit, setShowBalanceEdit] = useState(false)
  const [adminBalances, setAdminBalances] = useState<LeaveBalanceDTO[]>([])

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [employeeFilter, setEmployeeFilter] = useState<string>("all")

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject" | "cancel"
    leaveId: number
  } | null>(null)
  const [confirmRemarks, setConfirmRemarks] = useState("")
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const filteredApplications = initialApplications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false
    if (typeFilter !== "all" && app.leaveType !== typeFilter) return false
    if (employeeFilter !== "all" && app.userId !== employeeFilter) return false
    return true
  })

  const refresh = useCallback(async () => {
    await router.refresh()
  }, [router])

  async function handleConfirmAction() {
    if (!confirmAction) return
    setConfirmLoading(true)
    try {
      if (confirmAction.type === "approve") {
        await approveLeave(confirmAction.leaveId, confirmRemarks)
      } else if (confirmAction.type === "reject") {
        await rejectLeave(confirmAction.leaveId, confirmRemarks)
      } else {
        await cancelLeave(confirmAction.leaveId, confirmRemarks)
      }
      toast({
        title: `Leave ${confirmAction.type === "approve" ? "approved" : confirmAction.type === "reject" ? "rejected" : "cancelled"}`,
      })
      setConfirmAction(null)
      setConfirmRemarks("")
      await refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed",
        variant: "destructive",
      })
    } finally {
      setConfirmLoading(false)
    }
  }

  async function loadAdminBalances() {
    const balances = await fetchLeaveBalances(currentUserId, currentYear)
    setAdminBalances(balances)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <Button
          onClick={async () => {
            await loadAdminBalances()
            setShowApplyForm(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Apply Leave
        </Button>
      </div>

      <Tabs
        defaultValue="overview"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <div className="relative w-full overflow-x-auto">
          <TabsList className="grid min-h-11 w-full min-w-[280px] grid-cols-4 gap-0 bg-transparent border border-primary rounded-lg p-1 transition-all duration-300 ease-in-out sm:min-w-0">
            <TabsTrigger
              value="overview"
              className="relative z-10 rounded-md px-1 py-2 text-[11px] transition-all duration-300 ease-in-out data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:px-2 sm:text-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="applications"
              className="relative z-10 rounded-md px-1 py-2 text-[11px] transition-all duration-300 ease-in-out data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:px-2 sm:text-sm"
            >
              <span className="inline-flex items-center justify-center gap-1">
                <span className="leading-tight">Applications</span>
                {initialStats.pending > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums data-[state=active]:bg-primary-foreground/25 data-[state=active]:text-primary-foreground">
                    {initialStats.pending}
                  </span>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="change-requests"
              className="relative z-10 rounded-md px-1 py-2 text-[11px] transition-all duration-300 ease-in-out data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:px-2 sm:text-sm"
            >
              <span className="inline-flex items-center justify-center gap-1">
                <span className="leading-tight hidden min-[400px]:inline">Requests</span>
                <span className="leading-tight min-[400px]:hidden">Req.</span>
                {initialChangeRequests.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums data-[state=active]:bg-primary-foreground/25 data-[state=active]:text-primary-foreground">
                    {initialChangeRequests.length}
                  </span>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="relative z-10 rounded-md px-1 py-2 text-[11px] transition-all duration-300 ease-in-out data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:px-2 sm:text-sm"
            >
              <span className="inline-flex items-center justify-center gap-1">
                <Settings2 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span className="leading-tight hidden sm:inline">Settings</span>
              </span>
            </TabsTrigger>
          </TabsList>
          <div
            className={cn(
              "pointer-events-none absolute top-1 z-0 h-[calc(100%-8px)] rounded-md bg-primary transition-all duration-300 ease-in-out",
              activeTab === "overview" && "left-1 w-[calc(25%-4px)]",
              activeTab === "applications" && "left-[calc(25%+2px)] w-[calc(25%-4px)]",
              activeTab === "change-requests" && "left-[calc(50%+2px)] w-[calc(25%-4px)]",
              activeTab === "settings" && "left-[calc(75%+2px)] w-[calc(25%-4px)]"
            )}
            aria-hidden
          />
        </div>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <LeaveOverviewCards stats={initialStats} />
          <EmployeeLeaveOverviewTable
            employees={initialEmployeeOverview}
            selectedYear={overviewYear}
            yearMin={currentYear - 10}
            yearMax={currentYear + 1}
            onYearChange={(y) => router.replace(`/leave?year=${y}`)}
          />
          <LeaveCalendar applications={initialApplications} showEmployeeName />
        </TabsContent>

        <TabsContent value="applications" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {leaveStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {leaveTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {allUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <LeaveApplicationTable
            applications={filteredApplications}
            isAdmin
            onApprove={(id) => setConfirmAction({ type: "approve", leaveId: id })}
            onReject={(id) => setConfirmAction({ type: "reject", leaveId: id })}
            onCancel={(id) => setConfirmAction({ type: "cancel", leaveId: id })}
            onEdit={(app) => {
              setEditingApp(app)
              setShowEditDialog(true)
            }}
            onView={(app) => {
              setSelectedApp(app)
              setShowDetailDialog(true)
            }}
          />
        </TabsContent>

        <TabsContent value="change-requests" className="mt-4">
          <ChangeRequestsTable
            requests={initialChangeRequests}
            isAdmin
            onSuccess={refresh}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-4">
          <LeaveEntitlementSettings
            defaults={initialEntitlementDefaults}
            onSuccess={refresh}
          />
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Employee Balance Overrides</h3>
                <p className="text-sm text-muted-foreground">
                  Adjust an individual employee&apos;s entitled days for the current year.
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowBalanceEdit(true)}>
                Override Balance
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <LeaveApplicationForm
        open={showApplyForm}
        onOpenChange={setShowApplyForm}
        balances={adminBalances}
        onSuccess={refresh}
      />

      <LeaveDetailDialog
        application={selectedApp}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        isAdmin
        onSuccess={refresh}
      />

      <AdminEditLeaveDialog
        application={editingApp}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={refresh}
      />

      <EmployeeBalanceEditDialog
        open={showBalanceEdit}
        onOpenChange={setShowBalanceEdit}
        users={allUsers}
        currentYear={currentYear}
        onSuccess={refresh}
      />

      {/* Confirm Action Dialog */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null)
            setConfirmRemarks("")
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "approve"
                ? "Approve Leave"
                : confirmAction?.type === "reject"
                  ? "Reject Leave"
                  : "Cancel Leave"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {confirmAction?.type === "approve"
                ? "Are you sure you want to approve this leave application?"
                : confirmAction?.type === "reject"
                  ? "Are you sure you want to reject this leave application?"
                  : "Are you sure you want to cancel this leave? The balance will be restored."}
            </p>
            <div>
              <Label htmlFor="confirm-remarks">Remarks (optional)</Label>
              <Textarea
                id="confirm-remarks"
                value={confirmRemarks}
                onChange={(e) => setConfirmRemarks(e.target.value)}
                placeholder="Add remarks..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmAction(null)
                setConfirmRemarks("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmAction?.type === "approve" ? "default" : "destructive"
              }
              onClick={handleConfirmAction}
              disabled={confirmLoading}
            >
              {confirmLoading
                ? "Processing..."
                : confirmAction?.type === "approve"
                  ? "Approve"
                  : confirmAction?.type === "reject"
                    ? "Reject"
                    : "Cancel Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

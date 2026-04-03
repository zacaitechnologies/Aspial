"use client"

import { useState, useCallback } from "react"
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
import { Card, CardContent } from "@/components/ui/card"
import { Plus } from "lucide-react"
import LeaveBalanceCards from "./LeaveBalanceCards"
import LeaveApplicationTable from "./LeaveApplicationTable"
import LeaveApplicationForm from "./LeaveApplicationForm"
import LeaveDetailDialog from "./LeaveDetailDialog"
import LeaveChangeRequestDialog from "./LeaveChangeRequestDialog"
import LeaveCalendar from "./LeaveCalendar"
import { requestLeaveChange } from "../action"
import { useToast } from "@/components/ui/use-toast"
import type {
  LeaveApplicationDTO,
  LeaveBalanceDTO,
  LeaveChangeRequestDTO,
} from "../types"
import { leaveTypeOptions, leaveStatusOptions } from "../types"
import { format } from "date-fns"
import { LeaveTypeBadge, LeaveStatusBadge } from "./LeaveStatusBadge"

interface UserLeaveViewProps {
  initialApplications: LeaveApplicationDTO[]
  initialBalances: LeaveBalanceDTO[]
  initialChangeRequests: LeaveChangeRequestDTO[]
  userId: string
  currentYear: number
}

export default function UserLeaveView({
  initialApplications,
  initialBalances,
  initialChangeRequests,
  userId,
  currentYear,
}: UserLeaveViewProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [showApplyForm, setShowApplyForm] = useState(false)
  const [selectedApp, setSelectedApp] = useState<LeaveApplicationDTO | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [changeRequestApp, setChangeRequestApp] = useState<LeaveApplicationDTO | null>(null)
  const [changeRequestType, setChangeRequestType] = useState<"CANCEL" | "EDIT">("CANCEL")
  const [showChangeRequest, setShowChangeRequest] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const filteredApplications = initialApplications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false
    if (typeFilter !== "all" && app.leaveType !== typeFilter) return false
    return true
  })

  const refresh = useCallback(() => router.refresh(), [router])

  // Compute last and next leave
  const today = new Date()
  const approvedLeaves = initialApplications.filter(
    (a) => a.status === "APPROVED"
  )
  const pastLeaves = approvedLeaves
    .filter((a) => new Date(a.endDate) < today)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
  const futureLeaves = initialApplications
    .filter(
      (a) =>
        (a.status === "APPROVED" || a.status === "PENDING") &&
        new Date(a.startDate) >= today
    )
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  const lastLeave = pastLeaves[0] ?? null
  const nextLeave = futureLeaves[0] ?? null

  async function handleCancelPending(app: LeaveApplicationDTO) {
    // For PENDING leaves, user can cancel directly by creating a cancel request
    try {
      await requestLeaveChange({
        leaveApplicationId: app.id,
        type: "CANCEL",
        reason: "User cancelled pending leave",
      })
      toast({ title: "Cancel request submitted" })
      refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Leaves</h1>
        <Button onClick={() => setShowApplyForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Apply Leave
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <LeaveBalanceCards balances={initialBalances} />

          {/* Last & Next Leave */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Last Leave
                </p>
                {lastLeave ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <LeaveTypeBadge type={lastLeave.leaveType} />
                    </div>
                    <p className="text-sm">
                      {format(new Date(lastLeave.startDate), "MMM d, yyyy")}
                      {lastLeave.startDate !== lastLeave.endDate && (
                        <> - {format(new Date(lastLeave.endDate), "MMM d, yyyy")}</>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lastLeave.totalDays} day(s)
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No past leaves</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Next Leave
                </p>
                {nextLeave ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <LeaveTypeBadge type={nextLeave.leaveType} />
                      <LeaveStatusBadge status={nextLeave.status} />
                    </div>
                    <p className="text-sm">
                      {format(new Date(nextLeave.startDate), "MMM d, yyyy")}
                      {nextLeave.startDate !== nextLeave.endDate && (
                        <> - {format(new Date(nextLeave.endDate), "MMM d, yyyy")}</>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {nextLeave.totalDays} day(s)
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No upcoming leaves
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <LeaveCalendar applications={initialApplications} />
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
          </div>

          <LeaveApplicationTable
            applications={filteredApplications}
            isAdmin={false}
            onView={(app) => {
              setSelectedApp(app)
              setShowDetailDialog(true)
            }}
            onRequestCancel={(app) => {
              if (app.status === "PENDING") {
                handleCancelPending(app)
              } else {
                setChangeRequestApp(app)
                setChangeRequestType("CANCEL")
                setShowChangeRequest(true)
              }
            }}
            onRequestEdit={(app) => {
              setChangeRequestApp(app)
              setChangeRequestType("EDIT")
              setShowChangeRequest(true)
            }}
          />

          {/* Show user's change requests */}
          {initialChangeRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                My Change Requests
              </h3>
              <div className="space-y-2">
                {initialChangeRequests.map((cr) => (
                  <Card key={cr.id} className="shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-medium ${
                            cr.type === "CANCEL" ? "text-red-600" : "text-blue-600"
                          }`}
                        >
                          {cr.type === "CANCEL" ? "Cancel" : "Edit"} Request
                        </span>
                        <span className="text-sm text-muted-foreground">
                          for {cr.leaveApplication.leaveType.toLowerCase()} leave (
                          {format(new Date(cr.leaveApplication.startDate), "MMM d")} -{" "}
                          {format(new Date(cr.leaveApplication.endDate), "MMM d")})
                        </span>
                      </div>
                      <LeaveStatusBadge status={cr.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <LeaveApplicationForm
        open={showApplyForm}
        onOpenChange={setShowApplyForm}
        balances={initialBalances}
        onSuccess={refresh}
      />

      <LeaveDetailDialog
        application={selectedApp}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        isAdmin={false}
      />

      <LeaveChangeRequestDialog
        application={changeRequestApp}
        type={changeRequestType}
        open={showChangeRequest}
        onOpenChange={setShowChangeRequest}
        onSuccess={refresh}
      />
    </div>
  )
}

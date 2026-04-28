"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { LeaveStatusBadge, LeaveTypeBadge } from "./LeaveStatusBadge"
import type { LeaveApplicationDTO } from "../types"
import { format } from "date-fns"
import { approveLeave, rejectLeave, cancelLeave } from "../action"
import { useToast } from "@/components/ui/use-toast"

interface LeaveDetailDialogProps {
  application: LeaveApplicationDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin: boolean
  onSuccess?: () => void
}

export default function LeaveDetailDialog({
  application,
  open,
  onOpenChange,
  isAdmin,
  onSuccess,
}: LeaveDetailDialogProps) {
  const [remarks, setRemarks] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  if (!application) return null

  async function handleAction(action: "approve" | "reject" | "cancel") {
    if (!application) return
    setIsLoading(true)
    try {
      if (action === "approve") await approveLeave(application.id, remarks)
      else if (action === "reject") await rejectLeave(application.id, remarks)
      else await cancelLeave(application.id, remarks)

      toast({
        title: `Leave ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "cancelled"}`,
      })
      setRemarks("")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Leave Application Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Employee</p>
              <p className="font-medium">
                {application.user.firstName} {application.user.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <LeaveStatusBadge status={application.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Leave Type</p>
              <LeaveTypeBadge type={application.leaveType} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">
                {application.totalDays} day(s)
                {application.unpaidDays > 0 && (
                  <span className="text-orange-600 text-sm ml-1">
                    ({application.unpaidDays} unpaid)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">
                {format(new Date(application.startDate), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date</p>
              <p className="font-medium">
                {format(new Date(application.endDate), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          {application.halfDay !== "NONE" && (
            <div>
              <p className="text-sm text-muted-foreground">Half Day</p>
              <p className="font-medium">
                {application.halfDay === "FIRST_HALF" ? "First Half (AM)" : "Second Half (PM)"}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">Reason</p>
            <p className="text-sm">{application.reason}</p>
          </div>

          {application.adminRemarks && (
            <div>
              <p className="text-sm text-muted-foreground">Admin Remarks</p>
              <p className="text-sm">{application.adminRemarks}</p>
            </div>
          )}

          {application.reviewedBy && (
            <div>
              <p className="text-sm text-muted-foreground">Reviewed By</p>
              <p className="text-sm">
                {application.reviewedBy.firstName} {application.reviewedBy.lastName}
                {application.reviewedAt && (
                  <span className="text-muted-foreground ml-1">
                    on {format(new Date(application.reviewedAt), "MMM d, yyyy")}
                  </span>
                )}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">Applied On</p>
            <p className="text-sm">
              {format(new Date(application.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>

          {/* Change requests */}
          {application.changeRequests?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Change Requests</p>
              <div className="space-y-2">
                {application.changeRequests.map((cr) => (
                  <div key={cr.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {cr.type === "CANCEL" ? "Cancel Request" : "Edit Request"}
                      </span>
                      <LeaveStatusBadge status={cr.status} />
                    </div>
                    <p className="text-muted-foreground mt-1">{cr.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin actions */}
          {isAdmin && application.status === "PENDING" && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label htmlFor="remarks">Remarks (optional)</Label>
                <Textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add remarks..."
                  rows={2}
                  className="mt-1"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="destructive"
                  onClick={() => handleAction("reject")}
                  disabled={isLoading}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleAction("approve")}
                  disabled={isLoading}
                >
                  Approve
                </Button>
              </DialogFooter>
            </div>
          )}

          {isAdmin &&
            (application.status === "APPROVED" || application.status === "PENDING") &&
            application.status !== "PENDING" && (
              <div className="pt-2 border-t">
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction("cancel")}
                    disabled={isLoading}
                  >
                    Cancel Leave
                  </Button>
                </DialogFooter>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

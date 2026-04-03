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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { LeaveStatusBadge, LeaveTypeBadge } from "./LeaveStatusBadge"
import type { LeaveChangeRequestDTO } from "../types"
import { approveChangeRequest, rejectChangeRequest } from "../action"
import { format } from "date-fns"
import { Check, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ChangeRequestsTableProps {
  requests: LeaveChangeRequestDTO[]
  isAdmin: boolean
  onSuccess?: () => void
}

export default function ChangeRequestsTable({
  requests,
  isAdmin,
  onSuccess,
}: ChangeRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<LeaveChangeRequestDTO | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [remarks, setRemarks] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  async function handleAction() {
    if (!selectedRequest || !actionType) return
    setIsLoading(true)
    try {
      if (actionType === "approve") {
        await approveChangeRequest(selectedRequest.id, remarks)
      } else {
        await rejectChangeRequest(selectedRequest.id, remarks)
      }
      toast({
        title: `Change request ${actionType === "approve" ? "approved" : "rejected"}`,
      })
      setSelectedRequest(null)
      setActionType(null)
      setRemarks("")
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

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No change requests found.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Leave</TableHead>
              <TableHead>Request Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">
                  {req.leaveApplication.user.firstName}{" "}
                  {req.leaveApplication.user.lastName}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <LeaveTypeBadge type={req.leaveApplication.leaveType} />
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(req.leaveApplication.startDate), "MMM d")} -{" "}
                      {format(new Date(req.leaveApplication.endDate), "MMM d, yyyy")}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-sm font-medium ${
                      req.type === "CANCEL" ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {req.type === "CANCEL" ? "Cancel" : "Edit"}
                  </span>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">
                  {req.reason}
                </TableCell>
                <TableCell>
                  <LeaveStatusBadge status={req.status} />
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(req.created_at), "MMM d, yyyy")}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    {req.status === "PENDING" && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => {
                            setSelectedRequest(req)
                            setActionType("approve")
                          }}
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedRequest(req)
                            setActionType("reject")
                          }}
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirm Dialog */}
      <Dialog
        open={!!selectedRequest && !!actionType}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null)
            setActionType(null)
            setRemarks("")
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve" : "Reject"} Change Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {actionType === "approve"
                ? "This will apply the requested changes to the leave application."
                : "This will reject the change request. The leave will remain unchanged."}
            </p>
            <div>
              <Label htmlFor="action-remarks">Remarks (optional)</Label>
              <Textarea
                id="action-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
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
                setSelectedRequest(null)
                setActionType(null)
                setRemarks("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={isLoading}
            >
              {isLoading
                ? "Processing..."
                : actionType === "approve"
                  ? "Approve"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { LeaveStatusBadge, LeaveTypeBadge } from "./LeaveStatusBadge"
import type { LeaveApplicationDTO, LeaveTypeDTO } from "../types"
import { format } from "date-fns"
import { formatMYTDateForDisplay } from "@/lib/date-utils"
import { Check, X, Pencil, Ban, Eye, FileText } from "lucide-react"
import { leaveAttachmentUrlIsPdf } from "../leave-attachment-utils"
import {
  leaveTableHeadClass,
  leaveTableHeadRowClass,
  leaveTableShellClass,
} from "../leave-table-styles"
import { cn } from "@/lib/utils"

interface LeaveApplicationTableProps {
  applications: LeaveApplicationDTO[]
  isAdmin: boolean
  leaveTypes?: LeaveTypeDTO[]
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
  onCancel?: (id: number) => void
  onEdit?: (application: LeaveApplicationDTO) => void
  onView?: (application: LeaveApplicationDTO) => void
  onRequestCancel?: (application: LeaveApplicationDTO) => void
  onRequestEdit?: (application: LeaveApplicationDTO) => void
}

export default function LeaveApplicationTable({
  applications,
  isAdmin,
  leaveTypes,
  onApprove,
  onReject,
  onCancel,
  onEdit,
  onView,
  onRequestCancel,
  onRequestEdit,
}: LeaveApplicationTableProps) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No leave applications found.
      </div>
    )
  }

  return (
    <div className={leaveTableShellClass}>
      <Table>
        <TableHeader>
          <TableRow className={leaveTableHeadRowClass}>
            {isAdmin && (
              <TableHead className={leaveTableHeadClass}>Employee</TableHead>
            )}
            <TableHead className={leaveTableHeadClass}>Type</TableHead>
            <TableHead className={leaveTableHeadClass}>Dates</TableHead>
            <TableHead className={leaveTableHeadClass}>Days</TableHead>
            <TableHead className={leaveTableHeadClass}>Status</TableHead>
            <TableHead className={leaveTableHeadClass}>Unpaid</TableHead>
            <TableHead className={cn("text-right", leaveTableHeadClass)}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => {
            const hasPendingChangeRequest = app.changeRequests?.some(
              (cr) => cr.status === "PENDING"
            )

            return (
              <TableRow key={app.id}>
                {isAdmin && (
                  <TableCell className="font-medium">
                    {app.user.firstName} {app.user.lastName}
                  </TableCell>
                )}
                <TableCell>
                  <LeaveTypeBadge type={app.leaveType} types={leaveTypes} />
                </TableCell>
                <TableCell className="text-sm">
                  {formatMYTDateForDisplay(new Date(app.startDate))}
                  {String(app.startDate) !== String(app.endDate) && (
                    <> - {formatMYTDateForDisplay(new Date(app.endDate))}</>
                  )}
                  {app.halfDay !== "NONE" && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({app.halfDay === "FIRST_HALF" ? "AM" : "PM"})
                    </span>
                  )}
                </TableCell>
                <TableCell>{app.totalDays}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <LeaveStatusBadge status={app.status} />
                    {hasPendingChangeRequest && (
                      <span className="text-xs text-orange-600">Change requested</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {app.unpaidDays > 0 ? (
                    <span className="text-orange-600 font-medium">{app.unpaidDays}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {app.attachmentUrl && leaveAttachmentUrlIsPdf(app.attachmentUrl) ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a
                          href={app.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View PDF attachment"
                          aria-label="View PDF attachment"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onView?.(app)}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {isAdmin && app.status === "PENDING" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => onApprove?.(app.id)}
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onReject?.(app.id)}
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {isAdmin &&
                      (app.status === "PENDING" || app.status === "APPROVED") && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit?.(app)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onCancel?.(app.id)}
                            title="Cancel"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                    {!isAdmin && app.status === "PENDING" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onRequestCancel?.(app)}
                        title="Cancel"
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}

                    {!isAdmin &&
                      app.status === "APPROVED" &&
                      !hasPendingChangeRequest && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => onRequestCancel?.(app)}
                          >
                            Request Cancel
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => onRequestEdit?.(app)}
                          >
                            Request Edit
                          </Button>
                        </>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

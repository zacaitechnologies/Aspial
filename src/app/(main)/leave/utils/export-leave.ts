import * as XLSX from "@e965/xlsx"
import { formatDateStringDirect, formatMYTDateForDisplay, toBusinessTZParts } from "@/lib/date-utils"
import type { LeaveApplicationDTO, LeaveTypeDTO } from "../types"
import { formatLeaveTypeName } from "../types"

export interface LeaveExportFilenameMeta {
  startDate: string
  endDate: string
}

const HALF_DAY_LABEL: Record<string, string> = {
  NONE: "Full Day",
  FIRST_HALF: "First Half (AM)",
  SECOND_HALF: "Second Half (PM)",
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

function formatMYTDate(date: Date): string {
  return formatDateStringDirect(toBusinessTZParts(date).dateStr)
}

export function exportLeaveApplicationsToExcel(
  rows: LeaveApplicationDTO[],
  leaveTypes: LeaveTypeDTO[],
  meta: LeaveExportFilenameMeta,
): void {
  const excelData = rows.map((row) => ({
    "Application ID": row.id,
    "First Name": row.user.firstName,
    "Last Name": row.user.lastName,
    Email: row.user.email,
    Role: row.user.staffRole?.roleName ?? "",
    "Leave Type": formatLeaveTypeName(row.leaveType, leaveTypes),
    Status: STATUS_LABEL[row.status] ?? row.status,
    "Start Date": formatMYTDate(row.startDate),
    "End Date": formatMYTDate(row.endDate),
    "Half-Day": HALF_DAY_LABEL[row.halfDay] ?? row.halfDay,
    "Total Days": row.totalDays,
    "Unpaid Days": row.unpaidDays,
    Reason: row.reason,
    "Admin Remarks": row.adminRemarks ?? "",
    "Reviewed By": row.reviewedBy
      ? `${row.reviewedBy.firstName} ${row.reviewedBy.lastName}`
      : "",
    "Reviewed At": row.reviewedAt ? formatMYTDateForDisplay(row.reviewedAt) : "",
    "Submitted At": formatMYTDateForDisplay(row.created_at),
  }))

  const worksheet = XLSX.utils.json_to_sheet(excelData, {
    header: [
      "Application ID",
      "First Name",
      "Last Name",
      "Email",
      "Role",
      "Leave Type",
      "Status",
      "Start Date",
      "End Date",
      "Half-Day",
      "Total Days",
      "Unpaid Days",
      "Reason",
      "Admin Remarks",
      "Reviewed By",
      "Reviewed At",
      "Submitted At",
    ],
  })

  worksheet["!cols"] = [
    { wch: 12 }, // Application ID
    { wch: 14 }, // First Name
    { wch: 14 }, // Last Name
    { wch: 26 }, // Email
    { wch: 18 }, // Role
    { wch: 18 }, // Leave Type
    { wch: 12 }, // Status
    { wch: 14 }, // Start Date
    { wch: 14 }, // End Date
    { wch: 18 }, // Half-Day
    { wch: 11 }, // Total Days
    { wch: 11 }, // Unpaid Days
    { wch: 40 }, // Reason
    { wch: 30 }, // Admin Remarks
    { wch: 20 }, // Reviewed By
    { wch: 14 }, // Reviewed At
    { wch: 14 }, // Submitted At
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Applications")

  const filename = `Leave_Export_${meta.startDate}_to_${meta.endDate}.xlsx`
  XLSX.writeFile(workbook, filename)
}

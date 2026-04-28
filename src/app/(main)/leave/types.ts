import type { LeaveType, LeaveStatus, LeaveHalfDay, ChangeRequestType, ChangeRequestStatus } from "@prisma/client"
import { eachDayOfInterval, isSunday } from "date-fns"

/** Mon–Sat are working days; only Sunday is off (common Malaysia office pattern). */
export function isMalaysiaNonWorkingDay(date: Date): boolean {
  return isSunday(date)
}

export function calculateLeaveDaysClient(
  startDate: Date,
  endDate: Date,
  halfDay: string
): number {
  if (halfDay !== "NONE") return 0.5
  try {
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    return days.filter((d) => !isMalaysiaNonWorkingDay(d)).length
  } catch {
    return 0
  }
}

export interface LeaveApplicationDTO {
  id: number
  userId: string
  leaveType: LeaveType
  startDate: Date
  endDate: Date
  halfDay: LeaveHalfDay
  reason: string
  attachmentUrl: string | null
  status: LeaveStatus
  adminRemarks: string | null
  reviewedAt: Date | null
  totalDays: number
  unpaidDays: number
  created_at: Date
  updated_at: Date
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    profilePicture: string | null
    staffRole: { roleName: string } | null
  }
  reviewedBy: {
    firstName: string
    lastName: string
  } | null
  changeRequests: LeaveChangeRequestDTO[]
}

export interface LeaveBalanceDTO {
  id: number
  userId: string
  leaveType: LeaveType
  year: number
  entitled: number
  used: number
  pending: number
  balance: number
}

export interface LeaveChangeRequestDTO {
  id: number
  leaveApplicationId: number
  type: ChangeRequestType
  status: ChangeRequestStatus
  reason: string
  newStartDate: Date | null
  newEndDate: Date | null
  newLeaveType: LeaveType | null
  newHalfDay: LeaveHalfDay | null
  newReason: string | null
  adminRemarks: string | null
  reviewedAt: Date | null
  created_at: Date
  requestedBy: {
    id: string
    firstName: string
    lastName: string
  }
  reviewedBy: {
    firstName: string
    lastName: string
  } | null
  leaveApplication: {
    id: number
    leaveType: LeaveType
    startDate: Date
    endDate: Date
    totalDays: number
    user: {
      id: string
      firstName: string
      lastName: string
    }
  }
}

export interface EmployeeLeaveOverview {
  userId: string
  firstName: string
  lastName: string
  profilePicture: string | null
  staffRole: string | null
  lastLeave: {
    leaveType: LeaveType
    startDate: Date
    endDate: Date
  } | null
  nextLeave: {
    leaveType: LeaveType
    startDate: Date
    endDate: Date
    status: LeaveStatus
  } | null
  balances: LeaveBalanceDTO[]
}

export interface LeaveStats {
  pending: number
  approved: number
  rejected: number
  onLeaveToday: number
}

export interface EntitlementDefaultDTO {
  id: number
  leaveType: LeaveType
  entitledDays: number
}

export const leaveTypeOptions = [
  { value: "PAID", label: "Paid leave" },
  { value: "UNPAID", label: "Unpaid leave" },
] as const

export const leaveStatusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
] as const

export const halfDayOptions = [
  { value: "NONE", label: "Full Day" },
  { value: "FIRST_HALF", label: "First Half (AM)" },
  { value: "SECOND_HALF", label: "Second Half (PM)" },
] as const

/** Calendar / chip styles — theme tokens for contrast */
export const leaveTypeColorMap: Record<string, string> = {
  PAID: "bg-primary/20 text-primary border border-primary/40",
  UNPAID: "bg-muted text-foreground border border-border",
}

export const leaveStatusColorMap: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
}

export const DEFAULT_ENTITLEMENTS: Record<string, number> = {
  PAID: 14,
  UNPAID: 0,
}

import type { LeaveType, LeaveStatus, LeaveHalfDay, ChangeRequestType, ChangeRequestStatus } from "@prisma/client"
import { eachDayOfInterval, isWeekend } from "date-fns"

export function calculateLeaveDaysClient(
  startDate: Date,
  endDate: Date,
  halfDay: string
): number {
  if (halfDay !== "NONE") return 0.5
  try {
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    return days.filter((d) => !isWeekend(d)).length
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
  { value: "ANNUAL", label: "Annual" },
  { value: "MEDICAL", label: "Medical/Sick" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "HOSPITALIZATION", label: "Hospitalization" },
  { value: "COMPASSIONATE", label: "Compassionate" },
  { value: "MATERNITY", label: "Maternity" },
  { value: "PATERNITY", label: "Paternity" },
  { value: "REPLACEMENT", label: "Replacement" },
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

export const leaveTypeColorMap: Record<string, string> = {
  ANNUAL: "bg-blue-100 text-blue-800",
  MEDICAL: "bg-red-100 text-red-800",
  EMERGENCY: "bg-orange-100 text-orange-800",
  UNPAID: "bg-gray-100 text-gray-800",
  HOSPITALIZATION: "bg-purple-100 text-purple-800",
  COMPASSIONATE: "bg-pink-100 text-pink-800",
  MATERNITY: "bg-teal-100 text-teal-800",
  PATERNITY: "bg-cyan-100 text-cyan-800",
  REPLACEMENT: "bg-yellow-100 text-yellow-800",
}

export const leaveStatusColorMap: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
}

export const DEFAULT_ENTITLEMENTS: Record<string, number> = {
  ANNUAL: 14,
  MEDICAL: 14,
  EMERGENCY: 3,
  UNPAID: 0,
  HOSPITALIZATION: 60,
  COMPASSIONATE: 3,
  MATERNITY: 60,
  PATERNITY: 7,
  REPLACEMENT: 0,
}

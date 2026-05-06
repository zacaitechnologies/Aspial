import type { LeaveStatus, LeaveHalfDay, ChangeRequestType, ChangeRequestStatus } from "@prisma/client"

/** Mon–Sat are working days; only Sunday is off (common Malaysia office pattern). */
export function isMalaysiaNonWorkingDay(dateStr: string): boolean {
  // Zeller's congruence — fully timezone-independent.
  const [yStr, mStr, dStr] = dateStr.split("-")
  const year = parseInt(yStr, 10)
  let m = parseInt(mStr, 10)
  let y = year
  if (m < 3) {
    m += 12
    y -= 1
  }
  const q = parseInt(dStr, 10)
  const k = y % 100
  const j = Math.floor(y / 100)
  const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
  // h: 0=Saturday, 1=Sunday, ... — Sunday is non-working.
  return h === 1
}

/** Inclusive enumeration of YYYY-MM-DD strings between two dates. */
export function enumerateLeaveDays(startStr: string, endStr: string): string[] {
  if (endStr < startStr) return []
  const out: string[] = []
  const [sy, sm, sd] = startStr.split("-").map(Number)
  // Use UTC math so we never depend on the runtime timezone.
  let cursor = Date.UTC(sy, sm - 1, sd)
  const [ey, em, ed] = endStr.split("-").map(Number)
  const endMs = Date.UTC(ey, em - 1, ed)
  while (cursor <= endMs) {
    const d = new Date(cursor)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, "0")
    const day = String(d.getUTCDate()).padStart(2, "0")
    out.push(`${y}-${m}-${day}`)
    cursor += 24 * 60 * 60 * 1000
  }
  return out
}

export function calculateLeaveDaysClient(
  startDate: string,
  endDate: string,
  halfDay: string
): number {
  if (halfDay !== "NONE") return 0.5
  if (!startDate || !endDate) return 0
  return enumerateLeaveDays(startDate, endDate).filter((d) => !isMalaysiaNonWorkingDay(d)).length
}

/** Leave-type metadata — the runtime shape persisted in the leave_type table. */
export interface LeaveTypeDTO {
  id: number
  code: string
  name: string
  defaultEntitlement: number
  isDeletable: boolean
  isUnpaid: boolean
  requiresReplacementDate: boolean
  sortOrder: number
  isActive: boolean
}

export interface LeaveApplicationDTO {
  id: number
  userId: string
  leaveType: string
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
  leaveType: string
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
  newLeaveType: string | null
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
    leaveType: string
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
    leaveType: string
    startDate: Date
    endDate: Date
  } | null
  nextLeave: {
    leaveType: string
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

export const leaveStatusColorMap: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
}

/**
 * Stable colour palette for leave-type chips. Custom codes fall back to the default token.
 */
const LEAVE_TYPE_COLOR_PALETTE: Record<string, string> = {
  ANNUAL: "bg-primary/20 text-primary border border-primary/40",
  MEDICAL: "bg-rose-100 text-rose-800 border border-rose-200",
  MATERNITY: "bg-pink-100 text-pink-800 border border-pink-200",
  PATERNITY: "bg-sky-100 text-sky-800 border border-sky-200",
  REPLACEMENT: "bg-amber-100 text-amber-800 border border-amber-200",
  UNPAID: "bg-muted text-foreground border border-border",
}

export function leaveTypeChipClasses(code: string): string {
  return (
    LEAVE_TYPE_COLOR_PALETTE[code] ??
    "bg-emerald-100 text-emerald-800 border border-emerald-200"
  )
}

/**
 * Display label for a leave-type code. Prefers the DB `name`; falls back to a
 * Title-Case version of the code so badges still render before metadata loads.
 */
export function formatLeaveTypeName(code: string, types?: Pick<LeaveTypeDTO, "code" | "name">[]): string {
  const match = types?.find((t) => t.code === code)
  if (match) return match.name
  return code
    .split("_")
    .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
    .join(" ")
}

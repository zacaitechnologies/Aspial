"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath, revalidateTag } from "next/cache"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import {
  applyLeaveSchema,
  reviewLeaveSchema,
  adminEditLeaveSchema,
  leaveChangeRequestSchema,
  cancelOwnPendingLeaveSchema,
  withdrawChangeRequestSchema,
  reviewChangeRequestSchema,
  updateEmployeeBalanceSchema,
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  bulkUpsertLeaveBalancesSchema,
  type ApplyLeaveValues,
  type AdminEditLeaveValues,
  type LeaveChangeRequestValues,
  type CancelOwnPendingLeaveValues,
  type WithdrawChangeRequestValues,
  type LeaveFilters,
  type UpdateEmployeeBalanceValues,
  type CreateLeaveTypeValues,
  type UpdateLeaveTypeValues,
  type BulkUpsertLeaveBalancesValues,
} from "@/lib/validation"
import { enumerateLeaveDays, isMalaysiaNonWorkingDay } from "./types"
import { getMalaysiaYear, getMalaysiaDayBoundaries } from "@/lib/malaysia-time"
import { parseDateInBusinessTZ, toBusinessTZParts } from "@/lib/date-utils"
import type {
  LeaveApplicationDTO,
  LeaveBalanceDTO,
  LeaveChangeRequestDTO,
  EmployeeLeaveOverview,
  LeaveStats,
  LeaveTypeDTO,
} from "./types"

function revalidateLeaveAndCalendar() {
	revalidatePath("/leave")
	revalidateTag("calendar", { expire: 0 })
}

// ─── Auth ────────────────────────────────────────────────────────

export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return redirect("/login")
    return user
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error
    throw new Error("Authentication failed")
  }
}

export async function getUserWithRole() {
  const user = await getCurrentUser()
  const [isAdmin, dbUser] = await Promise.all([
    getCachedIsUserAdmin(user.id),
    prisma.user.findUnique({
      where: { supabase_id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        supabase_id: true,
        profilePicture: true,
        staffRole: { select: { roleName: true } },
      },
    }),
  ])
  if (!dbUser) return redirect("/login")
  return { user: dbUser, isAdmin }
}

// ─── Helpers ─────────────────────────────────────────────────────

function calculateLeaveDays(
  startDate: string,
  endDate: string,
  halfDay: string
): number {
  if (halfDay !== "NONE") return 0.5
  return enumerateLeaveDays(startDate, endDate).filter((d) => !isMalaysiaNonWorkingDay(d)).length
}

/** YYYY-MM-DD → MYT-midnight UTC instant for Prisma storage. */
function toMYTDate(dateStr: string): Date {
  return parseDateInBusinessTZ(`${dateStr}T00:00:00`)
}

/** UTC instant from Prisma → YYYY-MM-DD interpreted in MYT. */
function toMYTDateStr(date: Date): string {
  return toBusinessTZParts(date).dateStr
}

/** Returns active leave types ordered by sortOrder asc, code asc. */
async function fetchActiveLeaveTypes() {
  return prisma.leaveType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  })
}

/** Look up a single leave type's metadata by code. Throws if missing. */
async function getLeaveTypeOrThrow(code: string) {
  const t = await prisma.leaveType.findUnique({ where: { code } })
  if (!t) throw new Error(`Unknown leave type: ${code}`)
  return t
}

/**
 * Idempotently create a LeaveBalance row for every active leave type for a user/year.
 * Existing rows are preserved; new types added later will be auto-created on next call.
 */
export async function initializeLeaveBalances(userId: string, year: number) {
  const [existing, types] = await Promise.all([
    prisma.leaveBalance.findMany({ where: { userId, year } }),
    fetchActiveLeaveTypes(),
  ])

  const existingCodes = new Set(existing.map((b) => b.leaveType))
  const missing = types.filter((t) => !existingCodes.has(t.code))

  if (missing.length > 0) {
    await prisma.leaveBalance.createMany({
      data: missing.map((t) => ({
        userId,
        leaveType: t.code,
        year,
        entitled: t.defaultEntitlement,
        used: 0,
        pending: 0,
        balance: t.defaultEntitlement,
      })),
    })
  }

  return prisma.leaveBalance.findMany({ where: { userId, year } })
}

// ─── Fetch ───────────────────────────────────────────────────────

const leaveApplicationInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePicture: true,
      staffRole: { select: { roleName: true } },
    },
  },
  reviewedBy: {
    select: { firstName: true, lastName: true },
  },
  changeRequests: {
    include: {
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { created_at: "desc" as const },
  },
}

export async function fetchAllLeaveApplications(
  filters?: LeaveFilters
): Promise<LeaveApplicationDTO[]> {
  const where: Record<string, unknown> = {}
  if (filters?.status) where.status = filters.status
  if (filters?.leaveType) where.leaveType = filters.leaveType
  if (filters?.userId) where.userId = filters.userId
  if (filters?.startDate || filters?.endDate) {
    where.startDate = {}
    if (filters?.startDate) (where.startDate as Record<string, unknown>).gte = filters.startDate
    if (filters?.endDate) (where.startDate as Record<string, unknown>).lte = filters.endDate
  }

  return prisma.leaveApplication.findMany({
    where,
    include: leaveApplicationInclude,
    orderBy: { created_at: "desc" },
  }) as unknown as LeaveApplicationDTO[]
}

export async function fetchUserLeaveApplications(
  userId: string,
  filters?: LeaveFilters
): Promise<LeaveApplicationDTO[]> {
  const where: Record<string, unknown> = { userId }
  if (filters?.status) where.status = filters.status
  if (filters?.leaveType) where.leaveType = filters.leaveType
  if (filters?.startDate || filters?.endDate) {
    where.startDate = {}
    if (filters?.startDate) (where.startDate as Record<string, unknown>).gte = filters.startDate
    if (filters?.endDate) (where.startDate as Record<string, unknown>).lte = filters.endDate
  }

  return prisma.leaveApplication.findMany({
    where,
    include: leaveApplicationInclude,
    orderBy: { created_at: "desc" },
  }) as unknown as LeaveApplicationDTO[]
}

export async function fetchLeaveBalances(
  userId: string,
  year: number
): Promise<LeaveBalanceDTO[]> {
  await initializeLeaveBalances(userId, year)
  return prisma.leaveBalance.findMany({
    where: { userId, year },
    orderBy: { leaveType: "asc" },
  })
}

export async function fetchAllLeaveBalances(
  year: number
): Promise<(LeaveBalanceDTO & { user: { firstName: string; lastName: string } })[]> {
  return prisma.leaveBalance.findMany({
    where: { year },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: [{ userId: "asc" }, { leaveType: "asc" }],
  }) as unknown as (LeaveBalanceDTO & { user: { firstName: string; lastName: string } })[]
}

/** Ensures every user has a balance row for every active leave type (idempotent). */
export async function ensureLeaveBalancesForYearForAllUsers(year: number) {
  const users = await prisma.user.findMany({ select: { id: true } })
  await Promise.all(users.map((u) => initializeLeaveBalances(u.id, year)))
}

export async function fetchAllEmployeeLeaveOverview(
  year: number
): Promise<EmployeeLeaveOverview[]> {
  await ensureLeaveBalancesForYearForAllUsers(year)

  // Use Malaysia midnight so "past" and "future" leaves are relative to the Malaysian calendar day
  const { start: todayMYT } = getMalaysiaDayBoundaries(0)

  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      staffRole: { select: { roleName: true } },
      leaveApplications: {
        where: {
          status: { in: ["APPROVED", "PENDING"] },
        },
        orderBy: { startDate: "desc" },
        select: {
          leaveType: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
      leaveBalances: {
        where: { year },
      },
    },
  })

  return users.map((u) => {
    const pastLeaves = u.leaveApplications.filter(
      (l) => l.status === "APPROVED" && new Date(l.endDate) < todayMYT
    )
    const futureLeaves = u.leaveApplications.filter(
      (l) =>
        (l.status === "APPROVED" || l.status === "PENDING") &&
        new Date(l.startDate) >= todayMYT
    )

    return {
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      profilePicture: u.profilePicture,
      staffRole: u.staffRole?.roleName ?? null,
      lastLeave: pastLeaves.length > 0
        ? {
            leaveType: pastLeaves[0].leaveType,
            startDate: pastLeaves[0].startDate,
            endDate: pastLeaves[0].endDate,
          }
        : null,
      nextLeave: futureLeaves.length > 0
        ? {
            leaveType: futureLeaves[futureLeaves.length - 1].leaveType,
            startDate: futureLeaves[futureLeaves.length - 1].startDate,
            endDate: futureLeaves[futureLeaves.length - 1].endDate,
            status: futureLeaves[futureLeaves.length - 1].status,
          }
        : null,
      balances: u.leaveBalances,
    }
  })
}

export async function fetchLeaveStats(): Promise<LeaveStats> {
  const { start: todayMYT } = getMalaysiaDayBoundaries(0)
  const { start: tomorrowMYT } = getMalaysiaDayBoundaries(1)

  const [pending, approved, rejected, onLeaveToday] = await Promise.all([
    prisma.leaveApplication.count({ where: { status: "PENDING" } }),
    prisma.leaveApplication.count({ where: { status: "APPROVED" } }),
    prisma.leaveApplication.count({ where: { status: "REJECTED" } }),
    prisma.leaveApplication.count({
      where: {
        status: "APPROVED",
        startDate: { lte: tomorrowMYT },
        endDate: { gte: todayMYT },
      },
    }),
  ])

  return { pending, approved, rejected, onLeaveToday }
}

export async function fetchPendingChangeRequests(): Promise<LeaveChangeRequestDTO[]> {
  return prisma.leaveChangeRequest.findMany({
    where: { status: "PENDING" },
    include: {
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
      leaveApplication: {
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          totalDays: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  }) as unknown as LeaveChangeRequestDTO[]
}

export async function fetchUserChangeRequests(
  userId: string
): Promise<LeaveChangeRequestDTO[]> {
  return prisma.leaveChangeRequest.findMany({
    where: { requestedById: userId },
    include: {
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
      leaveApplication: {
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          totalDays: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  }) as unknown as LeaveChangeRequestDTO[]
}

/** Read-only list for clients (forms, badges, settings). Includes inactive types only when includeInactive=true. */
export async function fetchLeaveTypes(includeInactive = false): Promise<LeaveTypeDTO[]> {
  return prisma.leaveType.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  })
}

/** Settings-page list with usage counts (for delete enable/disable). */
export async function fetchLeaveTypesWithUsage(): Promise<
  (LeaveTypeDTO & { _count: { applications: number; balances: number } })[]
> {
  return prisma.leaveType.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    include: { _count: { select: { applications: true, balances: true } } },
  }) as unknown as (LeaveTypeDTO & { _count: { applications: number; balances: number } })[]
}

export async function fetchAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePicture: true,
    },
    orderBy: { firstName: "asc" },
  })
}

// ─── Mutations ───────────────────────────────────────────────────

export async function applyForLeave(data: ApplyLeaveValues) {
  const user = await getCurrentUser()
  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
  })
  if (!dbUser) throw new Error("User not found")

  const validated = applyLeaveSchema.parse(data)
  const leaveTypeMeta = await getLeaveTypeOrThrow(validated.leaveType)
  const totalDays = calculateLeaveDays(
    validated.startDate,
    validated.endDate,
    validated.halfDay
  )

  if (totalDays <= 0) throw new Error("Invalid leave duration")

  const startDate = toMYTDate(validated.startDate)
  const endDate = toMYTDate(validated.endDate)
  const year = getMalaysiaYear(startDate)
  await initializeLeaveBalances(dbUser.id, year)

  // Calculate unpaid days. For unpaid types every day is unpaid; for paid types
  // we deduct from the entitled balance and overflow into unpaidDays.
  let unpaidDays = 0
  if (!leaveTypeMeta.isUnpaid) {
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveType_year: {
          userId: dbUser.id,
          leaveType: validated.leaveType,
          year,
        },
      },
    })
    if (balance) {
      const remaining = balance.balance - balance.pending
      if (totalDays > remaining) {
        unpaidDays = Math.max(0, totalDays - Math.max(0, remaining))
      }
    }
  } else {
    unpaidDays = totalDays
  }

  const leave = await prisma.leaveApplication.create({
    data: {
      userId: dbUser.id,
      leaveType: validated.leaveType,
      startDate,
      endDate,
      halfDay: validated.halfDay,
      reason: validated.reason,
      attachmentUrl: validated.attachmentUrl,
      totalDays,
      unpaidDays,
    },
  })

  // Update pending balance (only for the paid portion)
  if (!leaveTypeMeta.isUnpaid) {
    const paidDays = totalDays - unpaidDays
    if (paidDays > 0) {
      await prisma.leaveBalance.update({
        where: {
          userId_leaveType_year: {
            userId: dbUser.id,
            leaveType: validated.leaveType,
            year,
          },
        },
        data: {
          pending: { increment: paidDays },
          balance: { decrement: paidDays },
        },
      })
    }
  }

  revalidateLeaveAndCalendar()
  return leave
}

export async function approveLeave(leaveId: number, remarks?: string) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = reviewLeaveSchema.parse({ leaveId, remarks })
  const reviewerUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
  })

  const leave = await prisma.leaveApplication.findUnique({
    where: { id: validated.leaveId },
  })
  if (!leave) throw new Error("Leave application not found")
  if (leave.status !== "PENDING") throw new Error("Leave is not pending")

  await prisma.leaveApplication.update({
    where: { id: validated.leaveId },
    data: {
      status: "APPROVED",
      adminRemarks: validated.remarks,
      reviewedById: reviewerUser?.id,
      reviewedAt: new Date(),
    },
  })

  // Move pending to used
  const year = getMalaysiaYear(leave.startDate)
  const leaveTypeMeta = await getLeaveTypeOrThrow(leave.leaveType)
  if (!leaveTypeMeta.isUnpaid) {
    const paidDays = leave.totalDays - leave.unpaidDays
    if (paidDays > 0) {
      await prisma.leaveBalance.update({
        where: {
          userId_leaveType_year: {
            userId: leave.userId,
            leaveType: leave.leaveType,
            year,
          },
        },
        data: {
          pending: { decrement: paidDays },
          used: { increment: paidDays },
        },
      })
    }
  }

  revalidateLeaveAndCalendar()
}

export async function rejectLeave(leaveId: number, remarks?: string) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = reviewLeaveSchema.parse({ leaveId, remarks })

  const reviewerUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
  })

  const leave = await prisma.leaveApplication.findUnique({
    where: { id: validated.leaveId },
  })
  if (!leave) throw new Error("Leave application not found")
  if (leave.status !== "PENDING") throw new Error("Leave is not pending")

  await prisma.leaveApplication.update({
    where: { id: validated.leaveId },
    data: {
      status: "REJECTED",
      adminRemarks: validated.remarks,
      reviewedById: reviewerUser?.id,
      reviewedAt: new Date(),
    },
  })

  // Restore pending balance
  const year = getMalaysiaYear(leave.startDate)
  const leaveTypeMeta = await getLeaveTypeOrThrow(leave.leaveType)
  if (!leaveTypeMeta.isUnpaid) {
    const paidDays = leave.totalDays - leave.unpaidDays
    if (paidDays > 0) {
      await prisma.leaveBalance.update({
        where: {
          userId_leaveType_year: {
            userId: leave.userId,
            leaveType: leave.leaveType,
            year,
          },
        },
        data: {
          pending: { decrement: paidDays },
          balance: { increment: paidDays },
        },
      })
    }
  }

  revalidateLeaveAndCalendar()
}

export async function cancelLeave(leaveId: number, remarks?: string) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = reviewLeaveSchema.parse({ leaveId, remarks })

  const reviewerUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
  })

  const leave = await prisma.leaveApplication.findUnique({
    where: { id: validated.leaveId },
  })
  if (!leave) throw new Error("Leave application not found")
  if (leave.status !== "APPROVED" && leave.status !== "PENDING") {
    throw new Error("Can only cancel pending or approved leaves")
  }

  const wasPending = leave.status === "PENDING"

  await prisma.leaveApplication.update({
    where: { id: validated.leaveId },
    data: {
      status: "CANCELLED",
      adminRemarks: validated.remarks,
      reviewedById: reviewerUser?.id,
      reviewedAt: new Date(),
    },
  })

  // Restore balance
  const year = getMalaysiaYear(leave.startDate)
  const leaveTypeMeta = await getLeaveTypeOrThrow(leave.leaveType)
  if (!leaveTypeMeta.isUnpaid) {
    const paidDays = leave.totalDays - leave.unpaidDays
    if (paidDays > 0) {
      if (wasPending) {
        await prisma.leaveBalance.update({
          where: {
            userId_leaveType_year: {
              userId: leave.userId,
              leaveType: leave.leaveType,
              year,
            },
          },
          data: {
            pending: { decrement: paidDays },
            balance: { increment: paidDays },
          },
        })
      } else {
        await prisma.leaveBalance.update({
          where: {
            userId_leaveType_year: {
              userId: leave.userId,
              leaveType: leave.leaveType,
              year,
            },
          },
          data: {
            used: { decrement: paidDays },
            balance: { increment: paidDays },
          },
        })
      }
    }
  }

  revalidateLeaveAndCalendar()
}

/** Employee cancels their own pending leave immediately (no admin or change request). */
export async function cancelOwnPendingLeave(data: CancelOwnPendingLeaveValues) {
  const user = await getCurrentUser()
  const validated = cancelOwnPendingLeaveSchema.parse(data)

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
  })
  if (!dbUser) throw new Error("User not found")

  const leave = await prisma.leaveApplication.findUnique({
    where: { id: validated.leaveApplicationId },
  })
  if (!leave) throw new Error("Leave application not found")
  if (leave.userId !== dbUser.id) throw new Error("Unauthorized")
  if (leave.status !== "PENDING") {
    throw new Error(
      "Only pending applications can be cancelled here. For approved leave, use a cancel request."
    )
  }

  await prisma.leaveApplication.update({
    where: { id: validated.leaveApplicationId },
    data: {
      status: "CANCELLED",
      adminRemarks: validated.reason?.trim() || "Cancelled by employee",
      reviewedAt: new Date(),
    },
  })

  const year = getMalaysiaYear(leave.startDate)
  const leaveTypeMeta = await getLeaveTypeOrThrow(leave.leaveType)
  if (!leaveTypeMeta.isUnpaid) {
    const paidDays = leave.totalDays - leave.unpaidDays
    if (paidDays > 0) {
      await prisma.leaveBalance.update({
        where: {
          userId_leaveType_year: {
            userId: leave.userId,
            leaveType: leave.leaveType,
            year,
          },
        },
        data: {
          pending: { decrement: paidDays },
          balance: { increment: paidDays },
        },
      })
    }
  }

  revalidateLeaveAndCalendar()
}

/** Employee withdraws a pending change request (before admin approves or rejects). */
export async function withdrawLeaveChangeRequest(data: WithdrawChangeRequestValues) {
  const user = await getCurrentUser()
  const validated = withdrawChangeRequestSchema.parse(data)

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
  })
  if (!dbUser) throw new Error("User not found")

  const cr = await prisma.leaveChangeRequest.findUnique({
    where: { id: validated.requestId },
  })
  if (!cr) throw new Error("Change request not found")
  if (cr.requestedById !== dbUser.id) throw new Error("Unauthorized")
  if (cr.status !== "PENDING") {
    throw new Error("Only pending change requests can be withdrawn")
  }

  await prisma.leaveChangeRequest.delete({
    where: { id: validated.requestId },
  })

  revalidateLeaveAndCalendar()
}

export async function adminEditLeave(data: AdminEditLeaveValues) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = adminEditLeaveSchema.parse(data)

  const leave = await prisma.leaveApplication.findUnique({
    where: { id: validated.leaveId },
  })
  if (!leave) throw new Error("Leave application not found")

  const newStartDateStr = validated.startDate ?? toMYTDateStr(leave.startDate)
  const newEndDateStr = validated.endDate ?? toMYTDateStr(leave.endDate)
  const newStartDate = toMYTDate(newStartDateStr)
  const newEndDate = toMYTDate(newEndDateStr)
  const newHalfDay = validated.halfDay ?? leave.halfDay
  const newLeaveType = validated.leaveType ?? leave.leaveType
  const newTotalDays = calculateLeaveDays(newStartDateStr, newEndDateStr, newHalfDay)

  const year = getMalaysiaYear(leave.startDate)
  const oldPaidDays = leave.totalDays - leave.unpaidDays

  const oldTypeMeta = await getLeaveTypeOrThrow(leave.leaveType)
  const newTypeMeta = newLeaveType === leave.leaveType ? oldTypeMeta : await getLeaveTypeOrThrow(newLeaveType)

  // Calculate new unpaid days
  let newUnpaidDays = 0
  if (!newTypeMeta.isUnpaid) {
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveType_year: {
          userId: leave.userId,
          leaveType: newLeaveType,
          year,
        },
      },
    })
    if (balance) {
      // First restore old balance, then check
      const restoredBalance = balance.balance + oldPaidDays
      if (newTotalDays > restoredBalance) {
        newUnpaidDays = newTotalDays - restoredBalance
      }
    }
  } else {
    newUnpaidDays = newTotalDays
  }

  // Restore old balance
  if (!oldTypeMeta.isUnpaid && oldPaidDays > 0) {
    const field = leave.status === "PENDING" ? "pending" : "used"
    await prisma.leaveBalance.update({
      where: {
        userId_leaveType_year: {
          userId: leave.userId,
          leaveType: leave.leaveType,
          year,
        },
      },
      data: {
        [field]: { decrement: oldPaidDays },
        balance: { increment: oldPaidDays },
      },
    })
  }

  // Apply new balance
  const newPaidDays = newTotalDays - newUnpaidDays
  if (!newTypeMeta.isUnpaid && newPaidDays > 0) {
    const field = leave.status === "PENDING" ? "pending" : "used"
    await initializeLeaveBalances(leave.userId, getMalaysiaYear(newStartDate))
    await prisma.leaveBalance.update({
      where: {
        userId_leaveType_year: {
          userId: leave.userId,
          leaveType: newLeaveType,
          year: getMalaysiaYear(newStartDate),
        },
      },
      data: {
        [field]: { increment: newPaidDays },
        balance: { decrement: newPaidDays },
      },
    })
  }

  await prisma.leaveApplication.update({
    where: { id: validated.leaveId },
    data: {
      leaveType: newLeaveType,
      startDate: newStartDate,
      endDate: newEndDate,
      halfDay: newHalfDay,
      reason: validated.reason ?? leave.reason,
      totalDays: newTotalDays,
      unpaidDays: newUnpaidDays,
    },
  })

  revalidateLeaveAndCalendar()
}

export async function requestLeaveChange(data: LeaveChangeRequestValues) {
  const user = await getCurrentUser()
  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
  })
  if (!dbUser) throw new Error("User not found")

  const validated = leaveChangeRequestSchema.parse(data)

  const leave = await prisma.leaveApplication.findUnique({
    where: { id: validated.leaveApplicationId },
  })
  if (!leave) throw new Error("Leave application not found")
  if (leave.userId !== dbUser.id) throw new Error("Unauthorized")
  if (leave.status !== "APPROVED" && leave.status !== "PENDING") {
    throw new Error("Can only request changes for pending or approved leaves")
  }

  if (validated.type === "CANCEL" && leave.status === "PENDING") {
    throw new Error(
      "Pending applications can be cancelled immediately from your applications list—no change request needed."
    )
  }

  // Check for existing pending change request
  const existingPending = await prisma.leaveChangeRequest.findFirst({
    where: {
      leaveApplicationId: validated.leaveApplicationId,
      status: "PENDING",
    },
  })
  if (existingPending) {
    throw new Error("A change request is already pending for this leave")
  }

  await prisma.leaveChangeRequest.create({
    data: {
      leaveApplicationId: validated.leaveApplicationId,
      requestedById: dbUser.id,
      type: validated.type,
      reason: validated.reason,
      newStartDate: validated.newStartDate ? toMYTDate(validated.newStartDate) : null,
      newEndDate: validated.newEndDate ? toMYTDate(validated.newEndDate) : null,
      newLeaveType: validated.newLeaveType,
      newHalfDay: validated.newHalfDay,
      newReason: validated.newReason,
    },
  })

  revalidateLeaveAndCalendar()
}

export async function approveChangeRequest(requestId: number, remarks?: string) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = reviewChangeRequestSchema.parse({ requestId, remarks })

  const reviewerUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
  })

  const changeRequest = await prisma.leaveChangeRequest.findUnique({
    where: { id: validated.requestId },
    include: { leaveApplication: true },
  })
  if (!changeRequest) throw new Error("Change request not found")
  if (changeRequest.status !== "PENDING") throw new Error("Change request is not pending")

  const leave = changeRequest.leaveApplication

  await prisma.leaveChangeRequest.update({
    where: { id: validated.requestId },
    data: {
      status: "APPROVED",
      adminRemarks: validated.remarks,
      reviewedById: reviewerUser?.id,
      reviewedAt: new Date(),
    },
  })

  if (changeRequest.type === "CANCEL") {
    // Cancel the leave and restore balance
    const year = getMalaysiaYear(leave.startDate)
    const paidDays = leave.totalDays - leave.unpaidDays
    const oldTypeMeta = await getLeaveTypeOrThrow(leave.leaveType)

    await prisma.leaveApplication.update({
      where: { id: leave.id },
      data: { status: "CANCELLED" },
    })

    if (!oldTypeMeta.isUnpaid && paidDays > 0) {
      const field = leave.status === "PENDING" ? "pending" : "used"
      await prisma.leaveBalance.update({
        where: {
          userId_leaveType_year: {
            userId: leave.userId,
            leaveType: leave.leaveType,
            year,
          },
        },
        data: {
          [field]: { decrement: paidDays },
          balance: { increment: paidDays },
        },
      })
    }
  } else if (changeRequest.type === "EDIT") {
    // Apply the edits
    const newStartDate = changeRequest.newStartDate ?? leave.startDate
    const newEndDate = changeRequest.newEndDate ?? leave.endDate
    const newHalfDay = changeRequest.newHalfDay ?? leave.halfDay
    const newLeaveType = changeRequest.newLeaveType ?? leave.leaveType
    const newTotalDays = calculateLeaveDays(toMYTDateStr(newStartDate), toMYTDateStr(newEndDate), newHalfDay)
    const year = getMalaysiaYear(leave.startDate)
    const oldPaidDays = leave.totalDays - leave.unpaidDays

    const oldTypeMeta = await getLeaveTypeOrThrow(leave.leaveType)
    const newTypeMeta =
      newLeaveType === leave.leaveType ? oldTypeMeta : await getLeaveTypeOrThrow(newLeaveType)

    // Restore old
    if (!oldTypeMeta.isUnpaid && oldPaidDays > 0) {
      const field = leave.status === "PENDING" ? "pending" : "used"
      await prisma.leaveBalance.update({
        where: {
          userId_leaveType_year: {
            userId: leave.userId,
            leaveType: leave.leaveType,
            year,
          },
        },
        data: {
          [field]: { decrement: oldPaidDays },
          balance: { increment: oldPaidDays },
        },
      })
    }

    // Calculate new unpaid
    let newUnpaidDays = 0
    if (!newTypeMeta.isUnpaid) {
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveType_year: {
            userId: leave.userId,
            leaveType: newLeaveType,
            year,
          },
        },
      })
      if (balance) {
        if (newTotalDays > balance.balance) {
          newUnpaidDays = newTotalDays - balance.balance
        }
      }
    } else {
      newUnpaidDays = newTotalDays
    }

    // Apply new
    const newPaidDays = newTotalDays - newUnpaidDays
    if (!newTypeMeta.isUnpaid && newPaidDays > 0) {
      const field = leave.status === "PENDING" ? "pending" : "used"
      await prisma.leaveBalance.update({
        where: {
          userId_leaveType_year: {
            userId: leave.userId,
            leaveType: newLeaveType,
            year,
          },
        },
        data: {
          [field]: { increment: newPaidDays },
          balance: { decrement: newPaidDays },
        },
      })
    }

    await prisma.leaveApplication.update({
      where: { id: leave.id },
      data: {
        leaveType: newLeaveType,
        startDate: newStartDate,
        endDate: newEndDate,
        halfDay: newHalfDay,
        reason: changeRequest.newReason ?? leave.reason,
        totalDays: newTotalDays,
        unpaidDays: newUnpaidDays,
      },
    })
  }

  revalidateLeaveAndCalendar()
}

export async function rejectChangeRequest(requestId: number, remarks?: string) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = reviewChangeRequestSchema.parse({ requestId, remarks })

  const reviewerUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
  })

  const changeRequest = await prisma.leaveChangeRequest.findUnique({
    where: { id: validated.requestId },
  })
  if (!changeRequest) throw new Error("Change request not found")
  if (changeRequest.status !== "PENDING") throw new Error("Change request is not pending")

  await prisma.leaveChangeRequest.update({
    where: { id: validated.requestId },
    data: {
      status: "REJECTED",
      adminRemarks: validated.remarks,
      reviewedById: reviewerUser?.id,
      reviewedAt: new Date(),
    },
  })

  revalidateLeaveAndCalendar()
}

export async function updateEmployeeBalance(data: UpdateEmployeeBalanceValues) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = updateEmployeeBalanceSchema.parse(data)
  // Validate the leave type exists.
  await getLeaveTypeOrThrow(validated.leaveType)
  await initializeLeaveBalances(validated.userId, validated.year)

  const existing = await prisma.leaveBalance.findUnique({
    where: {
      userId_leaveType_year: {
        userId: validated.userId,
        leaveType: validated.leaveType,
        year: validated.year,
      },
    },
  })

  if (existing) {
    const newBalance = validated.entitled - existing.used - existing.pending
    await prisma.leaveBalance.update({
      where: {
        userId_leaveType_year: {
          userId: validated.userId,
          leaveType: validated.leaveType,
          year: validated.year,
        },
      },
      data: {
        entitled: validated.entitled,
        balance: newBalance,
      },
    })
  } else {
    await prisma.leaveBalance.create({
      data: {
        userId: validated.userId,
        leaveType: validated.leaveType,
        year: validated.year,
        entitled: validated.entitled,
        used: 0,
        pending: 0,
        balance: validated.entitled,
      },
    })
  }

  revalidateLeaveAndCalendar()
}

/**
 * Update many leave-type entitlements for one employee/year in a single transaction.
 * Each entry recomputes balance = entitled - used - pending. Missing rows are created.
 */
export async function bulkUpsertLeaveBalances(data: BulkUpsertLeaveBalancesValues) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = bulkUpsertLeaveBalancesSchema.parse(data)
  await initializeLeaveBalances(validated.userId, validated.year)

  await prisma.$transaction(
    validated.entries.map((entry) =>
      prisma.leaveBalance.upsert({
        where: {
          userId_leaveType_year: {
            userId: validated.userId,
            leaveType: entry.leaveType,
            year: validated.year,
          },
        },
        update: {
          entitled: entry.entitled,
          // balance gets recomputed below in a second pass after used/pending are read.
        },
        create: {
          userId: validated.userId,
          leaveType: entry.leaveType,
          year: validated.year,
          entitled: entry.entitled,
          used: 0,
          pending: 0,
          balance: entry.entitled,
        },
      })
    )
  )

  // Recompute balances now that entitled is set; preserves used/pending.
  const updated = await prisma.leaveBalance.findMany({
    where: {
      userId: validated.userId,
      year: validated.year,
      leaveType: { in: validated.entries.map((e) => e.leaveType) },
    },
  })
  await prisma.$transaction(
    updated.map((b) =>
      prisma.leaveBalance.update({
        where: { id: b.id },
        data: { balance: b.entitled - b.used - b.pending },
      })
    )
  )

  revalidateLeaveAndCalendar()
}

// ─── Leave Types CRUD (admin) ─────────────────────────────────────

export async function createLeaveType(data: CreateLeaveTypeValues) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = createLeaveTypeSchema.parse(data)
  const code = validated.code.toUpperCase().trim()

  const existing = await prisma.leaveType.findUnique({ where: { code } })
  if (existing) throw new Error(`Leave type "${code}" already exists`)

  const created = await prisma.leaveType.create({
    data: {
      code,
      name: validated.name.trim(),
      defaultEntitlement: validated.defaultEntitlement,
      isUnpaid: validated.isUnpaid,
      requiresReplacementDate: validated.requiresReplacementDate,
      sortOrder: validated.sortOrder ?? 100,
      // User-created types are always deletable.
      isDeletable: true,
    },
  })

  revalidateLeaveAndCalendar()
  return created
}

export async function updateLeaveType(data: UpdateLeaveTypeValues) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = updateLeaveTypeSchema.parse(data)
  const existing = await prisma.leaveType.findUnique({ where: { id: validated.id } })
  if (!existing) throw new Error("Leave type not found")

  await prisma.leaveType.update({
    where: { id: validated.id },
    data: {
      name: validated.name?.trim() ?? existing.name,
      defaultEntitlement: validated.defaultEntitlement ?? existing.defaultEntitlement,
      isUnpaid: validated.isUnpaid ?? existing.isUnpaid,
      requiresReplacementDate:
        validated.requiresReplacementDate ?? existing.requiresReplacementDate,
      isActive: validated.isActive ?? existing.isActive,
      sortOrder: validated.sortOrder ?? existing.sortOrder,
    },
  })

  revalidateLeaveAndCalendar()
}

export async function deleteLeaveType(id: number) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const existing = await prisma.leaveType.findUnique({
    where: { id },
    include: { _count: { select: { applications: true, balances: true } } },
  })
  if (!existing) throw new Error("Leave type not found")
  if (!existing.isDeletable) {
    throw new Error(`"${existing.name}" cannot be deleted`)
  }
  if (existing._count.applications > 0 || existing._count.balances > 0) {
    throw new Error(
      `"${existing.name}" is in use by ${existing._count.applications} applications and ${existing._count.balances} balance rows; deactivate instead.`
    )
  }

  await prisma.leaveType.delete({ where: { id } })
  revalidateLeaveAndCalendar()
}

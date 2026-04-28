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
  updateEntitlementDefaultSchema,
  updateEmployeeBalanceSchema,
  type ApplyLeaveValues,
  type AdminEditLeaveValues,
  type LeaveChangeRequestValues,
  type CancelOwnPendingLeaveValues,
  type WithdrawChangeRequestValues,
  type LeaveFilters,
  type UpdateEntitlementDefaultValues,
  type UpdateEmployeeBalanceValues,
} from "@/lib/validation"
import { eachDayOfInterval } from "date-fns"
import { DEFAULT_ENTITLEMENTS, isMalaysiaNonWorkingDay } from "./types"
import type {
  LeaveApplicationDTO,
  LeaveBalanceDTO,
  LeaveChangeRequestDTO,
  EmployeeLeaveOverview,
  LeaveStats,
  EntitlementDefaultDTO,
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
  startDate: Date,
  endDate: Date,
  halfDay: string
): number {
  if (halfDay !== "NONE") return 0.5

  const days = eachDayOfInterval({ start: startDate, end: endDate })
  return days.filter((d) => !isMalaysiaNonWorkingDay(d)).length
}

async function getOrCreateEntitlementDefaults(): Promise<Record<string, number>> {
  const defaults = await prisma.leaveEntitlementDefault.findMany()
  if (defaults.length > 0) {
    const map: Record<string, number> = {}
    for (const d of defaults) map[d.leaveType] = d.entitledDays
    // Fill missing types with hardcoded defaults
    for (const [type, days] of Object.entries(DEFAULT_ENTITLEMENTS)) {
      if (!(type in map)) map[type] = days
    }
    return map
  }
  // Seed defaults
  await prisma.leaveEntitlementDefault.createMany({
    data: Object.entries(DEFAULT_ENTITLEMENTS).map(([leaveType, entitledDays]) => ({
      leaveType: leaveType as "PAID" | "UNPAID",
      entitledDays,
    })),
  })
  return { ...DEFAULT_ENTITLEMENTS }
}

export async function initializeLeaveBalances(userId: string, year: number) {
  const existing = await prisma.leaveBalance.findMany({
    where: { userId, year },
  })
  if (existing.length > 0) return existing

  const defaults = await getOrCreateEntitlementDefaults()
  const leaveTypes = Object.keys(defaults) as ("PAID" | "UNPAID")[]

  const data = leaveTypes.map((leaveType) => ({
    userId,
    leaveType,
    year,
    entitled: defaults[leaveType],
    used: 0,
    pending: 0,
    balance: defaults[leaveType],
  }))

  await prisma.leaveBalance.createMany({ data })
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

/** Ensures every user has PAID/UNPAID balance rows for the calendar year (idempotent). */
export async function ensureLeaveBalancesForYearForAllUsers(year: number) {
  const users = await prisma.user.findMany({ select: { id: true } })
  await Promise.all(users.map((u) => initializeLeaveBalances(u.id, year)))
}

export async function fetchAllEmployeeLeaveOverview(
  year: number
): Promise<EmployeeLeaveOverview[]> {
  await ensureLeaveBalancesForYearForAllUsers(year)

  const today = new Date()

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
      (l) => l.status === "APPROVED" && new Date(l.endDate) < today
    )
    const futureLeaves = u.leaveApplications.filter(
      (l) =>
        (l.status === "APPROVED" || l.status === "PENDING") &&
        new Date(l.startDate) >= today
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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [pending, approved, rejected, onLeaveToday] = await Promise.all([
    prisma.leaveApplication.count({ where: { status: "PENDING" } }),
    prisma.leaveApplication.count({ where: { status: "APPROVED" } }),
    prisma.leaveApplication.count({ where: { status: "REJECTED" } }),
    prisma.leaveApplication.count({
      where: {
        status: "APPROVED",
        startDate: { lte: tomorrow },
        endDate: { gte: today },
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

export async function fetchEntitlementDefaults(): Promise<EntitlementDefaultDTO[]> {
  await getOrCreateEntitlementDefaults()
  return prisma.leaveEntitlementDefault.findMany({
    orderBy: { leaveType: "asc" },
  })
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
  const totalDays = calculateLeaveDays(
    validated.startDate,
    validated.endDate,
    validated.halfDay
  )

  if (totalDays <= 0) throw new Error("Invalid leave duration")

  const year = validated.startDate.getFullYear()
  await initializeLeaveBalances(dbUser.id, year)

  // Calculate unpaid days
  let unpaidDays = 0
  if (validated.leaveType !== "UNPAID") {
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
      startDate: validated.startDate,
      endDate: validated.endDate,
      halfDay: validated.halfDay,
      reason: validated.reason,
      attachmentUrl: validated.attachmentUrl,
      totalDays,
      unpaidDays,
    },
  })

  // Update pending balance (only for the paid portion)
  if (validated.leaveType !== "UNPAID") {
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
  const year = leave.startDate.getFullYear()
  if (leave.leaveType !== "UNPAID") {
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
  const year = leave.startDate.getFullYear()
  if (leave.leaveType !== "UNPAID") {
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
  const year = leave.startDate.getFullYear()
  if (leave.leaveType !== "UNPAID") {
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

  const year = leave.startDate.getFullYear()
  if (leave.leaveType !== "UNPAID") {
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

  const newStartDate = validated.startDate ?? leave.startDate
  const newEndDate = validated.endDate ?? leave.endDate
  const newHalfDay = validated.halfDay ?? leave.halfDay
  const newLeaveType = validated.leaveType ?? leave.leaveType
  const newTotalDays = calculateLeaveDays(newStartDate, newEndDate, newHalfDay)

  const year = leave.startDate.getFullYear()
  const oldPaidDays = leave.totalDays - leave.unpaidDays

  // Calculate new unpaid days
  let newUnpaidDays = 0
  if (newLeaveType !== "UNPAID") {
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
  if (leave.leaveType !== "UNPAID" && oldPaidDays > 0) {
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
  if (newLeaveType !== "UNPAID" && newPaidDays > 0) {
    const field = leave.status === "PENDING" ? "pending" : "used"
    await initializeLeaveBalances(leave.userId, newStartDate.getFullYear())
    await prisma.leaveBalance.update({
      where: {
        userId_leaveType_year: {
          userId: leave.userId,
          leaveType: newLeaveType,
          year: newStartDate.getFullYear(),
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
      newStartDate: validated.newStartDate,
      newEndDate: validated.newEndDate,
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
    const year = leave.startDate.getFullYear()
    const paidDays = leave.totalDays - leave.unpaidDays

    await prisma.leaveApplication.update({
      where: { id: leave.id },
      data: { status: "CANCELLED" },
    })

    if (leave.leaveType !== "UNPAID" && paidDays > 0) {
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
    const newTotalDays = calculateLeaveDays(newStartDate, newEndDate, newHalfDay)
    const year = leave.startDate.getFullYear()
    const oldPaidDays = leave.totalDays - leave.unpaidDays

    // Restore old
    if (leave.leaveType !== "UNPAID" && oldPaidDays > 0) {
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
    if (newLeaveType !== "UNPAID") {
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
    if (newLeaveType !== "UNPAID" && newPaidDays > 0) {
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

export async function updateEntitlementDefault(data: UpdateEntitlementDefaultValues) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = updateEntitlementDefaultSchema.parse(data)

  await prisma.leaveEntitlementDefault.upsert({
    where: { leaveType: validated.leaveType },
    update: { entitledDays: validated.entitledDays },
    create: {
      leaveType: validated.leaveType,
      entitledDays: validated.entitledDays,
    },
  })

  revalidateLeaveAndCalendar()
}

export async function updateEmployeeBalance(data: UpdateEmployeeBalanceValues) {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized")

  const validated = updateEmployeeBalanceSchema.parse(data)

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

  if (!existing) throw new Error("Balance not found")

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

  revalidateLeaveAndCalendar()
}

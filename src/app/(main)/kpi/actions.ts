"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { revalidatePath } from "next/cache"
import { getDeadlineStatus } from "@/app/(main)/projects/deadline-utils"
import {
  computeFinalScore,
  currentMalaysiaPeriod,
  resolveKpiSection,
  type KpiCategoryKey,
  type KpiSection,
} from "./config"
import type {
  ColleagueToRate,
  EmployeeRatingData,
  KpiReportDTO,
  MonthlyReportRow,
  OverdueTaskDTO,
  RateableEmployee,
  TeamworkSummary,
} from "./types"

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function requireUser() {
  const user = await getCachedUser()
  if (!user) throw new Error("Not authenticated")
  return user
}

async function requireAdmin() {
  const user = await requireUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Admin access required")
  return user
}

/** Prisma `where` fragment for "every non-admin user". */
const NON_ADMIN_WHERE = { userRoles: { none: { role: { slug: "admin" } } } } as const

type UserWithRoles = {
  supabase_id: string
  firstName: string
  lastName: string
  email: string
  staffRole: { roleName: string } | null
  userRoles: { role: { slug: string } }[]
}

const userRolesInclude = {
  staffRole: { select: { roleName: true } },
  userRoles: { include: { role: { select: { slug: true } } } },
} as const

function displayName(u: { firstName: string; lastName: string; email: string }): string {
  return `${u.firstName} ${u.lastName}`.trim() || u.email
}

function sectionOf(u: UserWithRoles): KpiSection {
  return resolveKpiSection({
    roleSlugs: u.userRoles.map((r) => r.role.slug),
    staffRoleName: u.staffRole?.roleName,
  })
}

/** Malaysia-timezone (UTC+8) month boundaries as UTC instants. month: 1–12. */
function malaysiaMonthBounds(year: number, month: number): { start: Date; end: Date } {
  // 00:00 MYT == 16:00 UTC the previous day, i.e. hour offset of -8.
  return {
    start: new Date(Date.UTC(year, month - 1, 1, -8, 0, 0)),
    end: new Date(Date.UTC(year, month, 1, -8, 0, 0)),
  }
}

// ── Report serialization ────────────────────────────────────────────────────
type ReportWithScores = {
  id: number
  employeeId: string
  section: KpiSection
  year: number
  month: number
  status: "draft" | "finalized"
  finalScore: number | null
  overallComment: string | null
  finalizedAt: Date | null
  replyChoice: "too_high" | "fair" | "too_low" | null
  replyComment: string | null
  repliedAt: Date | null
  scores: { category: KpiCategoryKey; score: number | null; comment: string | null }[]
}

function mapReportToDTO(report: ReportWithScores, employeeName: string): KpiReportDTO {
  return {
    id: report.id,
    employeeId: report.employeeId,
    employeeName,
    section: report.section,
    year: report.year,
    month: report.month,
    status: report.status,
    finalScore: report.finalScore,
    overallComment: report.overallComment,
    finalizedAt: report.finalizedAt?.toISOString() ?? null,
    replyChoice: report.replyChoice,
    replyComment: report.replyComment,
    repliedAt: report.repliedAt?.toISOString() ?? null,
    scores: report.scores.map((s) => ({ category: s.category, score: s.score, comment: s.comment })),
  }
}

// ── Admin: employees + report editing ───────────────────────────────────────
export async function getRateableEmployees(): Promise<RateableEmployee[]> {
  await requireAdmin()
  const users = await prisma.user.findMany({
    where: NON_ADMIN_WHERE,
    include: userRolesInclude,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
  return users.map((u) => ({
    supabaseId: u.supabase_id,
    name: displayName(u),
    email: u.email,
    section: sectionOf(u),
  }))
}

async function requireRateableEmployee(employeeId: string): Promise<UserWithRoles> {
  const employee = await prisma.user.findUnique({
    where: { supabase_id: employeeId },
    include: userRolesInclude,
  })
  if (!employee) throw new Error("Employee not found")
  if (employee.userRoles.some((r) => r.role.slug === "admin")) {
    throw new Error("Admins are excluded from KPI rating")
  }
  return employee
}

/** Everything the admin rating form needs for one employee + period (no draft is created here). */
export async function getEmployeeRatingData(
  employeeId: string,
  year: number,
  month: number
): Promise<EmployeeRatingData> {
  await requireAdmin()
  const employee = await requireRateableEmployee(employeeId)

  const [report, teamwork, overdueTasks] = await Promise.all([
    prisma.kpiReport.findUnique({
      where: { employeeId_year_month: { employeeId, year, month } },
      include: { scores: true },
    }),
    teamworkAverage(employeeId, year, month),
    overdueTasksForEmployee(employeeId, year, month),
  ])

  return {
    employeeId,
    employeeName: displayName(employee),
    section: sectionOf(employee),
    report: report ? mapReportToDTO(report as ReportWithScores, displayName(employee)) : null,
    teamwork,
    overdueTasks,
  }
}

const saveDraftSchema = z.object({
  employeeId: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  overallComment: z.string().max(5000).nullish(),
  scores: z.array(
    z.object({
      category: z.enum([
        "client_experience",
        "sales_performance",
        "work_quality",
        "deadline_reliability",
        "teamwork",
        "growth_initiative",
      ]),
      score: z.number().min(0).max(100).nullable(),
      comment: z.string().max(2000).nullish(),
    })
  ),
})

/** Upserts the report (one per employee/month) and its admin-rated category scores. */
export async function saveReportDraft(input: z.input<typeof saveDraftSchema>): Promise<KpiReportDTO> {
  const admin = await requireAdmin()
  const data = saveDraftSchema.parse(input)
  const employee = await requireRateableEmployee(data.employeeId)
  const section = sectionOf(employee)

  const existing = await prisma.kpiReport.findUnique({
    where: { employeeId_year_month: { employeeId: data.employeeId, year: data.year, month: data.month } },
  })
  if (existing?.status === "finalized") {
    throw new Error("This report is finalized and can no longer be edited")
  }

  const report =
    existing ??
    (await prisma.kpiReport.create({
      data: {
        employeeId: data.employeeId,
        section,
        year: data.year,
        month: data.month,
        status: "draft",
        createdById: admin.id,
      },
    }))

  // Teamwork is peer-rated — never written from the admin form.
  const adminScores = data.scores.filter((s) => s.category !== "teamwork")

  await prisma.$transaction([
    prisma.kpiReport.update({
      where: { id: report.id },
      data: { overallComment: data.overallComment ?? null },
    }),
    ...adminScores.map((s) =>
      prisma.kpiCategoryScore.upsert({
        where: { reportId_category: { reportId: report.id, category: s.category } },
        create: { reportId: report.id, category: s.category, score: s.score, comment: s.comment ?? null },
        update: { score: s.score, comment: s.comment ?? null },
      })
    ),
  ])

  const saved = await prisma.kpiReport.findUnique({
    where: { id: report.id },
    include: { scores: true },
  })
  revalidatePath("/kpi")
  return mapReportToDTO(saved as ReportWithScores, displayName(employee))
}

/** Overdue tasks for the employee in the KPI month — admin reference only (does not affect score). */
async function overdueTasksForEmployee(
  employeeId: string,
  year: number,
  month: number
): Promise<OverdueTaskDTO[]> {
  const { start, end } = malaysiaMonthBounds(year, month)

  const tasks = await prisma.task.findMany({
    where: { assigneeId: employeeId, dueDate: { gte: start, lt: end } },
    include: { project: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  })

  return tasks
    .filter(
      (t) =>
        getDeadlineStatus({
          dueDate: t.dueDate,
          completedAt: t.completedAt,
          isCompleted: t.status === "done",
        }) === "overdue"
    )
    .map((t) => ({
      id: t.id,
      title: t.title,
      projectName: t.project.name,
      dueDate: t.dueDate.toISOString(),
      status: t.status,
    }))
}

export async function getDeadlineOverdueTasks(
  employeeId: string,
  year: number,
  month: number
): Promise<OverdueTaskDTO[]> {
  await requireAdmin()
  return overdueTasksForEmployee(employeeId, year, month)
}

async function teamworkAverage(
  employeeId: string,
  year: number,
  month: number
): Promise<TeamworkSummary> {
  const ratings = await prisma.kpiTeamworkRating.findMany({
    where: { rateeId: employeeId, year, month },
    select: { score: true, comment: true },
  })
  if (ratings.length === 0) return { average: null, count: 0, comments: [] }
  const avg = ratings.reduce((acc, r) => acc + r.score, 0) / ratings.length
  return {
    average: Math.round(avg * 10) / 10,
    count: ratings.length,
    comments: ratings
      .map((r) => r.comment)
      .filter((c): c is string => !!c && c.trim().length > 0),
  }
}

export async function getTeamworkSummary(
  employeeId: string,
  year: number,
  month: number
): Promise<TeamworkSummary> {
  await requireAdmin()
  return teamworkAverage(employeeId, year, month)
}

const finalizeSchema = z.object({
  employeeId: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
})

/** Finalize a report: snapshot the peer-teamwork average, compute & store the final score, lock it. */
export async function finalizeReport(input: z.input<typeof finalizeSchema>) {
  await requireAdmin()
  const { employeeId, year, month } = finalizeSchema.parse(input)

  const report = await prisma.kpiReport.findUnique({
    where: { employeeId_year_month: { employeeId, year, month } },
    include: { scores: true },
  })
  if (!report) throw new Error("Save the report before finalizing")
  if (report.status === "finalized") throw new Error("Report is already finalized")

  const teamwork = await teamworkAverage(report.employeeId, report.year, report.month)

  const scoreMap: Partial<Record<KpiCategoryKey, number>> = {}
  for (const s of report.scores) {
    if (s.category !== "teamwork" && typeof s.score === "number") {
      scoreMap[s.category as KpiCategoryKey] = s.score
    }
  }
  if (teamwork.average != null) scoreMap.teamwork = teamwork.average

  const finalScore = computeFinalScore(report.section as KpiSection, scoreMap)

  await prisma.$transaction([
    prisma.kpiCategoryScore.upsert({
      where: { reportId_category: { reportId: report.id, category: "teamwork" } },
      create: { reportId: report.id, category: "teamwork", score: teamwork.average },
      update: { score: teamwork.average },
    }),
    prisma.kpiReport.update({
      where: { id: report.id },
      data: { status: "finalized", finalScore, finalizedAt: new Date() },
    }),
  ])

  revalidatePath("/kpi")
  revalidatePath("/dashboard")
  return { success: true as const, finalScore }
}

/** Admin monthly report table — every non-admin employee's status & scores for the period. */
export async function getMonthlyReportRows(year: number, month: number): Promise<MonthlyReportRow[]> {
  await requireAdmin()

  const [employees, reports] = await Promise.all([
    prisma.user.findMany({
      where: NON_ADMIN_WHERE,
      include: userRolesInclude,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.kpiReport.findMany({ where: { year, month }, include: { scores: true } }),
  ])

  const byEmployee = new Map(reports.map((r) => [r.employeeId, r]))

  return employees.map((u) => {
    const report = byEmployee.get(u.supabase_id)
    const scores: Partial<Record<KpiCategoryKey, number | null>> = {}
    if (report) for (const s of report.scores) scores[s.category as KpiCategoryKey] = s.score
    return {
      employeeId: u.supabase_id,
      name: displayName(u),
      section: sectionOf(u),
      status: report ? report.status : "not_started",
      finalScore: report?.finalScore ?? null,
      scores,
      replyChoice: report?.replyChoice ?? null,
    }
  })
}

// ── Employee: own reports + reply ────────────────────────────────────────────
export async function getMyReports(): Promise<KpiReportDTO[]> {
  const user = await requireUser()
  const reports = await prisma.kpiReport.findMany({
    where: { employeeId: user.id, status: "finalized" },
    include: { scores: true, employee: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })
  return reports.map((r) => mapReportToDTO(r as ReportWithScores, displayName(r.employee)))
}

const replySchema = z.object({
  reportId: z.number().int().positive(),
  choice: z.enum(["too_high", "fair", "too_low"]),
  comment: z.string().max(2000).nullish(),
})

/** Employee replies to their own finalized report (required acknowledgement). */
export async function submitKpiReply(input: z.input<typeof replySchema>) {
  const user = await requireUser()
  const data = replySchema.parse(input)

  const report = await prisma.kpiReport.findUnique({ where: { id: data.reportId } })
  if (!report) throw new Error("Report not found")
  if (report.employeeId !== user.id) throw new Error("You can only reply to your own report")
  if (report.status !== "finalized") throw new Error("This report is not finalized yet")

  await prisma.kpiReport.update({
    where: { id: data.reportId },
    data: { replyChoice: data.choice, replyComment: data.comment ?? null, repliedAt: new Date() },
  })

  revalidatePath("/kpi")
  revalidatePath("/dashboard")
  return { success: true as const }
}

// ── Peer teamwork ratings (all non-admin employees rate each other) ──────────
async function colleaguesToRateInternal(
  raterId: string,
  year: number,
  month: number
): Promise<ColleagueToRate[]> {
  const [users, myRatings] = await Promise.all([
    prisma.user.findMany({
      where: { ...NON_ADMIN_WHERE, supabase_id: { not: raterId } },
      include: userRolesInclude,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.kpiTeamworkRating.findMany({ where: { raterId, year, month } }),
  ])
  const byRatee = new Map(myRatings.map((r) => [r.rateeId, r]))
  return users.map((u) => {
    const existing = byRatee.get(u.supabase_id)
    return {
      supabaseId: u.supabase_id,
      name: displayName(u),
      section: sectionOf(u),
      myScore: existing?.score ?? null,
      myComment: existing?.comment ?? null,
    }
  })
}

export async function getColleaguesToRate(year: number, month: number): Promise<ColleagueToRate[]> {
  const user = await requireUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (isAdmin) return [] // admins are excluded from KPI entirely
  return colleaguesToRateInternal(user.id, year, month)
}

const teamworkSchema = z.object({
  rateeId: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  score: z.number().min(0).max(100),
  comment: z.string().max(2000).nullish(),
})

export async function submitTeamworkRating(input: z.input<typeof teamworkSchema>) {
  const user = await requireUser()
  const data = teamworkSchema.parse(input)

  if (data.rateeId === user.id) throw new Error("You cannot rate your own teamwork")
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (isAdmin) throw new Error("Admins do not submit peer ratings")

  const ratee = await prisma.user.findUnique({
    where: { supabase_id: data.rateeId },
    include: { userRoles: { include: { role: { select: { slug: true } } } } },
  })
  if (!ratee) throw new Error("Colleague not found")
  if (ratee.userRoles.some((r) => r.role.slug === "admin")) throw new Error("Admins are not rated")

  await prisma.kpiTeamworkRating.upsert({
    where: {
      year_month_raterId_rateeId: {
        year: data.year,
        month: data.month,
        raterId: user.id,
        rateeId: data.rateeId,
      },
    },
    create: {
      year: data.year,
      month: data.month,
      raterId: user.id,
      rateeId: data.rateeId,
      score: data.score,
      comment: data.comment ?? null,
    },
    update: { score: data.score, comment: data.comment ?? null },
  })

  revalidatePath("/kpi")
  return { success: true as const }
}

// ── Dashboard summary for the logged-in employee ─────────────────────────────
export async function getMyKpiDashboardData(): Promise<{
  latestReport: KpiReportDTO | null
  unratedColleagues: number
  period: { year: number; month: number }
}> {
  const user = await requireUser()
  const period = currentMalaysiaPeriod()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (isAdmin) return { latestReport: null, unratedColleagues: 0, period }

  const [latest, colleagues] = await Promise.all([
    prisma.kpiReport.findFirst({
      where: { employeeId: user.id, status: "finalized" },
      include: { scores: true, employee: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    colleaguesToRateInternal(user.id, period.year, period.month),
  ])

  return {
    latestReport: latest ? mapReportToDTO(latest as ReportWithScores, displayName(latest.employee)) : null,
    unratedColleagues: colleagues.filter((c) => c.myScore == null).length,
    period,
  }
}

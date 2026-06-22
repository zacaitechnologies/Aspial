/**
 * Serializable DTOs passed between KPI server actions and client components.
 * Dates are ISO strings so they cross the server/client boundary cleanly.
 */
import type { KpiCategoryKey, KpiReplyChoice, KpiReportStatus, KpiSection } from "./config"

export type RateableEmployee = {
  supabaseId: string
  name: string
  email: string
  section: KpiSection
}

export type KpiCategoryScoreDTO = {
  category: KpiCategoryKey
  score: number | null
  comment: string | null
}

export type KpiReportDTO = {
  id: number
  employeeId: string
  employeeName: string
  section: KpiSection
  year: number
  month: number
  status: KpiReportStatus
  finalScore: number | null
  overallComment: string | null
  finalizedAt: string | null
  replyChoice: KpiReplyChoice | null
  replyComment: string | null
  repliedAt: string | null
  scores: KpiCategoryScoreDTO[]
}

export type TeamworkSummary = {
  /** Average of submitted peer ratings (1 dp), or null when nobody has rated yet. */
  average: number | null
  count: number
  /** Anonymized peer comments (no rater identity). */
  comments: string[]
}

export type OverdueTaskDTO = {
  id: number
  title: string
  projectName: string
  dueDate: string
  status: string
}

export type ColleagueToRate = {
  supabaseId: string
  name: string
  section: KpiSection
  myScore: number | null
  myComment: string | null
}

export type MonthlyReportRow = {
  employeeId: string
  name: string
  section: KpiSection
  status: KpiReportStatus | "not_started"
  finalScore: number | null
  scores: Partial<Record<KpiCategoryKey, number | null>>
  replyChoice: KpiReplyChoice | null
}

/** Everything the admin rating form needs for one employee + period. */
export type EmployeeRatingData = {
  employeeId: string
  employeeName: string
  section: KpiSection
  report: KpiReportDTO | null
  teamwork: TeamworkSummary
  overdueTasks: OverdueTaskDTO[]
}

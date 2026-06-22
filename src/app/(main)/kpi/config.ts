/**
 * KPI module configuration — categories, per-section weights, rating bands,
 * standards, and helpers. Pure module (no server-only imports) so it can be
 * shared by server actions and client components.
 */
import { toBusinessTZParts } from "@/lib/date-utils"

export type KpiSection = "sales" | "operations"

export type KpiCategoryKey =
  | "client_experience"
  | "sales_performance"
  | "work_quality"
  | "deadline_reliability"
  | "teamwork"
  | "growth_initiative"

export type KpiReplyChoice = "too_high" | "fair" | "too_low"
export type KpiReportStatus = "draft" | "finalized"

/** A final score strictly below this gets a distinct red flag (requirement #6). */
export const RED_FLAG_THRESHOLD = 50

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

type KpiCategoryMeta = {
  label: string
  /** Teamwork is rated by peers (averaged), never by the admin. */
  peerRated: boolean
  /** Deadline & Reliability shows the employee's overdue tasks as admin reference. */
  showsOverdueTasks: boolean
}

export const KPI_CATEGORY_META: Record<KpiCategoryKey, KpiCategoryMeta> = {
  client_experience: { label: "Client Experience", peerRated: false, showsOverdueTasks: false },
  sales_performance: { label: "Sales Performance & Target Achievement", peerRated: false, showsOverdueTasks: false },
  work_quality: { label: "Work Quality & Output", peerRated: false, showsOverdueTasks: false },
  deadline_reliability: { label: "Deadline & Reliability", peerRated: false, showsOverdueTasks: true },
  teamwork: { label: "Teamwork & Communication", peerRated: true, showsOverdueTasks: false },
  growth_initiative: { label: "Growth & Initiative", peerRated: false, showsOverdueTasks: false },
}

/** Ordered categories + weights per section (matches the user's reference image). */
export const KPI_SECTION_CATEGORIES: Record<KpiSection, KpiCategoryKey[]> = {
  operations: ["client_experience", "work_quality", "deadline_reliability", "teamwork", "growth_initiative"],
  sales: ["sales_performance", "client_experience", "work_quality", "deadline_reliability", "teamwork", "growth_initiative"],
}

export const KPI_SECTION_WEIGHTS: Record<KpiSection, Partial<Record<KpiCategoryKey, number>>> = {
  operations: {
    client_experience: 30,
    work_quality: 25,
    deadline_reliability: 20,
    teamwork: 15,
    growth_initiative: 10,
  },
  sales: {
    sales_performance: 30,
    client_experience: 25,
    work_quality: 20,
    deadline_reliability: 10,
    teamwork: 10,
    growth_initiative: 5,
  },
}

export function getCategoryWeight(section: KpiSection, category: KpiCategoryKey): number {
  return KPI_SECTION_WEIGHTS[section][category] ?? 0
}

/** The categories an admin scores directly (everything except peer-rated teamwork). */
export function getAdminRatedCategories(section: KpiSection): KpiCategoryKey[] {
  return KPI_SECTION_CATEGORIES[section].filter((c) => !KPI_CATEGORY_META[c].peerRated)
}

// ── Standards (reference shown beside the rating). Only Sales performance for now. ──
export type KpiStandard = {
  description: string
  measurementSource?: string
  evaluationAreas?: string[]
  target?: string
}

export const KPI_STANDARDS: Partial<Record<KpiCategoryKey, KpiStandard>> = {
  sales_performance: {
    description:
      "Ability to consistently achieve sales targets, generate qualified leads, close deals, and contribute revenue growth to the company.",
    measurementSource: "Sales system / monthly sales report",
    evaluationAreas: [
      "Monthly revenue achieved",
      "Conversion rate",
      "Lead follow-up consistency",
      "Proposal closing rate",
      "Upselling / repeat clients",
    ],
    target: "Achieve ≥ 100% of monthly sales target",
  },
}

// ── Rating bands (from the user's image). ──
export type KpiBand = {
  label: string
  /** Inclusive lower bound. */
  min: number
  /** Tailwind badge classes (bg/text/border). */
  className: string
  /** Tailwind text color for the score number. */
  textClassName: string
}

export const KPI_BANDS: KpiBand[] = [
  { label: "Exceptional", min: 95, className: "bg-emerald-100 text-emerald-800 border-emerald-200", textClassName: "text-emerald-700" },
  { label: "Strong performer", min: 85, className: "bg-blue-100 text-blue-800 border-blue-200", textClassName: "text-blue-700" },
  { label: "Good performer", min: 75, className: "bg-teal-100 text-teal-800 border-teal-200", textClassName: "text-teal-700" },
  { label: "Needs improvement", min: 70, className: "bg-amber-100 text-amber-800 border-amber-200", textClassName: "text-amber-700" },
  { label: "Unsatisfactory", min: 0, className: "bg-red-100 text-red-800 border-red-200", textClassName: "text-red-700" },
]

export function getKpiBand(score: number): KpiBand {
  return KPI_BANDS.find((b) => score >= b.min) ?? KPI_BANDS[KPI_BANDS.length - 1]
}

export function isKpiRedFlag(finalScore: number | null | undefined): boolean {
  return typeof finalScore === "number" && finalScore < RED_FLAG_THRESHOLD
}

/** Weighted final score from a map of category → score (0–100), rounded to 1 dp. */
export function computeFinalScore(
  section: KpiSection,
  scores: Partial<Record<KpiCategoryKey, number | null | undefined>>
): number {
  let total = 0
  for (const category of KPI_SECTION_CATEGORIES[section]) {
    const weight = getCategoryWeight(section, category)
    const score = scores[category]
    total += (typeof score === "number" ? score : 0) * (weight / 100)
  }
  return Math.round(total * 10) / 10
}

/** Section mapping: Sales if brand-advisor role OR Photographer staff role; else Operations. */
export function resolveKpiSection(params: {
  roleSlugs: string[]
  staffRoleName: string | null | undefined
}): KpiSection {
  const isSales = params.roleSlugs.includes("brand-advisor") || params.staffRoleName === "Photographer"
  return isSales ? "sales" : "operations"
}

export const KPI_REPLY_LABELS: Record<KpiReplyChoice, string> = {
  too_high: "I think the marks are too high",
  fair: "I think the marks are fair",
  too_low: "I think the marks are too low",
}

export function formatPeriod(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? ""} ${year}`
}

/** Current year/month in Malaysia (UTC+8). Hydration note: call on the server and
 * pass the result down as props; never compute during client render. */
export function currentMalaysiaPeriod(now: Date = new Date()): { year: number; month: number } {
  const [y, m] = toBusinessTZParts(now).dateStr.split("-")
  return { year: parseInt(y, 10), month: parseInt(m, 10) }
}

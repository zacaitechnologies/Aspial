import type { Milestone } from "@/app/(main)/projects/types"

/** Pastel milestone color keys — map to theme tokens in globals.css only. */
export const MILESTONE_COLOR_OPTIONS = [
  {
    value: "pastel-blush",
    label: "Blush",
    stripeClass: "border-l-milestone-pastel-blush",
    dotClass: "bg-milestone-pastel-blush",
    cardTintClass: "bg-milestone-pastel-blush-tint/50",
    iconClass: "text-milestone-pastel-blush",
    badgeBorderClass: "border-milestone-pastel-blush/50",
    selectedRingClass: "ring-milestone-pastel-blush",
    progressClass:
      "bg-milestone-pastel-blush/25 [&_[data-slot=progress-indicator]]:bg-milestone-pastel-blush",
  },
  {
    value: "pastel-peach",
    label: "Peach",
    stripeClass: "border-l-milestone-pastel-peach",
    dotClass: "bg-milestone-pastel-peach",
    cardTintClass: "bg-milestone-pastel-peach-tint/50",
    iconClass: "text-milestone-pastel-peach",
    badgeBorderClass: "border-milestone-pastel-peach/50",
    selectedRingClass: "ring-milestone-pastel-peach",
    progressClass:
      "bg-milestone-pastel-peach/25 [&_[data-slot=progress-indicator]]:bg-milestone-pastel-peach",
  },
  {
    value: "pastel-lemon",
    label: "Lemon",
    stripeClass: "border-l-milestone-pastel-lemon",
    dotClass: "bg-milestone-pastel-lemon",
    cardTintClass: "bg-milestone-pastel-lemon-tint/50",
    iconClass: "text-milestone-pastel-lemon",
    badgeBorderClass: "border-milestone-pastel-lemon/50",
    selectedRingClass: "ring-milestone-pastel-lemon",
    progressClass:
      "bg-milestone-pastel-lemon/25 [&_[data-slot=progress-indicator]]:bg-milestone-pastel-lemon",
  },
  {
    value: "pastel-mint",
    label: "Mint",
    stripeClass: "border-l-milestone-pastel-mint",
    dotClass: "bg-milestone-pastel-mint",
    cardTintClass: "bg-milestone-pastel-mint-tint/50",
    iconClass: "text-milestone-pastel-mint",
    badgeBorderClass: "border-milestone-pastel-mint/50",
    selectedRingClass: "ring-milestone-pastel-mint",
    progressClass:
      "bg-milestone-pastel-mint/25 [&_[data-slot=progress-indicator]]:bg-milestone-pastel-mint",
  },
  {
    value: "pastel-sky",
    label: "Sky",
    stripeClass: "border-l-milestone-pastel-sky",
    dotClass: "bg-milestone-pastel-sky",
    cardTintClass: "bg-milestone-pastel-sky-tint/50",
    iconClass: "text-milestone-pastel-sky",
    badgeBorderClass: "border-milestone-pastel-sky/50",
    selectedRingClass: "ring-milestone-pastel-sky",
    progressClass:
      "bg-milestone-pastel-sky/25 [&_[data-slot=progress-indicator]]:bg-milestone-pastel-sky",
  },
  {
    value: "pastel-lavender",
    label: "Lavender",
    stripeClass: "border-l-milestone-pastel-lavender",
    dotClass: "bg-milestone-pastel-lavender",
    cardTintClass: "bg-milestone-pastel-lavender-tint/50",
    iconClass: "text-milestone-pastel-lavender",
    badgeBorderClass: "border-milestone-pastel-lavender/50",
    selectedRingClass: "ring-milestone-pastel-lavender",
    progressClass:
      "bg-milestone-pastel-lavender/25 [&_[data-slot=progress-indicator]]:bg-milestone-pastel-lavender",
  },
  {
    value: "pastel-coral",
    label: "Coral",
    stripeClass: "border-l-milestone-pastel-coral",
    dotClass: "bg-milestone-pastel-coral",
    cardTintClass: "bg-milestone-pastel-coral-tint/50",
    iconClass: "text-milestone-pastel-coral",
    badgeBorderClass: "border-milestone-pastel-coral/50",
    selectedRingClass: "ring-milestone-pastel-coral",
    progressClass:
      "bg-milestone-pastel-coral/25 [&_[data-slot=progress-indicator]]:bg-milestone-pastel-coral",
  },
  {
    value: "pastel-sand",
    label: "Sand",
    stripeClass: "border-l-milestone-pastel-sand",
    dotClass: "bg-milestone-pastel-sand",
    cardTintClass: "bg-milestone-pastel-sand-tint/50",
    iconClass: "text-milestone-pastel-sand",
    badgeBorderClass: "border-milestone-pastel-sand/50",
    selectedRingClass: "ring-milestone-pastel-sand",
    progressClass:
      "bg-milestone-pastel-sand/25 [&_[data-slot=progress-indicator]]:bg-milestone-pastel-sand",
  },
] as const

export type MilestoneColorVariant = (typeof MILESTONE_COLOR_OPTIONS)[number]["value"]

export const MILESTONE_COLOR_VALUES = MILESTONE_COLOR_OPTIONS.map((o) => o.value)

export const DEFAULT_MILESTONE_COLOR: MilestoneColorVariant = "pastel-sky"

/** Maps legacy stored values to the nearest pastel option. */
const LEGACY_MILESTONE_COLOR_MAP: Record<string, MilestoneColorVariant> = {
  primary: "pastel-mint",
  accent: "pastel-lemon",
  secondary: "pastel-sand",
  "chart-1": "pastel-peach",
  "chart-2": "pastel-sky",
  "chart-3": "pastel-lavender",
  "chart-4": "pastel-lemon",
  "chart-5": "pastel-coral",
}

const colorByValue = new Map(
  MILESTONE_COLOR_OPTIONS.map((option) => [option.value, option])
)

export function isMilestoneColorVariant(value: string): value is MilestoneColorVariant {
  return colorByValue.has(value as MilestoneColorVariant)
}

export function resolveMilestoneColor(value: string | null | undefined): MilestoneColorVariant {
  if (value && isMilestoneColorVariant(value)) {
    return value
  }
  if (value && value in LEGACY_MILESTONE_COLOR_MAP) {
    return LEGACY_MILESTONE_COLOR_MAP[value]
  }
  return DEFAULT_MILESTONE_COLOR
}

export function getMilestoneColorOption(color: string | null | undefined) {
  return colorByValue.get(resolveMilestoneColor(color)) ?? colorByValue.get(DEFAULT_MILESTONE_COLOR)!
}

/** Fields copied onto task.milestone when the parent milestone is edited in-place. */
export type MilestoneTaskSnapshot = Pick<
  Milestone,
  "id" | "title" | "description" | "color" | "dueDate" | "priority" | "status" | "serviceId" | "service"
>

/** Resolve milestone color — prefers live project milestone list over embedded task relation. */
export function getTaskMilestoneColorOption(
  task: { milestoneId: number | null; milestone?: { color?: string | null } | null },
  availableMilestones?: Array<{ id: number; color?: string | null }>
) {
  if (task.milestoneId && availableMilestones) {
    const match = availableMilestones.find((m) => m.id === task.milestoneId)
    if (match?.color) return getMilestoneColorOption(match.color)
  }
  const fromRelation = task.milestone?.color
  if (fromRelation) return getMilestoneColorOption(fromRelation)
  return null
}

/** Keep nested task.milestone in sync after a milestone edit (color, title, etc.). */
export function applyMilestoneUpdateToTask<T extends {
  milestoneId: number | null
  milestone?: MilestoneTaskSnapshot | null
}>(task: T, updatedMilestone: MilestoneTaskSnapshot): T {
  if (task.milestoneId !== updatedMilestone.id) return task

  const snapshot: MilestoneTaskSnapshot = {
    id: updatedMilestone.id,
    title: updatedMilestone.title,
    description: updatedMilestone.description,
    color: updatedMilestone.color,
    dueDate: updatedMilestone.dueDate,
    priority: updatedMilestone.priority,
    status: updatedMilestone.status,
    serviceId: updatedMilestone.serviceId,
    service: updatedMilestone.service,
  }

  if (!task.milestone) {
    return { ...task, milestone: snapshot }
  }

  return { ...task, milestone: { ...task.milestone, ...snapshot } }
}

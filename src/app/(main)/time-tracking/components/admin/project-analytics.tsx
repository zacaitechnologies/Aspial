"use client"

import { useMemo, useState } from "react"
import { BarChart3, ChevronDown, Folder, Clock, Layers } from "lucide-react"
import { Project } from "@prisma/client"
import type { TimeEntryWithUserDTO } from "../../action"
import { periodRange, type PeriodSelection } from "./period-utils"
import { MetricStatBox, MetricStatBadge } from "./metric-stat-box"

interface ProjectAnalyticsProps {
  timeEntries: TimeEntryWithUserDTO[]
  projects: Project[]
  period: PeriodSelection
}

interface ContributorBreakdown {
  userId: string
  name: string
  hours: number
  sessions: number
  percentageOfProject: number
}

interface ProjectRef {
  id: number
  name: string
}

interface ProjectStat {
  project: ProjectRef
  isPlaceholderProject: boolean
  hours: number
  contributors: number
  percentage: number
  entries: number
  contributorBreakdown: ContributorBreakdown[]
}

function buildProjectStat(
  projectEntries: TimeEntryWithUserDTO[],
  project: ProjectRef,
  isPlaceholderProject: boolean,
  totalSeconds: number,
): ProjectStat | null {
  if (projectEntries.length === 0) return null

  const projectSeconds = projectEntries.reduce((sum, entry) => sum + entry.duration, 0)
  const hours = Math.round((projectSeconds / 3600) * 10) / 10

  const contributorMap = new Map<string, { name: string; seconds: number; sessions: number }>()

  for (const entry of projectEntries) {
    const name = `${entry.user.firstName} ${entry.user.lastName}`
    const existing = contributorMap.get(entry.userId) ?? {
      name,
      seconds: 0,
      sessions: 0,
    }
    existing.seconds += entry.duration
    existing.sessions += 1
    contributorMap.set(entry.userId, existing)
  }

  const contributorBreakdown: ContributorBreakdown[] = Array.from(contributorMap.entries())
    .map(([userId, data]) => ({
      userId,
      name: data.name,
      hours: Math.round((data.seconds / 3600) * 10) / 10,
      sessions: data.sessions,
      percentageOfProject:
        projectSeconds > 0 ? Math.round((data.seconds / projectSeconds) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.hours - a.hours)

  return {
    project,
    isPlaceholderProject,
    hours,
    contributors: contributorMap.size,
    percentage: totalSeconds > 0 ? Math.round((projectSeconds / totalSeconds) * 1000) / 10 : 0,
    entries: projectEntries.length,
    contributorBreakdown,
  }
}

export function ProjectAnalytics({ timeEntries, projects, period }: ProjectAnalyticsProps) {
  const [expandedProjectIds, setExpandedProjectIds] = useState<number[]>([])

  const toggleExpanded = (projectId: number) => {
    setExpandedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
    )
  }

  const projectStats = useMemo((): ProjectStat[] => {
    const { start, end } = periodRange(period)

    const periodEntries = timeEntries.filter(
      (entry) => entry.startTime >= start && entry.startTime < end,
    )

    const totalSeconds = periodEntries.reduce((sum, entry) => sum + entry.duration, 0)

    const stats: ProjectStat[] = []

    for (const project of projects) {
      const projectEntries = periodEntries.filter(
        (entry) => entry.projectId === project.id && !entry.isPlaceholderProject,
      )
      const stat = buildProjectStat(projectEntries, project, false, totalSeconds)
      if (stat) stats.push(stat)
    }

    const noProjectEntries = periodEntries.filter((entry) => entry.isPlaceholderProject)
    if (noProjectEntries.length > 0) {
      const stat = buildProjectStat(
        noProjectEntries,
        noProjectEntries[0].project,
        true,
        totalSeconds,
      )
      if (stat) stats.push(stat)
    }

    return stats.sort((a, b) => b.hours - a.hours)
  }, [timeEntries, projects, period])

  return (
    <div className="relative flex min-h-0 flex-col">
      <div className="relative z-10 flex max-h-[min(520px,55vh)] min-h-0 flex-col rounded-2xl border-2 border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex shrink-0 items-center gap-3">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Project Analytics</h2>
            <p className="text-xs text-muted-foreground">Hours and share of tracked time by project</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
          {projectStats.map((stat) => {
            const isExpanded = expandedProjectIds.includes(stat.project.id)

            return (
              <div
                key={stat.project.id}
                className={`rounded-xl border-2 bg-card p-4 transition-shadow hover:shadow-md ${
                  stat.isPlaceholderProject
                    ? "border-border border-l-4 border-l-muted-foreground"
                    : "border-border border-l-4 border-l-primary"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className={`h-3 w-3 shrink-0 rounded-full ${
                        stat.isPlaceholderProject ? "bg-muted-foreground" : "bg-primary"
                      }`}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-foreground">
                        {stat.isPlaceholderProject ? (
                          <span className="italic text-muted-foreground">— No project</span>
                        ) : (
                          stat.project.name
                        )}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {stat.entries} session{stat.entries !== 1 ? "s" : ""} · {stat.contributors}{" "}
                        contributor{stat.contributors !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <MetricStatBox
                      tone="blue"
                      label="Duration"
                      value={`${stat.hours}h`}
                      icon={<Clock className="h-3 w-3" />}
                      largeValue
                      className="min-w-[5rem]"
                    />
                    <MetricStatBox
                      tone="amber"
                      label="Share"
                      value={`${stat.percentage}%`}
                      icon={<Layers className="h-3 w-3" />}
                      largeValue
                      className="min-w-[5rem]"
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpanded(stat.project.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                      aria-label={isExpanded ? "Hide contributor breakdown" : "Show contributor breakdown"}
                      aria-expanded={isExpanded}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground">Time per contributor</p>
                    <ul className="space-y-2">
                      {stat.contributorBreakdown.map((contributor) => (
                        <li
                          key={contributor.userId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm"
                        >
                          <span className="font-medium text-foreground">{contributor.name}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <MetricStatBadge tone="blue">
                              {contributor.hours}h
                            </MetricStatBadge>
                            <span className="text-xs text-muted-foreground">
                              {contributor.percentageOfProject}% · {contributor.sessions} session
                              {contributor.sessions !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}

          {projectStats.length === 0 && (
            <div className="py-12 text-center">
              <Folder className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No project activity found for this period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

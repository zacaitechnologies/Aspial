"use client"

import { Users, Clock, TrendingUp, Calendar } from "lucide-react"
import { useMemo } from "react"
import { User, Project } from "@prisma/client"
import type { TimeEntryWithUserDTO } from "../../action"
import { periodRange, type PeriodSelection } from "./period-utils"
import { dashboardSummaryCardStyles, type MetricStatTone } from "./metric-stat-box"

interface AdminStatsProps {
  timeEntries: TimeEntryWithUserDTO[]
  users: User[]
  projects: Project[]
  period: PeriodSelection
}

export function AdminStats({ timeEntries, period }: AdminStatsProps) {
  const stats = useMemo(() => {
    const { start, end } = periodRange(period)

    const periodEntries = timeEntries.filter(
      (entry) => entry.startTime >= start && entry.startTime < end,
    )

    const totalHours = periodEntries.reduce((sum, entry) => sum + entry.duration, 0) / 3600
    const activeUsers = new Set(periodEntries.map((entry) => entry.userId)).size
    const avgHoursPerUser = activeUsers > 0 ? totalHours / activeUsers : 0
    const totalProjects = new Set(periodEntries.map((entry) => entry.projectId)).size

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      activeUsers,
      avgHoursPerUser: Math.round(avgHoursPerUser * 10) / 10,
      totalProjects,
    }
  }, [timeEntries, period])

  const statCards: Array<{
    title: string
    value: string
    subtitle: string
    icon: typeof Clock
    tone: MetricStatTone
  }> = [
    {
      title: "Total Hours",
      value: `${stats.totalHours}h`,
      subtitle: "Tracked this period",
      icon: Clock,
      tone: "blue",
    },
    {
      title: "Active Users",
      value: stats.activeUsers.toString(),
      subtitle: "With time entries",
      icon: Users,
      tone: "amber",
    },
    {
      title: "Avg Hours / User",
      value: `${stats.avgHoursPerUser}h`,
      subtitle: "Per active member",
      icon: TrendingUp,
      tone: "green",
    },
    {
      title: "Active Projects",
      value: stats.totalProjects.toString(),
      subtitle: "Including no-project",
      icon: Calendar,
      tone: "violet",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {statCards.map((stat) => {
        const palette = dashboardSummaryCardStyles[stat.tone]
        return (
          <div
            key={stat.title}
            className={`rounded-2xl border-2 p-5 shadow-sm transition-shadow hover:shadow-md ${palette.card}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`mt-1 text-3xl font-bold tabular-nums ${palette.value}`}>{stat.value}</p>
                <p className="mt-1 text-xs text-gray-600">{stat.subtitle}</p>
              </div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${palette.icon}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

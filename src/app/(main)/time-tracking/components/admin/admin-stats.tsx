"use client"

import { Users, Clock, TrendingUp, Calendar } from "lucide-react"
import { useMemo } from "react"
import { User, Project } from "@prisma/client"
import type { TimeEntryWithUserDTO } from "../../action"

interface TimeEntryUser {
  id: string
  firstName: string
  lastName: string
  email: string
  profilePicture: string | null
}

interface AdminStatsProps {
  timeEntries: TimeEntryWithUserDTO[]
  users: User[]
  projects: Project[]
  selectedPeriod: "week" | "month" | "quarter"
}

export function AdminStats({ timeEntries, users, projects, selectedPeriod }: AdminStatsProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const periodStart = new Date()

    switch (selectedPeriod) {
      case "week":
        periodStart.setDate(now.getDate() - 7)
        break
      case "month":
        periodStart.setMonth(now.getMonth() - 1)
        break
      case "quarter":
        periodStart.setMonth(now.getMonth() - 3)
        break
    }

    const periodEntries = timeEntries.filter((entry) => entry.startTime >= periodStart)

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
  }, [timeEntries, selectedPeriod])

  const statCards = [
    {
      title: "Total Hours",
      value: `${stats.totalHours}h`,
      icon: Clock,
    },
    {
      title: "Active Users",
      value: stats.activeUsers.toString(),
      icon: Users,
    },
    {
      title: "Avg Hours/User",
      value: `${stats.avgHoursPerUser}h`,
      icon: TrendingUp,
    },
    {
      title: "Active Projects",
      value: stats.totalProjects.toString(),
      icon: Calendar,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div
          key={stat.title}
          className="relative overflow-hidden rounded-2xl bg-card p-6 border border-border shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary">
              <stat.icon className="w-6 h-6 text-secondary-foreground" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

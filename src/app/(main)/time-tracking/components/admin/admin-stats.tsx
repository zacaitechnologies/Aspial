"use client"

import { Users, Clock, TrendingUp, Calendar } from "lucide-react"
import { useMemo } from "react"
import { TimeEntry, User, Project } from "@prisma/client"

interface AdminStatsProps {
  timeEntries: (TimeEntry & {
    user: User
    project: Project
  })[]
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
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-50 to-cyan-50",
    },
    {
      title: "Active Users",
      value: stats.activeUsers.toString(),
      icon: Users,
      color: "from-purple-500 to-pink-500",
      bgColor: "from-purple-50 to-pink-50",
    },
    {
      title: "Avg Hours/User",
      value: `${stats.avgHoursPerUser}h`,
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
      bgColor: "from-green-50 to-emerald-50",
    },
    {
      title: "Active Projects",
      value: stats.totalProjects.toString(),
      icon: Calendar,
      color: "from-orange-500 to-red-500",
      bgColor: "from-orange-50 to-red-50",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div
          key={stat.title}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.bgColor} p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Decorative gradient overlay */}
          <div
            className={`absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-xl`}
          />
        </div>
      ))}
    </div>
  )
}

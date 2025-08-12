"use client"

import { useMemo } from "react"
import { User, Clock, TrendingUp } from "lucide-react"
import { TimeEntry, User as UserType, Project } from "@prisma/client"

interface UserTimeOverviewProps {
  timeEntries: (TimeEntry & {
    user: UserType
    project: Project
  })[]
  users: UserType[]
  projects: Project[]
  selectedPeriod: "week" | "month" | "quarter"
}

export function UserTimeOverview({ timeEntries, users, projects, selectedPeriod }: UserTimeOverviewProps) {
  const userStats = useMemo(() => {
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

    const userStatsMap = new Map()

    users.forEach((user) => {
      const userEntries = periodEntries.filter((entry) => entry.userId === user.id)
      const totalHours = userEntries.reduce((sum, entry) => sum + entry.duration, 0) / 3600
      const projectsWorked = new Set(userEntries.map((entry) => entry.projectId)).size
      const lastActivity =
        userEntries.length > 0 ? Math.max(...userEntries.map((entry) => entry.endTime ? entry.endTime.getTime() : 0)) : null

      userStatsMap.set(user.id, {
        user,
        totalHours: Math.round(totalHours * 10) / 10,
        projectsWorked,
        lastActivity: lastActivity ? new Date(lastActivity) : null,
        entries: userEntries.length,
      })
    })

    return Array.from(userStatsMap.values()).sort((a, b) => b.totalHours - a.totalHours)
  }, [timeEntries, users, selectedPeriod])

  const formatLastActivity = (date: Date | null) => {
    if (!date) return "No activity"
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
            <User className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Team Overview</h2>
        </div>

        <div className="space-y-4">
          {userStats.map((stat, index) => (
            <div
              key={stat.user.id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold">
                    {stat.user.firstName.charAt(0).toUpperCase()}
                  </div>
                  {index < 3 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {index + 1}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">{`${stat.user.firstName} ${stat.user.lastName}`}</h3>
                  <p className="text-sm text-gray-500">{stat.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-blue-600 font-semibold">
                    <Clock className="w-4 h-4" />
                    {stat.totalHours}h
                  </div>
                  <p className="text-gray-500 text-xs">Total Hours</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center gap-1 text-purple-600 font-semibold">
                    <TrendingUp className="w-4 h-4" />
                    {stat.projectsWorked}
                  </div>
                  <p className="text-gray-500 text-xs">Projects</p>
                </div>

                <div className="text-center min-w-[80px]">
                  <p className="text-gray-700 font-medium text-xs">{formatLastActivity(stat.lastActivity)}</p>
                  <p className="text-gray-500 text-xs">Last Active</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {userStats.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No user activity found for this period</p>
          </div>
        )}
      </div>
    </div>
  )
}

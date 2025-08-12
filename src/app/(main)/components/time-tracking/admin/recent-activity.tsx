"use client"

import { useMemo } from "react"
import { Activity, Clock } from "lucide-react"
import { TimeEntry, User as UserType, Project } from "@prisma/client"

interface RecentActivityProps {
  timeEntries: (TimeEntry & {
    user: UserType
    project: Project
  })[]
  users: UserType[]
  projects: Project[]
}

export function RecentActivity({ timeEntries, users, projects }: RecentActivityProps) {
  const recentActivities = useMemo(() => {
    const userMap = new Map(users.map((user) => [user.id, user]))
    const projectMap = new Map(projects.map((project) => [project.id, project]))

    return timeEntries
      .sort((a, b) => (b.endTime ? b.endTime.getTime() : 0) - (a.endTime ? a.endTime.getTime() : 0))
      .slice(0, 20)
      .filter((entry) => entry.user && entry.project)
  }, [timeEntries, users, projects])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  return (
    <div className="relative h-full">
      <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-sm transition-all duration-200"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {activity.user?.firstName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">{`${activity.user?.firstName} ${activity.user?.lastName}`}</span>
                  <span className="text-gray-500 text-xs">worked on</span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 bg-blue-500"
                  />
                  <span className="text-sm text-gray-700 font-medium truncate">{activity.project?.name}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(activity.duration)}
                  </div>
                  <span>{activity.endTime ? formatTimeAgo(activity.endTime) : "In progress"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {recentActivities.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity found</p>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useMemo, useState, useEffect } from "react"
import { Activity, Clock } from "lucide-react"
import { TimeEntry, User as UserType, Project } from "@prisma/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserWithProfilePicture extends UserType {
  profilePicture: string | null
}

interface RecentActivityProps {
  timeEntries: (TimeEntry & {
    user: UserWithProfilePicture
    project: Project
  })[]
  users: UserWithProfilePicture[]
  projects: Project[]
}

export function RecentActivity({ timeEntries, users, projects }: RecentActivityProps) {
  const [now, setNow] = useState<Date>(() => new Date())
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const interval = setInterval(() => {
      setNow(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

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
    if (!isMounted) {
      // Return a consistent format during SSR
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${month}/${day}/${year}`
    }

    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    // Use consistent date format instead of locale-dependent
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}/${day}/${year}`
  }

  return (
    <div className="relative h-full">
      <div className="relative z-10 bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xl h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[var(--color-secondary)] rounded-lg">
            <Activity className="w-5 h-5 text-[var(--color-secondary-foreground)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--color-foreground)]">Recent Activity</h2>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-[var(--color-muted)] rounded-lg border border-[var(--color-border)]"
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage 
                  src={activity.user?.profilePicture || undefined} 
                  alt={`${activity.user?.firstName} ${activity.user?.lastName}`} 
                />
                <AvatarFallback className="bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] text-sm font-semibold">
                  {activity.user?.firstName.charAt(0).toUpperCase()}
                  {activity.user?.lastName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-[var(--color-foreground)] text-sm">{`${activity.user?.firstName} ${activity.user?.lastName}`}</span>
                  <span className="text-[var(--color-muted-foreground)] text-xs">worked on</span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 bg-[var(--color-accent)]"
                  />
                  <span className="text-sm text-[var(--color-foreground)] font-medium truncate">{activity.project?.name}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
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
            <Activity className="w-12 h-12 text-[var(--color-muted-foreground)] mx-auto mb-4" />
            <p className="text-[var(--color-muted-foreground)]">No recent activity found</p>
          </div>
        )}
      </div>
    </div>
  )
}

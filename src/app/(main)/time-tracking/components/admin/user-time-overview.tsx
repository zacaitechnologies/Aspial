"use client"

import { useMemo, useState, useEffect } from "react"
import { User, Clock, TrendingUp } from "lucide-react"
import { TimeEntry, User as UserType, Project } from "@prisma/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserWithProfilePicture extends UserType {
  profilePicture: string | null
}

interface UserTimeOverviewProps {
  timeEntries: (TimeEntry & {
    user: UserWithProfilePicture
    project: Project
  })[]
  users: UserWithProfilePicture[]
  projects: Project[]
  selectedPeriod: "week" | "month" | "quarter"
}

export function UserTimeOverview({ timeEntries, users, projects, selectedPeriod }: UserTimeOverviewProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
    
    if (!isMounted) {
      // Return a consistent format during SSR
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${month}/${day}/${year}`
    }

    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return "Just now"
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
    <div className="relative">
      <div className="relative z-10 bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[var(--color-secondary)] rounded-lg">
            <User className="w-5 h-5 text-[var(--color-secondary-foreground)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--color-foreground)]">Team Overview</h2>
        </div>

        <div className="space-y-4">
          {userStats.map((stat, index) => (
            <div
              key={stat.user.id}
              className="flex items-center justify-between p-4 bg-[var(--color-muted)] rounded-xl border border-[var(--color-border)]"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage 
                      src={stat.user.profilePicture || undefined} 
                      alt={`${stat.user.firstName} ${stat.user.lastName}`} 
                    />
                    <AvatarFallback className="bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] font-semibold">
                      {stat.user.firstName.charAt(0).toUpperCase()}
                      {stat.user.lastName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {index < 3 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--color-accent-foreground)]">
                      {index + 1}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-[var(--color-foreground)]">{`${stat.user.firstName} ${stat.user.lastName}`}</h3>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{stat.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-[var(--color-primary)] font-semibold">
                    <Clock className="w-4 h-4" />
                    {stat.totalHours}h
                  </div>
                  <p className="text-[var(--color-muted-foreground)] text-xs">Total Hours</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center gap-1 text-[var(--color-accent)] font-semibold">
                    <TrendingUp className="w-4 h-4" />
                    {stat.projectsWorked}
                  </div>
                  <p className="text-[var(--color-muted-foreground)] text-xs">Projects</p>
                </div>

                <div className="text-center min-w-[80px]">
                  <p className="text-[var(--color-foreground)] font-medium text-xs">{formatLastActivity(stat.lastActivity)}</p>
                  <p className="text-[var(--color-muted-foreground)] text-xs">Last Active</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {userStats.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-[var(--color-muted-foreground)] mx-auto mb-4" />
            <p className="text-[var(--color-muted-foreground)]">No user activity found for this period</p>
          </div>
        )}
      </div>
    </div>
  )
}

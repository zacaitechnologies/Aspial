"use client"

import { useMemo, useState, useEffect } from "react"
import { User, Clock, TrendingUp, FolderKanban } from "lucide-react"
import { User as UserType, Project } from "@prisma/client"
import type { TimeEntryWithUserDTO } from "../../action"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { periodRange, type PeriodSelection } from "./period-utils"
import { MetricStatBox } from "./metric-stat-box"

interface UserWithProfilePicture extends UserType {
  profilePicture: string | null
}

interface UserTimeOverviewProps {
  timeEntries: TimeEntryWithUserDTO[]
  users: UserWithProfilePicture[]
  projects: Project[]
  period: PeriodSelection
}

export function UserTimeOverview({ timeEntries, users, period }: UserTimeOverviewProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const userStats = useMemo(() => {
    const { start, end } = periodRange(period)

    const periodEntries = timeEntries.filter(
      (entry) => entry.startTime >= start && entry.startTime < end,
    )

    const userStatsMap = new Map()

    users.forEach((user) => {
      const userEntries = periodEntries.filter((entry) => entry.userId === user.id)
      const totalHours = userEntries.reduce((sum, entry) => sum + entry.duration, 0) / 3600
      const projectsWorked = new Set(userEntries.map((entry) => entry.projectId)).size
      const lastActivity =
        userEntries.length > 0
          ? Math.max(...userEntries.map((entry) => (entry.endTime ? entry.endTime.getTime() : 0)))
          : null

      userStatsMap.set(user.id, {
        user,
        totalHours: Math.round(totalHours * 10) / 10,
        projectsWorked,
        lastActivity: lastActivity ? new Date(lastActivity) : null,
        entries: userEntries.length,
      })
    })

    return Array.from(userStatsMap.values()).sort((a, b) => b.totalHours - a.totalHours)
  }, [timeEntries, users, period])

  const formatLastActivity = (date: Date | null) => {
    if (!date) return "No activity"

    if (!isMounted) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${month}/${day}/${year}`
    }

    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${month}/${day}/${year}`
  }

  return (
    <div className="relative flex flex-col min-h-0">
      <div className="relative z-10 flex flex-col min-h-0 max-h-[min(520px,55vh)] rounded-2xl border-2 border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex shrink-0 items-center gap-3">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Team Overview</h2>
            <p className="text-xs text-muted-foreground">Who logged time this period</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
          {userStats.map((stat, index) => (
            <div
              key={stat.user.id}
              className="flex flex-col gap-3 rounded-xl border-2 border-border border-l-4 border-l-primary bg-card p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage
                      src={stat.user.profilePicture || undefined}
                      alt={`${stat.user.firstName} ${stat.user.lastName}`}
                    />
                    <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
                      {stat.user.firstName.charAt(0).toUpperCase()}
                      {stat.user.lastName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {index < 3 && (
                    <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {index + 1}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-foreground">{`${stat.user.firstName} ${stat.user.lastName}`}</h3>
                  <p className="truncate text-sm text-muted-foreground">{stat.user.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <MetricStatBox
                  tone="blue"
                  label="Hours"
                  value={`${stat.totalHours}h`}
                  icon={<Clock className="h-3 w-3" />}
                />
                <MetricStatBox
                  tone="green"
                  label="Projects"
                  value={stat.projectsWorked}
                  icon={<FolderKanban className="h-3 w-3" />}
                />
                <MetricStatBox
                  tone="amber"
                  label="Last active"
                  value={formatLastActivity(stat.lastActivity)}
                  className="min-w-[5.5rem]"
                />
              </div>
            </div>
          ))}

          {userStats.length === 0 && (
            <div className="py-12 text-center">
              <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No user activity found for this period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

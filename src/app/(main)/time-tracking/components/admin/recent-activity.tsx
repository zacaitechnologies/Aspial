"use client"

import { useMemo, useState, useEffect } from "react"
import { Activity, CheckSquare, ChevronDown, Clock, FileText } from "lucide-react"
import { User as UserType, Project } from "@prisma/client"
import type { TimeEntryWithUserDTO } from "../../action"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MetricStatBadge } from "./metric-stat-box"

interface UserWithProfilePicture extends UserType {
  profilePicture: string | null
}

interface RecentActivityProps {
  timeEntries: TimeEntryWithUserDTO[]
  users: UserWithProfilePicture[]
  projects: Project[]
}

export function RecentActivity({ timeEntries }: RecentActivityProps) {
  const [now, setNow] = useState<Date>(() => new Date())
  const [isMounted, setIsMounted] = useState(false)
  const [expandedEntryIds, setExpandedEntryIds] = useState<number[]>([])

  const toggleExpanded = (id: number) => {
    setExpandedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((entryId) => entryId !== id) : [...prev, id],
    )
  }

  useEffect(() => {
    setIsMounted(true)
    const interval = setInterval(() => {
      setNow(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const recentActivities = useMemo(() => {
    return timeEntries
      .sort((a, b) => (b.endTime ? b.endTime.getTime() : 0) - (a.endTime ? a.endTime.getTime() : 0))
      .slice(0, 20)
      .filter((entry) => entry.user && entry.project)
  }, [timeEntries])

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
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${month}/${day}/${year}`
    }

    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${month}/${day}/${year}`
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col rounded-2xl border-2 border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex shrink-0 items-center gap-3">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
            <p className="text-xs text-muted-foreground">Latest time entries across the team</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {recentActivities.length === 0 ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center py-8 text-center">
              <Activity className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No recent activity found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((activity) => {
                const isExpanded = expandedEntryIds.includes(activity.id)
                const userName = `${activity.user?.firstName ?? ""} ${activity.user?.lastName ?? ""}`.trim()
                const projectLabel = activity.isPlaceholderProject
                  ? "— No project"
                  : (activity.project?.name ?? "Unknown project")
                const timeLabel = activity.endTime ? formatTimeAgo(activity.endTime) : "In progress"

                return (
                  <div
                    key={activity.id}
                    className={`rounded-xl border-2 bg-card p-2.5 transition-shadow hover:shadow-md ${
                      activity.isPlaceholderProject
                        ? "border-border border-l-4 border-l-muted-foreground"
                        : "border-border border-l-4 border-l-accent"
                    }`}
                  >
                    <div className="flex gap-2">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage
                          src={activity.user?.profilePicture || undefined}
                          alt={userName}
                        />
                        <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                          {activity.user?.firstName.charAt(0).toUpperCase()}
                          {activity.user?.lastName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm leading-tight" title={userName}>
                              <span className="font-semibold text-foreground">{userName}</span>
                              <span className="font-normal text-muted-foreground"> worked on</span>
                            </p>
                            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 leading-tight">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${
                                  activity.isPlaceholderProject ? "bg-muted-foreground" : "bg-accent"
                                }`}
                                aria-hidden
                              />
                              <span
                                className={`truncate text-xs font-medium ${
                                  activity.isPlaceholderProject
                                    ? "italic text-muted-foreground"
                                    : "text-foreground"
                                }`}
                                title={projectLabel}
                              >
                                {projectLabel}
                              </span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(activity.id)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                            aria-label={isExpanded ? "Hide details" : "Show details"}
                            aria-expanded={isExpanded}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : "rotate-0"
                              }`}
                            />
                          </button>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <MetricStatBadge
                            tone="blue"
                            className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums"
                          >
                            <Clock className="h-3 w-3 shrink-0" aria-hidden />
                            {formatDuration(activity.duration)}
                          </MetricStatBadge>
                          <span
                            className="truncate text-xs text-muted-foreground tabular-nums"
                            title={timeLabel}
                          >
                            {timeLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 space-y-2 border-t border-border pt-2">
                        <div className="flex items-start gap-2 text-sm">
                          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">Selected Task</p>
                            <p className="break-words font-medium">
                              {activity.task?.title ?? "No task selected"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">Description</p>
                            <p className="break-words font-medium whitespace-pre-wrap">
                              {activity.description?.trim() ? activity.description : "No description"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useMemo } from "react"
import { BarChart3, Folder, Clock } from "lucide-react"
import { TimeEntry } from "@prisma/client"
import { Project } from "@prisma/client"

interface ProjectAnalyticsProps {
  timeEntries: (TimeEntry & {
    user: any
    project: Project
  })[]
  projects: Project[]
  selectedPeriod: "week" | "month" | "quarter"
}

export function ProjectAnalytics({ timeEntries, projects, selectedPeriod }: ProjectAnalyticsProps) {
  const projectStats = useMemo(() => {
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

    const projectStatsMap = new Map()
    const totalHours = periodEntries.reduce((sum, entry) => sum + entry.duration, 0) / 3600

    projects.forEach((project) => {
      const projectEntries = periodEntries.filter((entry) => entry.projectId === project.id)
      const hours = projectEntries.reduce((sum, entry) => sum + entry.duration, 0) / 3600
      const contributors = new Set(projectEntries.map((entry) => entry.userId)).size
      const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0

      if (hours > 0) {
        projectStatsMap.set(project.id, {
          project,
          hours: Math.round(hours * 10) / 10,
          contributors,
          percentage: Math.round(percentage * 10) / 10,
          entries: projectEntries.length,
        })
      }
    })

    return Array.from(projectStatsMap.values()).sort((a, b) => b.hours - a.hours)
  }, [timeEntries, projects, selectedPeriod])

  const maxHours = Math.max(...projectStats.map((stat) => stat.hours), 1)

  return (
    <div className="relative">
      <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Project Analytics</h2>
        </div>

        <div className="space-y-4">
          {projectStats.map((stat) => (
            <div
              key={stat.project.id}
              className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <h3 className="font-semibold text-gray-900">{stat.project.name}</h3>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600 font-semibold">
                    <Clock className="w-4 h-4" />
                    {stat.hours}h
                  </div>
                  <div className="text-gray-500">
                    {stat.contributors} contributor{stat.contributors !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(stat.hours / maxHours) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>{stat.percentage}% of total time</span>
                  <span>
                    {stat.entries} session{stat.entries !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {projectStats.length === 0 && (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No project activity found for this period</p>
          </div>
        )}
      </div>
    </div>
  )
}

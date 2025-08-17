"use client"

import { useState, useEffect } from "react"
import { AdminStats } from "./admin/admin-stats"
import { UserTimeOverview } from "./admin/user-time-overview"
import { ProjectAnalytics } from "./admin/project-analytics"
import { RecentActivity } from "./admin/recent-activity"
import { FloatingElements } from "./floating-elements"
import { TimeEntry, User, Project } from "@prisma/client"

interface AdminTimeTrackingProps {
  initialTimeEntries: (TimeEntry & {
    user: User
    project: Project
  })[]
  initialProjects: Project[]
  initialUsers: User[]
}

export default function AdminTimeTracking({ 
  initialTimeEntries, 
  initialProjects, 
  initialUsers 
}: AdminTimeTrackingProps) {
  const [timeEntries, setTimeEntries] = useState(initialTimeEntries)
  const [projects, setProjects] = useState(initialProjects)
  const [users, setUsers] = useState(initialUsers)
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "quarter">("week")

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 relative">
      <FloatingElements />
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="relative">
          <div className="relative z-10 bg-[var(--color-card)] rounded-2xl p-8 border border-[var(--color-border)] shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold text-[var(--color-foreground)]">
                  Admin Dashboard
                </h1>
                <p className="text-[var(--color-muted-foreground)] mt-2 text-lg">
                  Monitor team productivity and time tracking insights
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-[var(--color-muted)] rounded-lg p-1 border border-[var(--color-border)]">
                  {(["week", "month", "quarter"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        selectedPeriod === period
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <AdminStats 
          timeEntries={timeEntries} 
          users={users} 
          projects={projects} 
          selectedPeriod={selectedPeriod} 
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - User Overview */}
          <div className="xl:col-span-2 space-y-8">
            <UserTimeOverview
              timeEntries={timeEntries}
              users={users}
              projects={projects}
              selectedPeriod={selectedPeriod}
            />

            <ProjectAnalytics 
              timeEntries={timeEntries} 
              projects={projects} 
              selectedPeriod={selectedPeriod} 
            />
          </div>

          {/* Right Column - Recent Activity */}
          <div className="xl:col-span-1">
            <RecentActivity 
              timeEntries={timeEntries} 
              users={users} 
              projects={projects} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

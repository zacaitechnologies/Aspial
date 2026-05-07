"use client"

import { useState } from "react"
import { AdminStats } from "./admin/admin-stats"
import { UserTimeOverview } from "./admin/user-time-overview"
import { ProjectAnalytics } from "./admin/project-analytics"
import { RecentActivity } from "./admin/recent-activity"
import { AllTimeEntries } from "./admin/all-time-entries"
import { FloatingElements } from "./floating-elements"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, Project } from "@prisma/client"
import type { TimeEntryWithUserDTO } from "../action"
import {
  monthOptions,
  yearOptions,
  type PeriodSelection,
  type PeriodView,
} from "./admin/period-utils"

interface UserWithProfilePicture extends User {
  profilePicture: string | null
}

interface AdminTimeTrackingProps {
  initialTimeEntries: TimeEntryWithUserDTO[]
  initialProjects: Project[]
  initialUsers: UserWithProfilePicture[]
}

export default function AdminTimeTracking({
  initialTimeEntries,
  initialProjects,
  initialUsers,
}: AdminTimeTrackingProps) {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [timeEntries] = useState(initialTimeEntries)
  const [projects] = useState(initialProjects)
  const [users] = useState(initialUsers)

  const now = new Date()
  const [view, setView] = useState<PeriodView>("monthly")
  const [year, setYear] = useState<number>(now.getFullYear())
  const [month, setMonth] = useState<number>(now.getMonth())

  const period: PeriodSelection = { view, year, month }
  const years = yearOptions(2020)

  return (
    <div className="min-h-screen bg-background p-4 relative">
      <FloatingElements />
      <div className="mx-auto max-w-7xl space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="relative">
            <TabsList className="grid w-full grid-cols-2 bg-transparent border-primary border">
              <TabsTrigger
                value="dashboard"
                className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="entries"
                className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
              >
                All Entries
              </TabsTrigger>
            </TabsList>
            <div
              className={`absolute top-1 h-[calc(100%-8px)] bg-secondary transition-all duration-300 ease-in-out rounded-md z-0 ${
                activeTab === "dashboard"
                  ? "left-1 w-[calc(50%-4px)]"
                  : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
              }`}
            />
          </div>

          <TabsContent value="dashboard" className="space-y-8">
            {/* Period controls */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Year</label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Month</label>
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(Number(v))}
                  disabled={view === "yearly"}
                >
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((label, idx) => (
                      <SelectItem key={label} value={String(idx)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">View</label>
                <div className="flex bg-muted rounded-lg p-1 border border-border">
                  {(["monthly", "yearly"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium ${
                        view === v
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <AdminStats
              timeEntries={timeEntries}
              users={users}
              projects={projects}
              period={period}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Left Column - User Overview */}
              <div className="xl:col-span-2 space-y-8">
                <UserTimeOverview
                  timeEntries={timeEntries}
                  users={users}
                  projects={projects}
                  period={period}
                />

                <ProjectAnalytics
                  timeEntries={timeEntries}
                  projects={projects}
                  period={period}
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
          </TabsContent>

          <TabsContent value="entries">
            <AllTimeEntries users={users} projects={projects} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

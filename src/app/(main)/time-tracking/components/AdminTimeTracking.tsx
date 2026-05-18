"use client"

import { useState } from "react"
import { Calendar, Filter } from "lucide-react"
import { AdminStats } from "./admin/admin-stats"
import { UserTimeOverview } from "./admin/user-time-overview"
import { ProjectAnalytics } from "./admin/project-analytics"
import { RecentActivity } from "./admin/recent-activity"
import { AllTimeEntries } from "./admin/all-time-entries"
import { FloatingElements } from "./floating-elements"
import UserTimeTracking from "./UserTimeTracking"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, Project } from "@prisma/client"
import type { TimeEntryDTO, TimeEntryWithUserDTO } from "../action"
import {
  monthOptions,
  yearOptions,
  type PeriodSelection,
  type PeriodView,
} from "./admin/period-utils"

const FILTER_BORDER = "#BDC4A5"

interface UserWithProfilePicture extends User {
  profilePicture: string | null
}

interface AdminTimeTrackingProps {
  initialTimeEntries: TimeEntryWithUserDTO[]
  initialProjects: Project[]
  initialUsers: UserWithProfilePicture[]
  timerEntries: TimeEntryDTO[]
  timerProjects: Project[]
  userId: string
}

export default function AdminTimeTracking({
  initialTimeEntries,
  initialProjects,
  initialUsers,
  timerEntries,
  timerProjects,
  userId,
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
            <TabsList className="grid w-full grid-cols-3 bg-transparent border-primary border">
              <TabsTrigger
                value="timer"
                className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
              >
                Timer
              </TabsTrigger>
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
                activeTab === "timer"
                  ? "left-1 w-[calc(33.333%-4px)]"
                  : activeTab === "dashboard"
                    ? "left-[33.333%] w-[calc(33.333%-2px)]"
                    : "left-[calc(66.666%+1px)] w-[calc(33.333%-4px)]"
              }`}
            />
          </div>

          <TabsContent value="timer">
            <UserTimeTracking
              initialTimeEntries={timerEntries}
              initialProjects={timerProjects}
              userId={userId}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-8">
            {/* Period filters — same layout as All Time Entries */}
            <div className="mb-2 flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
              <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="shrink-0 text-sm font-medium">Filters</span>

              <div className="flex shrink-0 items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger
                    className="h-9 w-[110px] border-2 bg-white"
                    style={{ borderColor: FILTER_BORDER }}
                  >
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(Number(v))}
                  disabled={view === "yearly"}
                >
                  <SelectTrigger
                    className="h-9 w-[min(10rem,70vw)] border-2 bg-white sm:w-[170px]"
                    style={{ borderColor: FILTER_BORDER }}
                  >
                    <SelectValue placeholder="Month" />
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

              <Select value={view} onValueChange={(v) => setView(v as PeriodView)}>
                <SelectTrigger
                  className="h-9 w-[min(8rem,100%)] shrink-0 border-2 bg-white sm:w-32"
                  style={{ borderColor: FILTER_BORDER }}
                >
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stats Overview */}
            <AdminStats
              timeEntries={timeEntries}
              users={users}
              projects={projects}
              period={period}
            />

            {/* Main Content Grid — Recent Activity spans Team Overview through Project Analytics */}
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3 xl:items-stretch">
              <div className="flex min-h-0 flex-col gap-8 xl:col-span-2">
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
              <div className="flex min-h-0 flex-col xl:col-span-1 xl:h-full">
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

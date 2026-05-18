"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, ChevronDown, Clock, Filter, Loader2, RotateCcw, Search, User } from "lucide-react"
import { User as UserType, Project, TaskStatus } from "@prisma/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ProjectPagination } from "@/app/(main)/projects/components/ProjectPagination"
import { fetchAllTimeEntriesFiltered, type TimeEntryWithUserDTO } from "../../action"
import { formatTime } from "../../utils"

// Same border accent colour as the receipts / quotations filter bars
const FILTER_BORDER = "#BDC4A5"

interface UserWithProfilePicture extends UserType {
  profilePicture: string | null
}

interface AllTimeEntriesProps {
  users: UserWithProfilePicture[]
  projects: Project[]
}

const ALL = "__all__"
const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

function buildMonthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) }
}

function formatDateTimeDisplay(date: Date | null): string {
  if (!date) return "—"
  const d = new Date(date)
  const dd = String(d.getDate()).padStart(2, "0")
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${dd}/${mo}/${yyyy} ${hh}:${mm}`
}

const taskStatusLabel: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
}

const taskStatusVariant: Record<TaskStatus, "default" | "secondary" | "outline"> = {
  todo: "outline",
  in_progress: "default",
  done: "secondary",
}

export function AllTimeEntries({ users, projects }: AllTimeEntriesProps) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const [pageSize, setPageSize] = useState(20)
  const [yearFilter, setYearFilter] = useState<string>(String(currentYear))
  const [monthFilter, setMonthFilter] = useState<string>(String(currentMonth))
  const [userId, setUserId] = useState<string>(ALL)
  const [projectId, setProjectId] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [expandedEntryIds, setExpandedEntryIds] = useState<number[]>([])
  const [entries, setEntries] = useState<TimeEntryWithUserDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const yearOptions = useMemo(() => {
    const list: number[] = []
    for (let y = currentYear; y >= 2020; y--) list.push(y)
    return list
  }, [currentYear])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [yearFilter, monthFilter, userId, projectId])

  // Fetch from server
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const year = Number(yearFilter)
    const month = Number(monthFilter)
    const range =
      Number.isFinite(year) && Number.isFinite(month)
        ? buildMonthRange(year, month)
        : undefined
    fetchAllTimeEntriesFiltered({
      startDate: range?.start,
      endDate: range?.end,
      userId: userId === ALL ? undefined : userId,
      projectId: projectId === ALL ? undefined : Number(projectId),
      page,
      pageSize,
    })
      .then((result) => {
        if (cancelled) return
        setEntries(result.entries)
        setTotal(result.total)
      })
      .catch(() => {
        if (cancelled) return
        setEntries([])
        setTotal(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [yearFilter, monthFilter, userId, projectId, page, pageSize])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  // Client-side search over the loaded page
  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries
    const q = searchQuery.toLowerCase()
    return entries.filter(
      (e) =>
        `${e.user.firstName} ${e.user.lastName}`.toLowerCase().includes(q) ||
        e.project.name.toLowerCase().includes(q) ||
        (e.task?.title ?? "").toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q),
    )
  }, [entries, searchQuery])

  const hasActiveFilters =
    userId !== ALL ||
    projectId !== ALL ||
    yearFilter !== String(currentYear) ||
    monthFilter !== String(currentMonth)

  const reset = () => {
    setYearFilter(String(currentYear))
    setMonthFilter(String(currentMonth))
    setUserId(ALL)
    setProjectId(ALL)
  }

  const toggleExpanded = (id: number) =>
    setExpandedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  return (
    <div className="container mx-auto">
      {/* Search + Filters */}
      <div className="mb-6 flex flex-col gap-3">
        {/* Search bar — identical pattern to receipts/quotations */}
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by user, project, task or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full border-2 bg-white pl-9"
            style={{ borderColor: FILTER_BORDER }}
            aria-label="Search time entries"
          />
        </div>

        {/* Filter row */}
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 text-sm font-medium">Filters</span>

          {/* User filter */}
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger
              className="h-9 w-[min(12rem,100%)] shrink-0 border-2 bg-white sm:w-48"
              style={{ borderColor: FILTER_BORDER }}
            >
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Separate year + month filters for easier navigation */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger
                className="h-9 w-[110px] border-2 bg-white"
                style={{ borderColor: FILTER_BORDER }}
              >
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger
                className="h-9 w-[min(10rem,70vw)] border-2 bg-white sm:w-[170px]"
                style={{ borderColor: FILTER_BORDER }}
              >
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month, idx) => (
                  <SelectItem key={month} value={String(idx)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project filter */}
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger
              className="h-9 w-[min(12rem,100%)] shrink-0 border-2 bg-white sm:w-48"
              style={{ borderColor: FILTER_BORDER }}
            >
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="shrink-0 border-2 bg-white"
              style={{ borderColor: FILTER_BORDER }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Clear Filters
            </Button>
          )}

          <span className="ml-auto shrink-0 pl-2 text-sm whitespace-nowrap text-muted-foreground">
            Showing {filteredEntries.length} of {total} entries
          </span>
        </div>
      </div>

      {/* Entry cards */}
      <div className="relative">
        <div className="space-y-2">
          {filteredEntries.map((entry) => {
            const isExpanded = expandedEntryIds.includes(entry.id)
            const isActive = entry.isActive && !entry.endTime

            return (
              <Card
                key={entry.id}
                className="hover:shadow-md transition-shadow duration-200 border-l-2 pt-0 pb-0"
                style={{ borderLeftColor: isActive ? "#10b981" : "#3b82f6" }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Left — main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-semibold truncate text-foreground">
                          {entry.user.firstName} {entry.user.lastName}
                        </span>
                        {isActive && (
                          <Badge variant="default" className="text-xs shrink-0">
                            Active
                          </Badge>
                        )}
                        {entry.task && (
                          <Badge variant={taskStatusVariant[entry.task.status]} className="text-xs shrink-0">
                            {taskStatusLabel[entry.task.status]}
                          </Badge>
                        )}
                      </div>

                      {/* Metadata row */}
                      <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="font-medium text-gray-900">
                            {entry.isPlaceholderProject ? (
                              <span className="text-gray-500 italic">— No project</span>
                            ) : (
                              entry.project.name
                            )}
                          </span>
                        </div>

                        {entry.task && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="truncate max-w-[200px]" title={entry.task.title}>
                              {entry.task.title}
                            </span>
                          </>
                        )}

                        <span className="text-gray-400">•</span>
                        <span>{formatDateTimeDisplay(entry.startTime)}</span>

                        {entry.endTime && (
                          <>
                            <span className="text-gray-400">→</span>
                            <span>{formatDateTimeDisplay(entry.endTime)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right — duration box + chevron, same layout as quotation price box */}
                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-right">
                        <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded px-3 py-1.5 border border-blue-200">
                          <p className="text-[10px] text-gray-600 mb-0.5 flex items-center justify-end gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Duration
                          </p>
                          <p className="text-base font-bold font-mono text-blue-700">
                            {formatTime(entry.duration)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpanded(entry.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent"
                        aria-label={isExpanded ? "Hide details" : "Show details"}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: task + description */}
                  {isExpanded && (
                    <div className="mt-3 border-t border-border pt-3 space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Task</p>
                        {entry.task ? (
                          <div className="inline-flex items-center gap-2 mt-1">
                            <Badge variant={taskStatusVariant[entry.task.status]}>
                              {taskStatusLabel[entry.task.status]}
                            </Badge>
                            <span className="text-sm">{entry.task.title}</span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">No task selected</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Description</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                          {entry.description?.trim() ? (
                            entry.description
                          ) : (
                            <span className="text-muted-foreground">No description</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Refresh overlay */}
        {loading && entries.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <span>Loading...</span>
            </div>
          </div>
        )}

        {/* Initial full-page spinner */}
        {loading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-primary">
            <Loader2 className="mb-4 h-10 w-10 animate-spin" />
            <p className="text-lg font-medium">Loading entries…</p>
          </div>
        )}
      </div>

      {/* Empty states */}
      {!loading && filteredEntries.length === 0 && entries.length === 0 && !hasActiveFilters && !searchQuery && (
        <div className="py-12 text-center">
          <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No time entries found for this period.</p>
        </div>
      )}

      {!loading && filteredEntries.length === 0 && hasActiveFilters && (
        <div className="py-12 text-center">
          <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No entries match the selected filters.</p>
          <Button variant="outline" className="mt-4" onClick={reset}>
            Clear Filters
          </Button>
        </div>
      )}

      {!loading && filteredEntries.length === 0 && !hasActiveFilters && searchQuery && (
        <div className="py-12 text-center">
          <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No entries match your search.</p>
          <Button variant="outline" className="mt-4" onClick={() => setSearchInput("")}>
            Clear Search
          </Button>
        </div>
      )}

      <ProjectPagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPage(1)
          setPageSize(nextSize)
        }}
        itemLabel="entries"
      />
    </div>
  )
}

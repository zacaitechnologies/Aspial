"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Filter, Loader2, RotateCcw } from "lucide-react"
import { User as UserType, Project } from "@prisma/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchAllTimeEntriesFiltered, type TimeEntryWithUserDTO } from "../../action"
import { formatTime } from "../../utils"

interface UserWithProfilePicture extends UserType {
  profilePicture: string | null
}

interface AllTimeEntriesProps {
  users: UserWithProfilePicture[]
  projects: Project[]
}

const ALL = "__all__"
const PAGE_SIZE = 50

function firstDayOfThisMonth(): string {
  const d = new Date()
  return formatYmd(new Date(d.getFullYear(), d.getMonth(), 1))
}

function todayYmd(): string {
  return formatYmd(new Date())
}

function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseYmdLocal(value: string): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

function formatDateTimeDisplay(date: Date | null): string {
  if (!date) return "—"
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${day} ${hh}:${mm}`
}

export function AllTimeEntries({ users, projects }: AllTimeEntriesProps) {
  const [startDate, setStartDate] = useState<string>(firstDayOfThisMonth())
  const [endDate, setEndDate] = useState<string>(todayYmd())
  const [userId, setUserId] = useState<string>(ALL)
  const [projectId, setProjectId] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [entries, setEntries] = useState<TimeEntryWithUserDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1)
  }, [startDate, endDate, userId, projectId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const startBoundary = parseYmdLocal(startDate)
        const endBoundaryDay = parseYmdLocal(endDate)
        // End is inclusive in the UI, so push it to the next day to match
        // the half-open `< end` boundary used on the server.
        const endBoundary = endBoundaryDay
          ? new Date(
              endBoundaryDay.getFullYear(),
              endBoundaryDay.getMonth(),
              endBoundaryDay.getDate() + 1
            )
          : undefined

        const result = await fetchAllTimeEntriesFiltered({
          startDate: startBoundary,
          endDate: endBoundary,
          userId: userId === ALL ? undefined : userId,
          projectId: projectId === ALL ? undefined : Number(projectId),
          page,
          pageSize: PAGE_SIZE,
        })
        if (cancelled) return
        setEntries(result.entries)
        setTotal(result.total)
      } catch (err) {
        if (cancelled) return
        setEntries([])
        setTotal(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [startDate, endDate, userId, projectId, page])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  )

  const reset = () => {
    setStartDate(firstDayOfThisMonth())
    setEndDate(todayYmd())
    setUserId(ALL)
    setProjectId(ALL)
  }

  return (
    <div className="relative">
      <div className="relative z-10 bg-card rounded-2xl p-6 border border-border shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary rounded-lg">
            <Filter className="w-5 h-5 text-secondary-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">All Time Entries</h2>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">User</label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              className="w-full h-9"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading entries...
                    </div>
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No entries match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.user.firstName} {entry.user.lastName}
                    </TableCell>
                    <TableCell>{entry.project.name}</TableCell>
                    <TableCell>
                      {entry.task ? (
                        <span className="inline-flex items-center gap-2">
                          <Badge variant="outline">{entry.task.status}</Badge>
                          <span className="truncate" title={entry.task.title}>
                            {entry.task.title}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTimeDisplay(entry.startTime)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {entry.endTime ? formatDateTimeDisplay(entry.endTime) : "Active"}
                    </TableCell>
                    <TableCell className="font-mono">{formatTime(entry.duration)}</TableCell>
                    <TableCell className="max-w-xs">
                      {entry.description ? (
                        <span className="line-clamp-2" title={entry.description}>
                          {entry.description}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total === 0
              ? "0 entries"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

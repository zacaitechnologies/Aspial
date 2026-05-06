"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { bulkUpsertLeaveBalances, fetchAllLeaveBalances } from "../action"
import type { LeaveBalanceDTO, LeaveTypeDTO } from "../types"

interface BalanceGridEditorProps {
  users: { id: string; firstName: string; lastName: string }[]
  leaveTypes: LeaveTypeDTO[]
  currentYear: number
  onSuccess?: () => void
}

type Cell = {
  entitled: number
  used: number
  pending: number
  balance: number
  /** Editor's draft value, kept as string so the input can show empty/partial inputs. */
  draft: string
  dirty: boolean
}

type GridState = Record<string, Record<string, Cell>>

function balanceKey(userId: string, code: string) {
  return `${userId}::${code}`
}

export default function BalanceGridEditor({
  users,
  leaveTypes,
  currentYear,
  onSuccess,
}: BalanceGridEditorProps) {
  // Show only paid leave types (entitlement-tracked); UNPAID and other isUnpaid types
  // intentionally omitted because they have no entitled balance to override.
  const paidLeaveTypes = useMemo(
    () => leaveTypes.filter((t) => t.isActive && !t.isUnpaid),
    [leaveTypes]
  )

  const [grid, setGrid] = useState<GridState>({})
  const [loading, setLoading] = useState(false)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const balances = (await fetchAllLeaveBalances(currentYear)) as Array<
          LeaveBalanceDTO & { user: { firstName: string; lastName: string } }
        >
        if (cancelled) return
        const next: GridState = {}
        for (const u of users) {
          next[u.id] = {}
          for (const t of paidLeaveTypes) {
            next[u.id][t.code] = {
              entitled: t.defaultEntitlement,
              used: 0,
              pending: 0,
              balance: t.defaultEntitlement,
              draft: String(t.defaultEntitlement),
              dirty: false,
            }
          }
        }
        for (const b of balances) {
          if (!next[b.userId]) continue
          // Skip unpaid balances — they're not editable in this grid.
          if (!paidLeaveTypes.some((t) => t.code === b.leaveType)) continue
          next[b.userId][b.leaveType] = {
            entitled: b.entitled,
            used: b.used,
            pending: b.pending,
            balance: b.balance,
            draft: String(b.entitled),
            dirty: false,
          }
        }
        setGrid(next)
      } catch (error) {
        toast({
          title: "Failed to load balances",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [currentYear, users, paidLeaveTypes, toast])

  function setDraft(userId: string, code: string, value: string) {
    setGrid((prev) => {
      const cell = prev[userId]?.[code]
      if (!cell) return prev
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          [code]: {
            ...cell,
            draft: value,
            dirty: value !== String(cell.entitled),
          },
        },
      }
    })
  }

  async function saveRow(userId: string) {
    const row = grid[userId]
    if (!row) return
    const entries = Object.entries(row)
      .filter(([, cell]) => cell.dirty)
      .map(([code, cell]) => ({
        leaveType: code,
        entitled: parseFloat(cell.draft || "0"),
      }))
      .filter((e) => Number.isFinite(e.entitled) && e.entitled >= 0)

    if (entries.length === 0) return

    setSavingUserId(userId)
    try {
      await bulkUpsertLeaveBalances({ userId, year: currentYear, entries })
      // Refresh row from server response — easier: just zero the dirty flag and update entitled.
      setGrid((prev) => {
        const next = { ...prev }
        const row = { ...next[userId] }
        for (const e of entries) {
          const cell = row[e.leaveType]
          if (cell) {
            row[e.leaveType] = {
              ...cell,
              entitled: e.entitled,
              balance: e.entitled - cell.used - cell.pending,
              draft: String(e.entitled),
              dirty: false,
            }
          }
        }
        next[userId] = row
        return next
      })
      toast({ title: "Balances saved" })
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingUserId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(q))
  }, [users, search])

  const dirtyByUser = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const u of users) {
      const row = grid[u.id]
      map[u.id] = row ? Object.values(row).some((c) => c.dirty) : false
    }
    return map
  }, [users, grid])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Override Employee Balances</h3>
          <p className="text-sm text-muted-foreground">
            Edit the entitled days each employee has for {currentYear}. Used and pending values
            update automatically as leaves are processed and are read-only here.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading balances...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                  Employee
                </TableHead>
                {paidLeaveTypes.map((t) => (
                  <TableHead key={t.code} className="min-w-[180px]">
                    {t.name}
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      default {t.defaultEntitlement}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="text-right min-w-[120px]">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={paidLeaveTypes.length + 2}
                    className="text-center text-muted-foreground py-6"
                  >
                    No employees match the filter.
                  </TableCell>
                </TableRow>
              )}
              {filteredUsers.map((u) => {
                const row = grid[u.id]
                const isDirty = dirtyByUser[u.id]
                return (
                  <TableRow key={u.id}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      <div>{u.firstName} {u.lastName}</div>
                      {isDirty && (
                        <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-800 border-amber-200">
                          Unsaved
                        </Badge>
                      )}
                    </TableCell>
                    {paidLeaveTypes.map((t) => {
                      const cell = row?.[t.code]
                      return (
                        <TableCell key={t.code}>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={cell?.draft ?? ""}
                            onChange={(e) => setDraft(u.id, t.code, e.target.value)}
                            className={cell?.dirty ? "border-amber-400" : undefined}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            used {cell?.used ?? 0} · pending {cell?.pending ?? 0} · bal{" "}
                            {cell?.balance ?? cell?.entitled ?? 0}
                          </p>
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={isDirty ? "default" : "outline"}
                        disabled={!isDirty || savingUserId === u.id}
                        onClick={() => saveRow(u.id)}
                        className="gap-1"
                      >
                        {savingUserId === u.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

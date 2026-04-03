"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { LeaveTypeBadge } from "./LeaveStatusBadge"
import type { EntitlementDefaultDTO } from "../types"
import { updateEntitlementDefault } from "../action"
import { Pencil } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface LeaveEntitlementSettingsProps {
  defaults: EntitlementDefaultDTO[]
  onSuccess?: () => void
}

export default function LeaveEntitlementSettings({
  defaults,
  onSuccess,
}: LeaveEntitlementSettingsProps) {
  const [editing, setEditing] = useState<EntitlementDefaultDTO | null>(null)
  const [newDays, setNewDays] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  async function handleSave() {
    if (!editing) return
    setIsLoading(true)
    try {
      await updateEntitlementDefault({
        leaveType: editing.leaveType,
        entitledDays: parseFloat(newDays),
      })
      toast({ title: "Default entitlement updated" })
      setEditing(null)
      setNewDays("")
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Global Default Entitlements</h3>
          <p className="text-sm text-muted-foreground">
            These are the default number of leave days each employee is entitled to per year.
            Changes only affect new employee balances - existing balances are not modified.
          </p>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>Default Days</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defaults.map((d) => (
                <TableRow key={d.leaveType}>
                  <TableCell>
                    <LeaveTypeBadge type={d.leaveType} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {d.leaveType === "UNPAID" ? "Unlimited" : `${d.entitledDays} days`}
                  </TableCell>
                  <TableCell className="text-right">
                    {d.leaveType !== "UNPAID" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditing(d)
                          setNewDays(d.entitledDays.toString())
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
            setNewDays("")
          }
        }}
      >
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Edit Default Entitlement</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Leave Type</Label>
                <div className="mt-1">
                  <LeaveTypeBadge type={editing.leaveType} />
                </div>
              </div>
              <div>
                <Label htmlFor="entitled-days">Default Days Per Year</Label>
                <Input
                  id="entitled-days"
                  type="number"
                  min="0"
                  step="0.5"
                  value={newDays}
                  onChange={(e) => setNewDays(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !newDays}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { leaveTypeOptions } from "../types"
import { updateEmployeeBalance } from "../action"
import { useToast } from "@/components/ui/use-toast"

interface EmployeeBalanceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: { id: string; firstName: string; lastName: string }[]
  currentYear: number
  onSuccess?: () => void
}

export default function EmployeeBalanceEditDialog({
  open,
  onOpenChange,
  users,
  currentYear,
  onSuccess,
}: EmployeeBalanceEditDialogProps) {
  const [userId, setUserId] = useState("")
  const [leaveType, setLeaveType] = useState("")
  const [entitled, setEntitled] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  async function handleSave() {
    if (!userId || !leaveType || !entitled) return
    setIsLoading(true)
    try {
      await updateEmployeeBalance({
        userId,
        leaveType: leaveType as "PAID" | "UNPAID",
        year: currentYear,
        entitled: parseFloat(entitled),
      })
      toast({ title: "Employee balance updated" })
      setUserId("")
      setLeaveType("")
      setEntitled("")
      onOpenChange(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Override Employee Balance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select onValueChange={setUserId} value={userId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Leave Type</Label>
            <Select onValueChange={setLeaveType} value={leaveType}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypeOptions
                  .filter((o) => o.value !== "UNPAID")
                  .map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Entitled Days (for {currentYear})</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={entitled}
              onChange={(e) => setEntitled(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !userId || !leaveType || !entitled}
          >
            {isLoading ? "Saving..." : "Update Balance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

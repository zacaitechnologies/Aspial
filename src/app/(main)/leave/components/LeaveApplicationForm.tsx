"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { applyLeaveSchema } from "@/lib/validation"
import { applyForLeave } from "../action"
import { leaveTypeOptions, halfDayOptions, calculateLeaveDaysClient } from "../types"
import type { LeaveBalanceDTO } from "../types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { AlertTriangle } from "lucide-react"
import { format } from "date-fns"

interface LeaveApplicationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balances: LeaveBalanceDTO[]
  onSuccess?: () => void
}

export default function LeaveApplicationForm({
  open,
  onOpenChange,
  balances,
  onSuccess,
}: LeaveApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(applyLeaveSchema),
    defaultValues: {
      leaveType: "ANNUAL",
      halfDay: "NONE",
      reason: "",
    },
  })

  const watchLeaveType = form.watch("leaveType")
  const watchStartDate = form.watch("startDate")
  const watchEndDate = form.watch("endDate")
  const watchHalfDay = form.watch("halfDay")

  const selectedBalance = balances.find((b) => b.leaveType === watchLeaveType)
  const estimatedDays =
    watchStartDate && watchEndDate
      ? calculateLeaveDaysClient(new Date(watchStartDate), new Date(watchEndDate), watchHalfDay)
      : 0

  const remaining = selectedBalance
    ? selectedBalance.balance - selectedBalance.pending
    : 0
  const exceedsBalance =
    watchLeaveType !== "UNPAID" && estimatedDays > remaining && remaining >= 0
  const unpaidDays = exceedsBalance ? Math.max(0, estimatedDays - Math.max(0, remaining)) : 0

  async function onSubmit(data: Record<string, unknown>) {
    setIsSubmitting(true)
    try {
      await applyForLeave(data as Parameters<typeof applyForLeave>[0])
      toast({ title: "Leave application submitted" })
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit leave",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leaveTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="halfDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {halfDayOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the reason for your leave..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Balance info */}
            {estimatedDays > 0 && (
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Duration:</span> {estimatedDays} day(s)
                </p>
                {selectedBalance && watchLeaveType !== "UNPAID" && (
                  <p className="text-sm">
                    <span className="font-medium">Remaining balance:</span>{" "}
                    {Math.max(0, remaining)} / {selectedBalance.entitled} days
                  </p>
                )}
                {exceedsBalance && unpaidDays > 0 && (
                  <div className="flex items-start gap-2 text-sm text-orange-600 mt-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      You have {Math.max(0, remaining)} {watchLeaveType.toLowerCase()} day(s)
                      remaining. {unpaidDays} day(s) will be counted as unpaid leave.
                    </span>
                  </div>
                )}
                {watchLeaveType === "UNPAID" && (
                  <p className="text-sm text-muted-foreground">
                    All {estimatedDays} day(s) will be unpaid.
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

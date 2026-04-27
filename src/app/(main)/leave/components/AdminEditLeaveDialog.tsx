"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { adminEditLeaveSchema, type AdminEditLeaveValues } from "@/lib/validation"
import { adminEditLeave } from "../action"
import { leaveTypeOptions, halfDayOptions } from "../types"
import type { LeaveApplicationDTO } from "../types"
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
import { format } from "date-fns"

interface AdminEditLeaveDialogProps {
  application: LeaveApplicationDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function AdminEditLeaveDialog({
  application,
  open,
  onOpenChange,
  onSuccess,
}: AdminEditLeaveDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<AdminEditLeaveValues>({
    resolver: zodResolver(adminEditLeaveSchema),
    defaultValues: {
      leaveId: 0,
    },
  })

  // Preload when the dialog opens — defaultValues only run on first mount, often before `application` exists.
  useEffect(() => {
    if (!open || !application) return
    form.reset({
      leaveId: application.id,
      leaveType: application.leaveType,
      startDate: new Date(application.startDate),
      endDate: new Date(application.endDate),
      halfDay: application.halfDay,
      reason: application.reason,
    })
  }, [open, application?.id, form])

  async function onSubmit(data: AdminEditLeaveValues) {
    if (!application) return
    setIsSubmitting(true)
    try {
      await adminEditLeave({ ...data, leaveId: application.id })
      toast({ title: "Leave updated successfully" })
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!application) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Edit Leave - {application.user.firstName} {application.user.lastName}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
                        value={
                          field.value
                            ? format(new Date(field.value), "yyyy-MM-dd")
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : undefined
                          )
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
                        value={
                          field.value
                            ? format(new Date(field.value), "yyyy-MM-dd")
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : undefined
                          )
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

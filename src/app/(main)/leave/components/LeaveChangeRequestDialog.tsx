"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { leaveChangeRequestSchema, type LeaveChangeRequestValues } from "@/lib/validation"
import { requestLeaveChange } from "../action"
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

interface LeaveChangeRequestDialogProps {
  application: LeaveApplicationDTO | null
  type: "CANCEL" | "EDIT"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function LeaveChangeRequestDialog({
  application,
  type,
  open,
  onOpenChange,
  onSuccess,
}: LeaveChangeRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<LeaveChangeRequestValues>({
    resolver: zodResolver(leaveChangeRequestSchema),
    defaultValues: {
      leaveApplicationId: 0,
      type: "EDIT",
      reason: "",
    },
  })

  // defaultValues only apply on first mount; the dialog can mount before `application` is set.
  // Preload the current application when the dialog opens (including PENDING) so the edit fields are filled.
  useEffect(() => {
    if (!open || !application) return
    form.reset({
      leaveApplicationId: application.id,
      type,
      reason: "",
      newLeaveType: type === "EDIT" ? application.leaveType : undefined,
      newHalfDay: type === "EDIT" ? application.halfDay : undefined,
      newStartDate: type === "EDIT" ? new Date(application.startDate) : undefined,
      newEndDate: type === "EDIT" ? new Date(application.endDate) : undefined,
    })
  }, [open, application?.id, type, form])

  async function onSubmit(data: LeaveChangeRequestValues) {
    setIsSubmitting(true)
    try {
      await requestLeaveChange({
        ...data,
        leaveApplicationId: application!.id,
        type,
      })
      toast({
        title: type === "CANCEL" ? "Cancel request submitted" : "Edit request submitted",
        description: "Your request has been sent to admin for approval.",
      })
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit request",
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
            {type === "CANCEL" ? "Request Leave Cancellation" : "Request Leave Edit"}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border p-3 mb-4 text-sm">
          <p>
            <span className="font-medium">Current Leave:</span>{" "}
            {application.leaveType.toLowerCase()} leave
          </p>
          <p>
            <span className="font-medium">Dates:</span>{" "}
            {format(new Date(application.startDate), "MMM d, yyyy")} -{" "}
            {format(new Date(application.endDate), "MMM d, yyyy")}
          </p>
          <p>
            <span className="font-medium">Duration:</span> {application.totalDays} day(s)
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason for {type === "CANCEL" ? "cancellation" : "edit"} request
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Why do you want to ${type === "CANCEL" ? "cancel" : "edit"} this leave?`}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {type === "EDIT" && (
              <>
                <FormField
                  control={form.control}
                  name="newLeaveType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Leave Type (optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Keep current" />
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
                    name="newStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Start Date (optional)</FormLabel>
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
                    name="newEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New End Date (optional)</FormLabel>
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
                  name="newHalfDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Duration (optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Keep current" />
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
              </>
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
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { applyLeaveSchema } from "@/lib/validation"
import { applyForLeave, uploadLeaveAttachment } from "../action"
import { halfDayOptions, calculateLeaveDaysClient } from "../types"
import type { LeaveBalanceDTO, LeaveTypeDTO } from "../types"
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
  FormDescription,
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
import { AlertTriangle, Info, Paperclip, X, Loader2 } from "lucide-react"

interface LeaveApplicationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balances: LeaveBalanceDTO[]
  leaveTypes: LeaveTypeDTO[]
  onSuccess?: () => void
}

export default function LeaveApplicationForm({
  open,
  onOpenChange,
  balances,
  leaveTypes,
  onSuccess,
}: LeaveApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachmentName, setAttachmentName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const activeTypes = useMemo(() => leaveTypes.filter((t) => t.isActive), [leaveTypes])
  const defaultLeaveType = activeTypes[0]?.code ?? ""

  const form = useForm({
    resolver: zodResolver(applyLeaveSchema),
    defaultValues: {
      leaveType: defaultLeaveType,
      halfDay: "NONE",
      reason: "",
      attachmentUrl: undefined,
    },
  })

  const watchLeaveType = form.watch("leaveType")
  const watchStartDate = form.watch("startDate")
  const watchEndDate = form.watch("endDate")
  const watchHalfDay = form.watch("halfDay")

  const selectedTypeMeta = activeTypes.find((t) => t.code === watchLeaveType)
  const isUnpaidType = !!selectedTypeMeta?.isUnpaid
  const requiresReplacementDate = !!selectedTypeMeta?.requiresReplacementDate
  const requiresAttachment = !!selectedTypeMeta?.requiresAttachment
  const watchAttachmentUrl = form.watch("attachmentUrl")

  const selectedBalance = balances.find((b) => b.leaveType === watchLeaveType)
  const estimatedDays =
    watchStartDate && watchEndDate
      ? calculateLeaveDaysClient(
          String(watchStartDate),
          String(watchEndDate),
          watchHalfDay ?? "NONE"
        )
      : 0

  /** Days still available before this application (excludes other pending). */
  const remaining = selectedBalance
    ? selectedBalance.balance - selectedBalance.pending
    : 0
  const exceedsBalance = !isUnpaidType && estimatedDays > remaining && remaining >= 0
  const unpaidDays = exceedsBalance ? Math.max(0, estimatedDays - Math.max(0, remaining)) : 0

  /** Paid days this request will consume (capped by what's left). */
  const paidDaysFromThisRequest =
    isUnpaidType || estimatedDays <= 0
      ? 0
      : Math.min(estimatedDays, Math.max(0, remaining))

  /** Balance remaining if this application is submitted (paid pool only). */
  const balanceAfterThisRequest =
    isUnpaidType || !selectedBalance
      ? null
      : Math.max(0, remaining - paidDaysFromThisRequest)

  async function onSubmit(data: Record<string, unknown>) {
    setIsSubmitting(true)
    try {
      await applyForLeave(data as Parameters<typeof applyForLeave>[0])
      toast({ title: "Leave application submitted" })
      form.reset()
      setAttachmentName("")
      if (fileInputRef.current) fileInputRef.current.value = ""
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeTypes.map((opt) => (
                        <SelectItem key={opt.code} value={opt.code}>
                          {opt.name}
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
                        value={field.value ? String(field.value) : ""}
                        onChange={(e) => field.onChange(e.target.value || undefined)}
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
                        value={field.value ? String(field.value) : ""}
                        onChange={(e) => field.onChange(e.target.value || undefined)}
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
                      placeholder={
                        requiresReplacementDate
                          ? "State which date you are replacing, plus any other context."
                          : "Describe the reason for your leave..."
                      }
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  {requiresReplacementDate && (
                    <FormDescription className="flex items-start gap-1.5 text-amber-700">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      Please state which date you are replacing in your reason.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attachmentUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Supporting Document
                    {requiresAttachment && (
                      <span className="text-destructive ml-0.5">*</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        disabled={uploading || isSubmitting}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploading(true)
                          try {
                            const fd = new FormData()
                            fd.append("file", file)
                            const { url } = await uploadLeaveAttachment(fd)
                            field.onChange(url)
                            setAttachmentName(file.name)
                          } catch (err) {
                            toast({
                              title: "Upload failed",
                              description:
                                err instanceof Error ? err.message : "Could not upload file",
                              variant: "destructive",
                            })
                            if (fileInputRef.current) fileInputRef.current.value = ""
                          } finally {
                            setUploading(false)
                          }
                        }}
                      />
                      {uploading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Uploading...
                        </div>
                      )}
                      {!uploading && field.value && attachmentName && (
                        <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{attachmentName}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              field.onChange(undefined)
                              setAttachmentName("")
                              if (fileInputRef.current) fileInputRef.current.value = ""
                            }}
                            aria-label="Remove attachment"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {requiresAttachment
                      ? "Required for this leave type. Upload an image or PDF (max 5MB)."
                      : "Optional. Upload an image or PDF (max 5MB), e.g. MC."}
                  </FormDescription>
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
                {selectedBalance && !isUnpaidType && (
                  <div className="text-sm space-y-0.5">
                    <p>
                      <span className="font-medium">
                        {estimatedDays > 0
                          ? "Balance after this request:"
                          : "Available balance:"}
                      </span>{" "}
                      {estimatedDays > 0 && balanceAfterThisRequest !== null
                        ? balanceAfterThisRequest
                        : Math.max(0, remaining)}{" "}
                      / {selectedBalance.entitled} days
                    </p>
                    {estimatedDays > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Currently available before this leave:{" "}
                        {Math.max(0, remaining)} day(s)
                      </p>
                    )}
                  </div>
                )}
                {exceedsBalance && unpaidDays > 0 && (
                  <div className="flex items-start gap-2 text-sm text-destructive mt-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      You have {Math.max(0, remaining)} paid leave day(s) remaining.{" "}
                      {unpaidDays} day(s) will be counted as unpaid leave.
                    </span>
                  </div>
                )}
                {isUnpaidType && (
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
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  uploading ||
                  (requiresAttachment && !watchAttachmentUrl)
                }
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

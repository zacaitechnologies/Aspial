"use client"

import { useCallback, useId, useMemo, useRef, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  FileText,
  HelpCircle,
  ImageIcon,
  Info,
  Loader2,
  Paperclip,
  Upload,
  X,
} from "lucide-react"

const ALLOWED_LEAVE_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
])
const MAX_LEAVE_ATTACHMENT_BYTES = 5 * 1024 * 1024

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

  const fileInputId = useId()
  const dragDepthRef = useRef(0)
  const [isDropTargetActive, setIsDropTargetActive] = useState(false)

  const uploadSelectedFile = useCallback(
    async (file: File, onChange: (value: string | undefined) => void) => {
      if (!ALLOWED_LEAVE_ATTACHMENT_TYPES.has(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only JPG, PNG, WEBP, or PDF files are allowed.",
          variant: "destructive",
        })
        return
      }
      if (file.size > MAX_LEAVE_ATTACHMENT_BYTES) {
        toast({
          title: "File too large",
          description: "File must be 5MB or smaller.",
          variant: "destructive",
        })
        return
      }
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append("file", file)
        const { url } = await uploadLeaveAttachment(fd)
        onChange(url)
        setAttachmentName(file.name)
      } catch (err) {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Could not upload file",
          variant: "destructive",
        })
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    [toast]
  )

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
              render={({ field }) => {
                const pickerDisabled = uploading || isSubmitting
                const hasAttachment = Boolean(field.value)
                const displayName = attachmentName.trim() || "Uploaded file"

                return (
                  <FormItem>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <FormLabel htmlFor={fileInputId} className="!mt-0 cursor-pointer">
                          Supporting document
                          {requiresAttachment ? (
                            <span className="text-destructive ml-0.5" aria-hidden>
                              *
                            </span>
                          ) : null}
                        </FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              aria-label="Supporting document file rules"
                            >
                              <HelpCircle className="size-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[260px] text-balance leading-snug">
                            Accepted: JPG, PNG, WebP, or PDF. Maximum size 5MB. You can click
                            the upload area or drop a file onto it.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {requiresAttachment ? (
                        <Badge
                          variant="secondary"
                          className="shrink-0 border border-border/60 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          Required
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          Optional
                        </Badge>
                      )}
                    </div>

                    <FormControl>
                      <div className="space-y-3">
                        <input
                          ref={fileInputRef}
                          id={fileInputId}
                          type="file"
                          accept={Array.from(ALLOWED_LEAVE_ATTACHMENT_TYPES).join(",")}
                          className="sr-only"
                          disabled={pickerDisabled}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            void uploadSelectedFile(file, field.onChange)
                          }}
                        />

                        {!hasAttachment && !uploading ? (
                          <label
                            htmlFor={fileInputId}
                            className={cn(
                              "group relative flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all duration-200",
                              "border-border bg-muted/15 shadow-sm",
                              "hover:border-primary/50 hover:bg-muted/35 hover:shadow-md",
                              "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25",
                              isDropTargetActive &&
                                "scale-[1.01] border-primary bg-primary/5 shadow-md ring-2 ring-primary/20",
                              requiresAttachment &&
                                !field.value &&
                                "border-destructive/35 hover:border-destructive/55",
                              pickerDisabled && "pointer-events-none opacity-50"
                            )}
                            onDragEnter={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              dragDepthRef.current += 1
                              setIsDropTargetActive(true)
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              dragDepthRef.current -= 1
                              if (dragDepthRef.current <= 0) {
                                dragDepthRef.current = 0
                                setIsDropTargetActive(false)
                              }
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              dragDepthRef.current = 0
                              setIsDropTargetActive(false)
                              if (pickerDisabled) return
                              const file = e.dataTransfer.files?.[0]
                              if (file) void uploadSelectedFile(file, field.onChange)
                            }}
                          >
                            <span
                              className={cn(
                                "flex size-12 items-center justify-center rounded-full border bg-background transition-transform duration-200",
                                "border-border text-muted-foreground",
                                "group-hover:scale-105 group-hover:border-primary/40 group-hover:text-primary",
                                isDropTargetActive && "scale-105 border-primary text-primary"
                              )}
                              aria-hidden
                            >
                              <Upload className="size-5" />
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              Drop a file here, or{" "}
                              <span className="text-primary underline decoration-primary/30 underline-offset-2 transition-colors group-hover:decoration-primary">
                                browse
                              </span>
                            </span>
                            <span className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 font-medium text-foreground/80 transition-colors group-hover:bg-muted">
                                <ImageIcon className="size-3.5 shrink-0" aria-hidden />
                                Images
                              </span>
                              <span className="text-muted-foreground/70">·</span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 font-medium text-foreground/80 transition-colors group-hover:bg-muted">
                                <FileText className="size-3.5 shrink-0" aria-hidden />
                                PDF
                              </span>
                              <span className="text-muted-foreground/70">·</span>
                              <span>5MB max</span>
                            </span>
                          </label>
                        ) : null}

                        {uploading ? (
                          <div
                            className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6"
                            aria-live="polite"
                            aria-busy="true"
                          >
                            <Loader2 className="size-8 animate-spin text-primary" />
                            <p className="text-sm font-medium text-foreground">Uploading…</p>
                            <p className="text-xs text-muted-foreground">Please keep this dialog open</p>
                          </div>
                        ) : null}

                        {hasAttachment && !uploading ? (
                          <div className="space-y-2">
                            <div
                              className={cn(
                                "group/attachment relative overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition-all duration-200",
                                "border-border hover:border-primary/35 hover:bg-accent/25 hover:shadow-md",
                                "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    "flex size-11 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200",
                                    "border-border bg-muted/40 text-muted-foreground",
                                    "group-hover/attachment:border-primary/30 group-hover/attachment:bg-primary/5 group-hover/attachment:text-primary"
                                  )}
                                  aria-hidden
                                >
                                  {displayName.toLowerCase().endsWith(".pdf") ? (
                                    <FileText className="size-5" />
                                  ) : (
                                    <ImageIcon className="size-5" />
                                  )}
                                </span>
                                <div className="min-w-0 flex-1 text-left">
                                  <p className="truncate text-sm font-medium text-foreground" title={displayName}>
                                    {displayName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Supporting document attached</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 gap-1.5 px-2.5 text-xs font-medium shadow-none transition-colors hover:bg-secondary/80"
                                    onClick={() => fileInputRef.current?.click()}
                                  >
                                    <Paperclip className="size-3.5" />
                                    Replace
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => {
                                      field.onChange(undefined)
                                      setAttachmentName("")
                                      if (fileInputRef.current) fileInputRef.current.value = ""
                                    }}
                                    aria-label="Remove attachment"
                                  >
                                    <X className="size-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="mt-2 text-[11px] text-muted-foreground sm:hidden">
                                Use Replace to pick another file, or the strip below to drag and drop.
                              </p>
                            </div>
                            <label
                              htmlFor={fileInputId}
                              className={cn(
                                "group/replace flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-3 text-center transition-all duration-200",
                                "border-border bg-muted/10 shadow-sm",
                                "hover:border-primary/45 hover:bg-muted/40 hover:shadow-md",
                                isDropTargetActive &&
                                  "border-primary bg-primary/8 text-foreground ring-2 ring-primary/25",
                                pickerDisabled && "pointer-events-none opacity-50"
                              )}
                              onDragEnter={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                dragDepthRef.current += 1
                                setIsDropTargetActive(true)
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                dragDepthRef.current -= 1
                                if (dragDepthRef.current <= 0) {
                                  dragDepthRef.current = 0
                                  setIsDropTargetActive(false)
                                }
                              }}
                              onDragOver={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                dragDepthRef.current = 0
                                setIsDropTargetActive(false)
                                if (pickerDisabled) return
                                const file = e.dataTransfer.files?.[0]
                                if (file) void uploadSelectedFile(file, field.onChange)
                              }}
                            >
                              <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/90 transition-colors group-hover/replace:text-primary">
                                <Upload className="size-3.5 shrink-0" aria-hidden />
                                {isDropTargetActive
                                  ? "Release to replace attachment"
                                  : "Replace file — click to browse or drop here"}
                              </span>
                              <span className="text-[11px] text-muted-foreground transition-colors group-hover/replace:text-muted-foreground">
                                JPG, PNG, WebP, or PDF · max 5MB
                              </span>
                            </label>
                          </div>
                        ) : null}
                      </div>
                    </FormControl>

                    <FormDescription>
                      {requiresAttachment
                        ? "This leave type requires a supporting document (e.g. medical certificate)."
                        : "Optional — attach an image or PDF if it helps your approver."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )
              }}
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

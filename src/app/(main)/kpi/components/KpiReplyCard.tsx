"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { submitKpiReply } from "../actions"
import { KPI_REPLY_LABELS, type KpiReplyChoice } from "../config"
import type { KpiReportDTO } from "../types"

const CHOICES: { value: KpiReplyChoice; label: string }[] = [
  { value: "too_low", label: "Too low" },
  { value: "fair", label: "Fair" },
  { value: "too_high", label: "Too high" },
]

export function KpiReplyCard({
  report,
  onReplied,
}: {
  report: KpiReportDTO
  onReplied?: (updated: KpiReportDTO) => void
}) {
  const { toast } = useToast()
  const [choice, setChoice] = useState<KpiReplyChoice | null>(null)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (report.replyChoice) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 text-sm">
        <p className="flex items-center gap-2 font-medium text-green-800">
          <CheckCircle2 className="size-4" /> Your reply: {KPI_REPLY_LABELS[report.replyChoice]}
        </p>
        {report.replyComment && <p className="mt-1 text-muted-foreground">“{report.replyComment}”</p>}
      </div>
    )
  }

  async function handleSubmit() {
    if (!choice) {
      toast({ title: "Pick an option", description: "Let your manager know how you feel about the marks." })
      return
    }
    setSubmitting(true)
    try {
      await submitKpiReply({ reportId: report.id, choice, comment })
      toast({ title: "Reply sent", description: "Thanks for responding to your KPI report." })
      onReplied?.({ ...report, replyChoice: choice, replyComment: comment, repliedAt: new Date().toISOString() })
    } catch (e) {
      toast({ title: "Could not send reply", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquare className="size-4" /> A reply is required — how do you feel about these marks?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CHOICES.map((c) => (
          <Button
            key={c.value}
            type="button"
            size="sm"
            variant={choice === c.value ? "default" : "outline"}
            onClick={() => setChoice(c.value)}
            className={cn(choice === c.value && c.value === "too_low" && "bg-red-600 hover:bg-red-600/90")}
          >
            {c.label}
          </Button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)…"
        className="mt-2 min-h-[60px] text-sm"
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </div>
  )
}

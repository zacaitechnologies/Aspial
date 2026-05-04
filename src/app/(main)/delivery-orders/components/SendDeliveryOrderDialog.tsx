"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { sendDeliveryOrderEmail } from "../action"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliveryOrderId: string
  defaultEmail?: string | null
  onSent?: () => void
}

export default function SendDeliveryOrderDialog({
  open,
  onOpenChange,
  deliveryOrderId,
  defaultEmail,
  onSent,
}: Props) {
  const [email, setEmail] = useState(defaultEmail ?? "")
  const [submitting, setSubmitting] = useState(false)

  const handleSend = async () => {
    if (!email.trim()) {
      toast({ variant: "destructive", title: "Email required" })
      return
    }
    setSubmitting(true)
    try {
      const result = await sendDeliveryOrderEmail(deliveryOrderId, email.trim())
      if (result.success) {
        toast({ title: "Email sent", description: `Delivery order sent to ${email}` })
        onSent?.()
        onOpenChange(false)
      } else {
        toast({ variant: "destructive", title: "Send failed", description: result.error })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Delivery Order</DialogTitle>
          <DialogDescription>
            The PDF will be attached and the recipient address recorded.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="do-email">Recipient email</Label>
          <Input
            id="do-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={submitting}>
            {submitting ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

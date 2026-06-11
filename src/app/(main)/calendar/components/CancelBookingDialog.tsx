"use client"

import { useState } from "react"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CancelBookingDialogProps {
	isOpen: boolean
	onClose: () => void
	bookingTitle: string
	onConfirm: (reason: string) => Promise<void> | void
}

/** Confirmation dialog requiring a cancellation reason before a booking is cancelled. */
export function CancelBookingDialog({
	isOpen,
	onClose,
	bookingTitle,
	onConfirm,
}: CancelBookingDialogProps) {
	const [reason, setReason] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const trimmedReason = reason.trim()

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setReason("")
			onClose()
		}
	}

	const handleConfirm = async () => {
		if (!trimmedReason || isSubmitting) return
		setIsSubmitting(true)
		try {
			await onConfirm(trimmedReason)
			setReason("")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			{/* Launched from BookingDetailsDialog (z-[60]) — must stack above it */}
			<DialogContent nested className="z-[80] sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Cancel Booking</DialogTitle>
					<DialogDescription>
						You are cancelling {bookingTitle ? `“${bookingTitle}”` : "this booking"}. The
						booking will remain visible on the calendar in grey. A reason is required.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="cancel-booking-reason">
						Cancellation reason <span className="text-destructive">*</span>
					</Label>
					<Textarea
						id="cancel-booking-reason"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="e.g. Client requested to reschedule"
						rows={3}
						maxLength={500}
					/>
				</div>
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
						Keep Booking
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={!trimmedReason || isSubmitting}
					>
						{isSubmitting ? "Cancelling…" : "Cancel Booking"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

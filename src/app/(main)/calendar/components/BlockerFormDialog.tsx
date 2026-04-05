"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { createCalendarBlocker, updateCalendarBlocker } from "../actions"

interface BlockerData {
	id: number
	title: string
	description: string | null
	startDateTime: string
	endDateTime: string
	blocksAppointments: boolean
}

interface BlockerFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	blocker?: BlockerData | null
	onSuccess: () => void
}

function toLocalDateTimeString(isoOrDate: string): string {
	const d = new Date(isoOrDate)
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	const hours = String(d.getHours()).padStart(2, "0")
	const minutes = String(d.getMinutes()).padStart(2, "0")
	return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function BlockerFormDialog({ open, onOpenChange, blocker, onSuccess }: BlockerFormDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [blocksAppointments, setBlocksAppointments] = useState(blocker?.blocksAppointments ?? false)
	const [error, setError] = useState<string | null>(null)

	const isEditing = !!blocker

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		if (isSubmitting) return
		setIsSubmitting(true)
		setError(null)

		const form = e.currentTarget
		const formData = new FormData(form)
		formData.set("blocksAppointments", blocksAppointments ? "true" : "false")

		try {
			const result = isEditing
				? await updateCalendarBlocker(blocker!.id, formData)
				: await createCalendarBlocker(formData)

			if (result.success) {
				onSuccess()
				onOpenChange(false)
			} else {
				setError(result.error || "Something went wrong")
			}
		} catch {
			setError("An unexpected error occurred")
		} finally {
			setIsSubmitting(false)
		}
	}

	const defaultStart = blocker ? toLocalDateTimeString(blocker.startDateTime) : ""
	const defaultEnd = blocker ? toLocalDateTimeString(blocker.endDateTime) : ""

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Edit Blocker" : "Add Calendar Blocker"}</DialogTitle>
					<DialogDescription>
						{isEditing
							? "Update this blocker event."
							: "Create a blocker event for holidays, special events, or occasions."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="blocker-title">Title *</Label>
						<Input
							id="blocker-title"
							name="title"
							placeholder="e.g., Company Holiday, Office Event"
							defaultValue={blocker?.title || ""}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="blocker-description">Description</Label>
						<Textarea
							id="blocker-description"
							name="description"
							placeholder="Optional details about this event"
							defaultValue={blocker?.description || ""}
							rows={3}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="blocker-start">Start Date & Time *</Label>
							<Input
								id="blocker-start"
								name="startDateTime"
								type="datetime-local"
								defaultValue={defaultStart}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="blocker-end">End Date & Time *</Label>
							<Input
								id="blocker-end"
								name="endDateTime"
								type="datetime-local"
								defaultValue={defaultEnd}
								required
							/>
						</div>
					</div>

					<div className="flex items-center gap-3 rounded-md border p-3">
						<Checkbox
							id="blocker-blocks-appointments"
							checked={blocksAppointments}
							onCheckedChange={(checked) => setBlocksAppointments(checked === true)}
						/>
						<div className="space-y-0.5">
							<Label htmlFor="blocker-blocks-appointments" className="cursor-pointer font-medium">
								Block appointment bookings
							</Label>
							<p className="text-xs text-muted-foreground">
								When enabled, appointment time slots during this event will be unavailable for booking.
							</p>
						</div>
					</div>

					{error && (
						<p className="text-sm text-destructive">{error}</p>
					)}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{isEditing ? "Update Blocker" : "Create Blocker"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

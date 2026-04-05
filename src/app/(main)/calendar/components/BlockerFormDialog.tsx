"use client"

import { useState, useEffect } from "react"
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
	allDay?: boolean
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

function toDateInputValue(iso: string): string {
	const d = new Date(iso)
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

/** Matches server logic for full calendar days (local midnight → 23:59). */
function detectAllDayFromIso(startIso: string, endIso: string): boolean {
	const s = new Date(startIso)
	const e = new Date(endIso)
	return (
		s.getHours() === 0 &&
		s.getMinutes() === 0 &&
		s.getSeconds() === 0 &&
		e.getHours() === 23 &&
		e.getMinutes() === 59
	)
}

function localDateTimeToDatetimeLocalValue(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	const h = String(d.getHours()).padStart(2, "0")
	const min = String(d.getMinutes()).padStart(2, "0")
	return `${y}-${m}-${day}T${h}:${min}`
}

export function BlockerFormDialog({ open, onOpenChange, blocker, onSuccess }: BlockerFormDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [blocksAppointments, setBlocksAppointments] = useState(blocker?.blocksAppointments ?? false)
	const [allDay, setAllDay] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const isEditing = !!blocker

	useEffect(() => {
		if (!open) return
		if (blocker) {
			setBlocksAppointments(blocker.blocksAppointments)
			setAllDay(blocker.allDay ?? detectAllDayFromIso(blocker.startDateTime, blocker.endDateTime))
		} else {
			setBlocksAppointments(false)
			setAllDay(false)
		}
		setError(null)
	}, [open, blocker])

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		if (isSubmitting) return
		setIsSubmitting(true)
		setError(null)

		const form = e.currentTarget
		const formData = new FormData(form)
		formData.set("blocksAppointments", blocksAppointments ? "true" : "false")

		if (allDay) {
			const sd = formData.get("startDate") as string | null
			const ed = formData.get("endDate") as string | null
			if (!sd || !ed) {
				setError("Start and end dates are required for an all-day blocker")
				setIsSubmitting(false)
				return
			}
			const [y1, m1, d1] = sd.split("-").map((x) => parseInt(x, 10))
			const [y2, m2, d2] = ed.split("-").map((x) => parseInt(x, 10))
			if ([y1, m1, d1, y2, m2, d2].some((n) => Number.isNaN(n))) {
				setError("Invalid dates")
				setIsSubmitting(false)
				return
			}
			const start = new Date(y1, m1 - 1, d1, 0, 0, 0, 0)
			const end = new Date(y2, m2 - 1, d2, 23, 59, 59, 999)
			if (end < start) {
				setError("End date must be on or after start date")
				setIsSubmitting(false)
				return
			}
			formData.delete("startDate")
			formData.delete("endDate")
			formData.delete("startDateTime")
			formData.delete("endDateTime")
			formData.set("startDateTime", localDateTimeToDatetimeLocalValue(start))
			formData.set("endDateTime", localDateTimeToDatetimeLocalValue(end))
		}

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
	const defaultStartDate = blocker ? toDateInputValue(blocker.startDateTime) : ""
	const defaultEndDate = blocker ? toDateInputValue(blocker.endDateTime) : ""

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

					<div className="flex items-center gap-3 rounded-md border border-border p-3">
						<Checkbox
							id="blocker-all-day"
							checked={allDay}
							onCheckedChange={(checked) => setAllDay(checked === true)}
						/>
						<div className="space-y-0.5">
							<Label htmlFor="blocker-all-day" className="cursor-pointer font-medium">
								All day
							</Label>
							<p className="text-xs text-muted-foreground">
								Spans full local calendar days (midnight through end of day). Use for holidays or
								closures.
							</p>
						</div>
					</div>

					{allDay ? (
						<div key="all-day-fields" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="blocker-start-date">Start date *</Label>
								<Input
									id="blocker-start-date"
									name="startDate"
									type="date"
									defaultValue={defaultStartDate}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="blocker-end-date">End date *</Label>
								<Input
									id="blocker-end-date"
									name="endDate"
									type="date"
									defaultValue={defaultEndDate}
									required
								/>
							</div>
						</div>
					) : (
						<div key="timed-fields" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="blocker-start">Start date & time *</Label>
								<Input
									id="blocker-start"
									name="startDateTime"
									type="datetime-local"
									defaultValue={defaultStart}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="blocker-end">End date & time *</Label>
								<Input
									id="blocker-end"
									name="endDateTime"
									type="datetime-local"
									defaultValue={defaultEnd}
									required
								/>
							</div>
						</div>
					)}

					<div className="flex items-center gap-3 rounded-md border border-border p-3">
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

					{error && <p className="text-sm text-destructive">{error}</p>}

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

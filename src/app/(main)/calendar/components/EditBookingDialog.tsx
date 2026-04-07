"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import {
	Calendar,
	CalendarIcon,
	Loader2,
	AlertTriangle,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import {
	getAppointmentBookingDetails,
	updateAppointmentBooking,
	getActiveBlockers,
} from "@/app/(main)/calendar/actions"
import { getAppointmentBookings } from "@/app/(main)/appointment-bookings/actions"
import type { CalendarBooking } from "../actions"

interface EditBookingDialogProps {
	isOpen: boolean
	onClose: () => void
	booking: CalendarBooking | null
	userName: string
	isAdmin: boolean
	onSuccess: () => void
}

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
	const hour = i + 8
	return `${String(hour).padStart(2, "0")}:00`
})

/** Expand a booking's [start, end) into hourly slot keys "HH:00". */
function expandBookingToHourSlots(start: Date, end: Date): string[] {
	const slots: string[] = []
	const cur = new Date(start.getTime())
	while (cur < end) {
		slots.push(`${String(cur.getHours()).padStart(2, "0")}:00`)
		cur.setHours(cur.getHours() + 1)
	}
	return slots
}

/** From sorted hour numbers, verify consecutive; return start "HH:00" and end next hour "HH:00:00" string parts. */
function contiguousRangeFromSlots(slots: string[]): { startSlot: string; endTime: string } | null {
	if (slots.length === 0) return null
	const sorted = [...slots].sort((a, b) => a.localeCompare(b))
	const hours = sorted.map((s) => parseInt(s.split(":")[0], 10))
	for (let i = 1; i < hours.length; i++) {
		if (hours[i] !== hours[i - 1] + 1) return null
	}
	const lastHour = hours[hours.length - 1]
	const endHour = lastHour + 1
	return {
		startSlot: sorted[0],
		endTime: `${String(endHour).padStart(2, "0")}:00:00`,
	}
}

export function EditBookingDialog({
	isOpen,
	onClose,
	booking,
	userName,
	isAdmin,
	onSuccess,
}: EditBookingDialogProps) {
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const errorRef = useRef<HTMLDivElement>(null)

	// Form state
	const [selectedDate, setSelectedDate] = useState<Date | undefined>()
	const [selectedSlots, setSelectedSlots] = useState<string[]>([])
	const [purpose, setPurpose] = useState("")
	const [attendees, setAttendees] = useState("")
	const [bookingName, setBookingName] = useState("")
	const [companyName, setCompanyName] = useState("")
	const [contactNumber, setContactNumber] = useState("")
	const [remarks, setRemarks] = useState("")
	const [calendarOpen, setCalendarOpen] = useState(false)

	// Availability state
	const [existingBookings, setExistingBookings] = useState<{ id: number; startDate: Date; endDate: Date; bookedBy: string }[]>([])
	const [blockers, setBlockers] = useState<{ id: number; title: string; startDateTime: Date; endDateTime: Date }[]>([])

	// Booking details for permission check
	const [bookingId, setBookingId] = useState<number | null>(null)
	const [appointmentId, setAppointmentId] = useState<number | null>(null)
	const [appointmentName, setAppointmentName] = useState("")

	// Load booking details
	useEffect(() => {
		if (!isOpen || !booking) return

		const loadDetails = async () => {
			setIsLoading(true)
			setError(null)

			// Extract booking ID from CalendarBooking id (format: "appointment-123")
			const idMatch = booking.id.match(/appointment-(\d+)/)
			if (!idMatch) {
				setError("Invalid booking reference")
				setIsLoading(false)
				return
			}
			const numericId = parseInt(idMatch[1])
			setBookingId(numericId)

			const details = await getAppointmentBookingDetails(numericId)
			if (!details) {
				setError("Could not load booking details")
				setIsLoading(false)
				return
			}

			const start = new Date(details.startDate)
			const end = new Date(details.endDate)

			setSelectedDate(start)
			setSelectedSlots(expandBookingToHourSlots(start, end))
			setPurpose(details.purpose || "")
			setAttendees(details.attendees ? String(details.attendees) : "")
			setBookingName(details.bookingName || "")
			setCompanyName(details.companyName || "")
			setContactNumber(details.contactNumber || "")
			setRemarks(details.remarks || "")
			setAppointmentId(details.appointmentId)
			setAppointmentName(details.appointment?.name || "Appointment")

			setIsLoading(false)
		}
		loadDetails()
	}, [isOpen, booking])

	// Fetch availability when date or appointment changes
	useEffect(() => {
		if (!selectedDate || !appointmentId) return

		const fetchAvailability = async () => {
			const dayStart = new Date(selectedDate)
			dayStart.setHours(0, 0, 0, 0)
			const dayEnd = new Date(selectedDate)
			dayEnd.setHours(23, 59, 59, 999)

			const [bookingsResult, blockersResult] = await Promise.all([
				getAppointmentBookings(appointmentId, dayStart, dayEnd),
				getActiveBlockers(dayStart, dayEnd),
			])

			// Exclude the current booking from overlap display
			setExistingBookings(
				bookingsResult
					.filter((b) => b.id !== bookingId)
					.map((b) => ({
						id: b.id,
						startDate: new Date(b.startDate),
						endDate: new Date(b.endDate),
						bookedBy: b.bookedBy,
					}))
			)
			setBlockers(
				blockersResult.map((b) => ({
					id: b.id,
					title: b.title,
					startDateTime: new Date(b.startDateTime),
					endDateTime: new Date(b.endDateTime),
				}))
			)
		}
		fetchAvailability()
	}, [selectedDate, appointmentId, bookingId])

	useEffect(() => {
		if (error && errorRef.current) {
			errorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
		}
	}, [error])

	const getSlotStatus = (hour: number) => {
		if (!selectedDate) return { status: "available" as const, label: "Available" }
		const dateStr = format(selectedDate, "yyyy-MM-dd")
		const slotStart = new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00`)
		const slotEnd = new Date(`${dateStr}T${String(hour + 1).padStart(2, "0")}:00:00`)

		for (const blocker of blockers) {
			if (slotStart < blocker.endDateTime && slotEnd > blocker.startDateTime) {
				return { status: "blocked" as const, label: blocker.title }
			}
		}
		for (const b of existingBookings) {
			if (slotStart < b.endDate && slotEnd > b.startDate) {
				return { status: "booked" as const, label: `Booked by ${b.bookedBy}` }
			}
		}
		const now = new Date()
		if (slotStart < now) {
			return { status: "past" as const, label: "Past" }
		}
		return { status: "available" as const, label: "Available" }
	}

	const handleSubmit = async () => {
		setError(null)

		if (!selectedDate) {
			setError("Please select a date")
			return
		}
		if (selectedSlots.length === 0) {
			setError("Please select at least one time slot")
			return
		}
		if (!bookingId) {
			setError("Invalid booking")
			return
		}

		const range = contiguousRangeFromSlots(selectedSlots)
		if (!range) {
			setError("Selected times must be consecutive hours (no gaps). Adjust your selection.")
			return
		}

		for (const slot of selectedSlots) {
			const slotHour = parseInt(slot.split(":")[0], 10)
			const info = getSlotStatus(slotHour)
			if (info.status !== "available") {
				setError(`The slot ${slot} is no longer available (${info.status})`)
				return
			}
		}

		setIsSubmitting(true)

		const dateStr = format(selectedDate, "yyyy-MM-dd")
		const formData = new FormData()
		formData.set("startDate", `${dateStr}T${range.startSlot}:00`)
		formData.set("endDate", `${dateStr}T${range.endTime}`)
		formData.set("purpose", purpose)
		if (attendees) formData.set("attendees", attendees)
		formData.set("remarks", remarks)
		formData.set("bookingName", bookingName)
		formData.set("companyName", companyName)
		formData.set("contactNumber", contactNumber)

		try {
			const result = await updateAppointmentBooking(bookingId, formData, userName)
			if (result.success) {
				toast({ title: "Booking Updated", description: "The appointment has been updated successfully." })
				onSuccess()
				onClose()
			} else {
				setError(result.error || "Failed to update booking")
			}
		} catch {
			setError("An unexpected error occurred")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Calendar className="w-5 h-5" />
						Edit Booking — {appointmentName}
					</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="space-y-4">
						{error && (
							<div ref={errorRef} className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
								{error}
							</div>
						)}

						{/* Date Picker */}
						<div>
							<Label>Date <span className="text-destructive">*</span></Label>
							<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											"w-full justify-start text-left font-normal",
											!selectedDate && "text-muted-foreground"
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<CalendarPicker
										mode="single"
										selected={selectedDate}
										onSelect={(d) => {
											setSelectedDate(d)
											setCalendarOpen(false)
										}}
									/>
								</PopoverContent>
							</Popover>
						</div>

						{/* Availability indicator */}
						{blockers.length > 0 && (
							<div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
								<div className="flex items-start gap-2">
									<AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
									<div className="text-sm">
										<p className="font-medium text-amber-800 dark:text-amber-200">
											Booking restrictions active
										</p>
										{blockers.map((b) => (
											<p key={b.id} className="text-amber-700 dark:text-amber-300 mt-1">
												{b.title}: {b.startDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {b.endDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
											</p>
										))}
									</div>
								</div>
							</div>
						)}

						{/* Clickable time slot selection (multi-select, toggle to unselect) */}
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-2">
								Select time slot(s) <span className="text-destructive">*</span>
							</p>
							<p className="text-xs text-muted-foreground mb-2">
								Tap slots to add or remove. Hours must be consecutive when you save (e.g. 10:00, 11:00, 12:00).
							</p>
							<div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
								{TIME_SLOTS.map((slot) => {
									const hour = parseInt(slot)
									const info = getSlotStatus(hour)
									const isDisabled = info.status !== "available"
									const isSelected = selectedSlots.includes(slot)

									return (
										<button
											type="button"
											key={slot}
											className={`text-center p-2 rounded-md border text-sm ${
												isDisabled
													? info.status === "blocked"
														? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 cursor-not-allowed"
														: info.status === "booked"
															? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 cursor-not-allowed"
															: "bg-muted text-muted-foreground cursor-not-allowed"
													: isSelected
														? "bg-primary border-primary text-primary-foreground"
														: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:border-primary/70"
											}`}
											title={info.label}
											disabled={isDisabled}
											onClick={() =>
												setSelectedSlots((prev) =>
													prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
												)
											}
										>
											{slot}
											<div className="text-[10px] mt-0.5 truncate">
												{info.status === "available" && (isSelected ? "Selected" : "Available")}
												{info.status === "booked" && "Booked"}
												{info.status === "blocked" && "Blocked"}
												{info.status === "past" && "Past"}
											</div>
										</button>
									)
								})}
							</div>
						</div>

						{selectedSlots.length > 0 && (
							<div className="rounded-md border border-border bg-muted/30 p-3">
								<p className="text-sm font-medium mb-2">
									Selected ({selectedSlots.length} hour{selectedSlots.length === 1 ? "" : "s"})
								</p>
								<div className="flex flex-wrap gap-2">
									{[...selectedSlots]
										.sort((a, b) => a.localeCompare(b))
										.map((slot) => {
											const h = parseInt(slot.split(":")[0], 10)
											return (
												<Badge key={slot} variant="secondary">
													{slot} - {String(h + 1).padStart(2, "0")}:00
												</Badge>
											)
										})}
								</div>
							</div>
						)}

						{/* Detail fields */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<Label>Booking Name</Label>
								<Input value={bookingName} onChange={(e) => setBookingName(e.target.value)} placeholder="Contact name" />
							</div>
							<div>
								<Label>Company Name</Label>
								<Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company" />
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<Label>Contact Number</Label>
								<Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Phone" />
							</div>
							<div>
								<Label>Attendees</Label>
								<Input type="number" min="1" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Number" />
							</div>
						</div>
						<div>
							<Label>Purpose</Label>
							<Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose of the booking" rows={2} />
						</div>
						<div>
							<Label>Remarks</Label>
							<Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Additional notes" rows={2} />
						</div>

						{/* Submit */}
						<div className="flex justify-end gap-2 pt-4 border-t">
							<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
								Cancel
							</Button>
							<Button onClick={handleSubmit} disabled={isSubmitting || selectedSlots.length === 0}>
								{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
								Save Changes
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}

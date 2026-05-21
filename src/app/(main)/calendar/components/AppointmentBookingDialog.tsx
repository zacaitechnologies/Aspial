"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { subMinutes, format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
	ArrowLeft,
	ArrowRight,
	Calendar,
	CheckCircle,
	Clock,
	Loader2,
	MapPin,
	AlertTriangle,
	Search,
	XCircle,
	ChevronDown,
	Check,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getActiveBlockers } from "@/app/(main)/calendar/actions"
import {
	groupConsecutiveHourSlots,
	hourSlotRangeToFormDateTimes,
} from "@/app/(main)/calendar/utils/calendar-utils"
import {
	createAppointmentBooking,
	getBookingFormProjects,
	getAppointmentBookings,
	getProjectUsersEmails,
} from "@/app/(main)/appointment-bookings/actions"
import { parseDateInBusinessTZ, toBusinessTZParts } from "@/lib/date-utils"
import {
	formatProjectClientLabel,
	formatProjectOptionLabel,
	SYSTEM_CLIENT_DISPLAY_LABEL,
} from "@/lib/no-project"
import { EmailListInput } from "@/app/(main)/appointment-bookings/components/EmailListInput"
import { FieldOverwriteDialog } from "@/app/(main)/appointment-bookings/components/FieldOverwriteDialog"
import { APPOINTMENT_TYPES, type AppointmentType } from "../constants"
import type { ProjectWithClient } from "@/app/(main)/appointment-bookings/types"

interface AvailableAppointment {
	id: number
	name: string
	location: string | null
	brand: string | null
	description: string | null
	appointmentType: string
}

interface AppointmentBookingDialogProps {
	isOpen: boolean
	onClose: () => void
	initialDate: string // YYYY-MM-DD
	initialTime?: string | null // HH:MM
	appointments: AvailableAppointment[]
	userId: string
	userName: string
	onSuccess: () => void
}

interface BookingSlot {
	id: number
	startDate: Date
	endDate: Date
	bookedBy: string
}

interface BlockerSlot {
	id: number
	title: string
	startDateTime: Date
	endDateTime: Date
}

type DialogStep = "select-appointment" | "select-time" | "booking-form"

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
	const hour = i + 8 // 8AM to 10PM
	return `${String(hour).padStart(2, "0")}:00`
})

const REMINDER_HOURS = [1, 2, 6, 12, 24, 48]

function reminderOffsetToMinutes(hours: number): number {
	return hours === 48 ? 2880 : hours * 60
}

function reminderLabel(hours: number): string {
	if (hours === 48) return "2 days"
	if (hours === 1) return "1h"
	return `${hours}h`
}

function getSlotStatus(
	hour: number,
	bookings: BookingSlot[],
	blockers: BlockerSlot[],
	selectedDate: string
) {
	if (!selectedDate) return { status: "past" as const, label: "Unavailable" }
	const dayStart = parseDateInBusinessTZ(`${selectedDate}T${String(hour).padStart(2, "0")}:00:00`)
	const dayEnd = parseDateInBusinessTZ(`${selectedDate}T${String(hour + 1).padStart(2, "0")}:00:00`)

	for (const blocker of blockers) {
		if (dayStart < blocker.endDateTime && dayEnd > blocker.startDateTime) {
			return { status: "blocked" as const, label: blocker.title }
		}
	}

	const now = new Date()
	if (dayStart < now) {
		return { status: "past" as const, label: "Past" }
	}

	const overlapping = bookings.filter(
		(b) => dayStart < b.endDate && dayEnd > b.startDate
	)
	if (overlapping.length > 0) {
		const names = overlapping.map((b) => b.bookedBy)
		const preview = names.slice(0, 2).join(", ")
		const suffix = names.length > 2 ? `, +${names.length - 2}` : ""
		return {
			status: "available" as const,
			label: `Also booked by ${preview}${suffix}`,
			alsoBookedCount: overlapping.length,
		}
	}

	return { status: "available" as const, label: "Available" }
}

export function AppointmentBookingDialog({
	isOpen,
	onClose,
	initialDate,
	initialTime,
	appointments,
	userId,
	userName,
	onSuccess,
}: AppointmentBookingDialogProps) {
	const { toast } = useToast()
	const [step, setStep] = useState<DialogStep>("select-appointment")
	const [selectedAppointment, setSelectedAppointment] = useState<AvailableAppointment | null>(null)
	const [appointmentSearch, setAppointmentSearch] = useState("")

	// Time selection state
	const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([])
	const [existingBookings, setExistingBookings] = useState<BookingSlot[]>([])
	const [blockers, setBlockers] = useState<BlockerSlot[]>([])
	const [isLoadingSlots, setIsLoadingSlots] = useState(false)

	// Form state
	const [purpose, setPurpose] = useState("")
	const [attendees, setAttendees] = useState("")
	const [projects, setProjects] = useState<ProjectWithClient[]>([])
	const [selectedProject, setSelectedProject] = useState("none")
	const [projectSearch, setProjectSearch] = useState("")
	const [projectPopoverOpen, setProjectPopoverOpen] = useState(false)
	const [isLoadingProjects, setIsLoadingProjects] = useState(true)
	const [bookingName, setBookingName] = useState("")
	const [companyName, setCompanyName] = useState("")
	const [contactNumber, setContactNumber] = useState("")
	const [remarks, setRemarks] = useState("")
	const [clientEmails, setClientEmails] = useState<string[]>([""])
	const [reminders, setReminders] = useState<Array<{ offsetMinutes: number; recipientEmails: string[] }>>([
		{ offsetMinutes: 1440, recipientEmails: [""] },
	])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const errorRef = useRef<HTMLDivElement>(null)

	// Email result dialog
	const [showResultDialog, setShowResultDialog] = useState(false)
	const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null)

	// Overwrite dialog
	const [showOverwriteDialog, setShowOverwriteDialog] = useState(false)
	const [pendingProjectSelection, setPendingProjectSelection] = useState<string | null>(null)

	// Reset state when dialog opens/closes
	useEffect(() => {
		if (isOpen) {
			setStep("select-appointment")
			setSelectedAppointment(null)
			setAppointmentSearch("")
			setSelectedTimeSlots(initialTime ? [initialTime] : [])
			setPurpose("")
			setAttendees("")
			setSelectedProject("none")
			setProjectSearch("")
			setProjectPopoverOpen(false)
			setBookingName("")
			setCompanyName("")
			setContactNumber("")
			setRemarks("")
			setClientEmails([""])
			setReminders([{ offsetMinutes: 1440, recipientEmails: [""] }])
			setError(null)
			setExistingBookings([])
			setBlockers([])
		}
	}, [isOpen, initialTime])

	// Fetch projects (admin: all; non-admin: involved only — enforced server-side)
	useEffect(() => {
		if (!isOpen) return
		const fetchProjects = async () => {
			setIsLoadingProjects(true)
			const bookingProjects = await getBookingFormProjects()
			setProjects(bookingProjects)
			setIsLoadingProjects(false)
		}
		void fetchProjects()
	}, [isOpen])

	// Fetch availability when appointment is selected
	useEffect(() => {
		if (step !== "select-time" || !selectedAppointment || !initialDate || !initialDate.includes("-")) return

		const fetchAvailability = async () => {
			setIsLoadingSlots(true)
			const dayStart = parseDateInBusinessTZ(`${initialDate}T00:00:00`)
			const dayEnd = parseDateInBusinessTZ(`${initialDate}T23:59:59`)

			const [bookingsResult, blockersResult] = await Promise.all([
				getAppointmentBookings(selectedAppointment.id, dayStart, dayEnd),
				getActiveBlockers(dayStart, dayEnd),
			])

			setExistingBookings(
				bookingsResult.map((b) => ({
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
			setIsLoadingSlots(false)
		}
		fetchAvailability()
	}, [step, selectedAppointment, initialDate])

	// Scroll to error
	useEffect(() => {
		if (error && errorRef.current) {
			errorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
		}
	}, [error])

	// Handle project selection with auto-fill
	const handleProjectChange = async (value: string) => {
		if (value === "none") {
			setSelectedProject("none")
			return
		}

		const project = projects.find((p) => p.id.toString() === value)
		if (project?.Client) {
			const hasFilledFields = bookingName.trim() || companyName.trim() || contactNumber.trim()
			if (hasFilledFields) {
				setPendingProjectSelection(value)
				setShowOverwriteDialog(true)
				return
			}
			applyProjectClientData(value)
		} else {
			setSelectedProject(value)
		}
	}

	const applyProjectClientData = async (projectId: string) => {
		const project = projects.find((p) => p.id.toString() === projectId)
		if (!project?.Client) {
			setSelectedProject(projectId)
			return
		}

		setSelectedProject(projectId)
		setBookingName(project.Client.name || "")
		setCompanyName(project.Client.company || project.Client.name || "")
		setContactNumber(project.Client.phone || "")

		// Fetch project user emails and add client email
		const projectEmails: string[] = []
		if (project.Client.email) projectEmails.push(project.Client.email)
		try {
			const userEmails = await getProjectUsersEmails(project.id)
			userEmails.forEach((e) => {
				if (!projectEmails.includes(e)) projectEmails.push(e)
			})
		} catch {
			// Ignore
		}
		if (projectEmails.length > 0) {
			setClientEmails(projectEmails)
			// Set reminder emails too
			setReminders((prev) =>
				prev.map((r) => ({ ...r, recipientEmails: projectEmails }))
			)
		}
	}

	const handleOverwriteAccept = () => {
		setShowOverwriteDialog(false)
		if (pendingProjectSelection) {
			applyProjectClientData(pendingProjectSelection)
			setPendingProjectSelection(null)
		}
	}

	const handleOverwriteClose = () => {
		setShowOverwriteDialog(false)
		setPendingProjectSelection(null)
	}

	// Reminder management
	const toggleReminder = (hours: number) => {
		const minutes = reminderOffsetToMinutes(hours)
		const exists = reminders.some((r) => r.offsetMinutes === minutes)
		if (exists) {
			setReminders(reminders.filter((r) => r.offsetMinutes !== minutes))
		} else {
			const defaultEmails = clientEmails.filter((e) => e.trim())
			setReminders([
				...reminders,
				{ offsetMinutes: minutes, recipientEmails: defaultEmails.length > 0 ? defaultEmails : [""] },
			])
		}
	}

	const removeReminder = (index: number) => {
		setReminders(reminders.filter((_, i) => i !== index))
	}

	const updateReminderEmails = (index: number, emails: string[]) => {
		const updated = [...reminders]
		updated[index] = { ...updated[index], recipientEmails: emails }
		setReminders(updated)
	}

	// Submit booking
	const handleSubmit = async () => {
		setError(null)

		// Validate
		if (selectedTimeSlots.length === 0) {
			setError("Please select at least one available time slot")
			return
		}
		if (selectedProject === "none") {
			if (!bookingName.trim()) { setError("Booking Name is required when no project is selected"); return }
			if (!companyName.trim()) { setError("Company Name is required when no project is selected"); return }
			if (!contactNumber.trim()) { setError("Contact Number is required when no project is selected"); return }
		}
		const validEmails = clientEmails.filter((e) => e.trim())
		if (validEmails.length === 0) {
			setError("At least one client email address is required")
			return
		}
		if (reminders.length === 0) {
			setError("Automated Reminders: Please add at least one reminder (e.g. 24h before).")
			return
		}
		for (const r of reminders) {
			if (!r.recipientEmails.some((e) => e.trim())) {
				setError("Each reminder must have at least one recipient email.")
				return
			}
		}

		setIsSubmitting(true)
		const sortedSlots = [...selectedTimeSlots].sort((a, b) => a.localeCompare(b))
		const slotGroups = groupConsecutiveHourSlots(sortedSlots)

		try {
			for (const slot of sortedSlots) {
				const slotHour = parseInt(slot.split(":")[0], 10)
				const slotInfo = getSlotStatus(slotHour, existingBookings, blockers, initialDate)
				if (slotInfo.status !== "available") {
					setError(`Slot ${slot} is no longer available`)
					return
				}
			}

			let successfulCount = 0
			let totalEmailSent = 0
			let totalEmailFailed = 0
			let totalRecipients = 0
			const errors: string[] = []

			for (const group of slotGroups) {
				const dateTimes = hourSlotRangeToFormDateTimes(initialDate, group)
				if (!dateTimes) {
					errors.push("Selected times must be consecutive hours within each booking")
					continue
				}

				const formData = new FormData()
				formData.set("bookedBy", userName)
				formData.set("userId", userId)
				formData.set("startDate", dateTimes.startDate)
				formData.set("endDate", dateTimes.endDate)
				formData.set("purpose", purpose)
				formData.set("appointmentType", selectedAppointment?.appointmentType || "OTHERS")
				if (selectedProject !== "none") formData.set("projectId", selectedProject)
				if (selectedAppointment) formData.set("appointmentId", String(selectedAppointment.id))
				if (attendees) formData.set("attendees", attendees)
				formData.set("bookingName", bookingName)
				formData.set("companyName", companyName)
				formData.set("contactNumber", contactNumber)
				formData.set("remarks", remarks)
				formData.set("clientEmails", JSON.stringify(validEmails))
				formData.set("reminderOffsets", JSON.stringify(reminders))

				const result = await createAppointmentBooking(formData)
				if (result.success) {
					successfulCount += 1
					totalEmailSent += result.emailSentCount ?? 0
					totalEmailFailed += result.emailFailedCount ?? 0
					totalRecipients += result.uniqueRecipientCount ?? 0
				} else {
					errors.push(result.error || "Failed to create booking")
				}
			}

			if (errors.length === 0 && successfulCount > 0) {
				onSuccess()
				// Show email result dialog if emails were attempted
				if (totalEmailSent > 0 || totalEmailFailed > 0) {
					if (totalEmailFailed === 0) {
						setEmailResult({
							success: true,
							message: `Appointment confirmation email${totalRecipients !== 1 ? "s" : ""} sent successfully to ${totalRecipients} recipient${totalRecipients !== 1 ? "s" : ""}.`,
						})
					} else {
						setEmailResult({
							success: false,
							message: `Confirmation emails sent to ${totalEmailSent} recipient${totalEmailSent !== 1 ? "s" : ""}, but failed to send to ${totalEmailFailed}. Check the appointment-bookings page for details.`,
						})
					}
					setShowResultDialog(true)
				} else {
					toast({
						title: successfulCount === 1 ? "Appointment Booked" : "Appointments Booked",
						description:
							successfulCount === 1
								? "Booking confirmed successfully."
								: `${successfulCount} appointments booked successfully.`,
					})
					onClose()
				}
			} else {
				const firstError = errors[0] || "Failed to create booking"
				if (successfulCount > 0) {
					setError(`${firstError}. ${successfulCount} booking(s) created, ${errors.length} failed.`)
				} else {
					setError(firstError)
				}
			}
		} catch {
			setError("An unexpected error occurred")
		} finally {
			setIsSubmitting(false)
		}
	}

	const formattedDate = initialDate
		? new Date(`${initialDate}T12:00:00`).toLocaleDateString("en-US", {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric",
			})
		: ""

	const normalizedProjectSearch = projectSearch.trim().toLowerCase()
	const filteredProjects = useMemo(() => {
		if (!normalizedProjectSearch) return projects
		return projects.filter((p) => {
			const haystack = [
				p.name,
				p.clientName,
				formatProjectClientLabel(p.clientName),
				p.Client?.name,
				formatProjectClientLabel(p.Client?.name),
				p.Client?.company,
				SYSTEM_CLIENT_DISPLAY_LABEL,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
			return haystack.includes(normalizedProjectSearch)
		})
	}, [projects, normalizedProjectSearch])

	const selectedProjectLabel =
		selectedProject === "none"
			? "No project"
			: (() => {
					const p = projects.find((proj) => String(proj.id) === selectedProject)
					if (!p) return "Select project"
					return formatProjectOptionLabel(p.name, p.clientName)
				})()

	const normalizedAppointmentSearch = appointmentSearch.trim().toLowerCase()
	const filteredAppointments = appointments.filter((apt) => {
		if (!normalizedAppointmentSearch) return true
		const typeConfig = APPOINTMENT_TYPES[apt.appointmentType as AppointmentType] || APPOINTMENT_TYPES.OTHERS
		const haystack = [apt.name, apt.description ?? "", apt.location ?? "", typeConfig.label].join(" ").toLowerCase()
		return haystack.includes(normalizedAppointmentSearch)
	})

	const sortedSelectedSlots = [...selectedTimeSlots].sort((a, b) => a.localeCompare(b))

	return (
		<>
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							{step !== "select-appointment" && (
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 shrink-0"
									onClick={() => {
										if (step === "select-time") setStep("select-appointment")
										else if (step === "booking-form") setStep("select-time")
									}}
								>
									<ArrowLeft className="h-4 w-4" />
								</Button>
							)}
							<Calendar className="w-5 h-5" />
							{step === "select-appointment" && "Book Appointment"}
							{step === "select-time" && `Select Time — ${selectedAppointment?.name}`}
							{step === "booking-form" && "Booking Details"}
						</DialogTitle>
						{formattedDate && (
							<p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>
						)}
					</DialogHeader>

					{/* Step 1: Select Appointment */}
					{step === "select-appointment" && (
						<div className="space-y-3">
							{appointments.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
									<p className="font-medium">No appointments available</p>
									<p className="text-sm">There are no bookable appointments at the moment.</p>
								</div>
							) : (
								<>
									<div className="relative">
										<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											value={appointmentSearch}
											onChange={(e) => setAppointmentSearch(e.target.value)}
											placeholder="Search appointment name, type, description, or location"
											className="pl-9"
											aria-label="Search appointments"
										/>
									</div>

									{filteredAppointments.length === 0 ? (
										<div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
											<p className="font-medium">No matching appointments</p>
											<p className="text-sm mt-1">Try a different keyword or clear your search.</p>
										</div>
									) : (
										filteredAppointments.map((apt) => {
											const typeConfig = APPOINTMENT_TYPES[apt.appointmentType as AppointmentType] || APPOINTMENT_TYPES.OTHERS
											return (
												<div
													key={apt.id}
													className="border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
													onClick={() => {
														setSelectedAppointment(apt)
														setStep("select-time")
													}}
												>
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<div className="flex items-center gap-2 mb-1">
																<h3 className="font-semibold">{apt.name}</h3>
																<Badge variant="secondary" className={typeConfig.color}>
																	{typeConfig.label}
																</Badge>
															</div>
															{apt.description && (
																<p className="text-sm text-muted-foreground mb-2">{apt.description}</p>
															)}
															{apt.location && (
																<div className="flex items-center gap-1 text-sm text-muted-foreground">
																	<MapPin className="w-3 h-3" />
																	{apt.location}
																</div>
															)}
														</div>
														<ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
													</div>
												</div>
											)
										})
									)}
								</>
							)}
						</div>
					)}

					{/* Step 2: Select Time */}
					{step === "select-time" && (
						<div className="space-y-4">
							{isLoadingSlots ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
								</div>
							) : (
								<>
									{/* Blocker warnings */}
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
															{b.title}: {toBusinessTZParts(b.startDateTime).timeStr} - {toBusinessTZParts(b.endDateTime).timeStr}
														</p>
													))}
												</div>
											</div>
										</div>
									)}

									{/* Time slots visualization */}
									<div className="space-y-1">
										<p className="text-sm font-medium text-muted-foreground mb-2">
											Availability (click available slots to select)
										</p>
										<div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
											{TIME_SLOTS.map((slot) => {
												const hour = parseInt(slot)
												const slotInfo = getSlotStatus(hour, existingBookings, blockers, initialDate)
												const isDisabled = slotInfo.status !== "available"
												const isSelected = selectedTimeSlots.includes(slot)
												const alsoBookedCount = ("alsoBookedCount" in slotInfo ? slotInfo.alsoBookedCount : 0) ?? 0
												const isShared = alsoBookedCount > 0

												return (
													<button
														type="button"
														key={slot}
														className={`text-center p-2 rounded-md border text-sm ${
															isDisabled
																? slotInfo.status === "blocked"
																	? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 cursor-not-allowed"
																	: "bg-muted text-muted-foreground cursor-not-allowed"
																: isSelected
																	? "bg-primary border-primary text-primary-foreground"
																	: isShared
																		? "bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:border-primary/70"
																		: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:border-primary/70"
														}`}
														title={slotInfo.label}
														disabled={isDisabled}
														onClick={() => {
															setSelectedTimeSlots((prev) =>
																prev.includes(slot)
																	? prev.filter((t) => t !== slot)
																	: [...prev, slot]
															)
														}}
													>
														{slot}
														<div className="text-[10px] mt-0.5 truncate">
															{slotInfo.status === "available" && (isSelected
																? "Selected"
																: isShared
																	? `Shared (+${alsoBookedCount})`
																	: "Available")}
															{slotInfo.status === "blocked" && "Blocked"}
															{slotInfo.status === "past" && "Past"}
														</div>
													</button>
												)
											})}
										</div>
									</div>
									{sortedSelectedSlots.length > 0 && (
										<div className="rounded-md border border-border bg-muted/30 p-3">
											<p className="text-sm font-medium mb-2">Selected slots ({sortedSelectedSlots.length})</p>
											<div className="flex flex-wrap gap-2">
												{sortedSelectedSlots.map((slot) => (
													<Badge key={slot} variant="secondary">
														{slot} - {String(parseInt(slot.split(":")[0], 10) + 1).padStart(2, "0")}:00
													</Badge>
												))}
											</div>
										</div>
									)}

									<div className="flex justify-end">
										<Button
											onClick={() => setStep("booking-form")}
											disabled={selectedTimeSlots.length === 0}
										>
											Next
											<ArrowRight className="w-4 h-4 ml-1" />
										</Button>
									</div>
								</>
							)}
						</div>
					)}

					{/* Step 3: Booking Form */}
					{step === "booking-form" && (
						<div className="space-y-4">
							{/* Summary */}
							<div className="rounded-lg border bg-muted/30 p-3 text-sm">
								<div className="flex items-center gap-2 mb-1">
									<Clock className="w-4 h-4 text-muted-foreground" />
									<span className="font-medium">{selectedAppointment?.name}</span>
								</div>
								<p className="text-muted-foreground ml-6">
									{formattedDate}
								</p>
								<div className="ml-6 mt-2 flex flex-wrap gap-2">
									{sortedSelectedSlots.map((slot) => (
										<Badge key={slot} variant="secondary">
											{slot} - {String(parseInt(slot.split(":")[0], 10) + 1).padStart(2, "0")}:00
										</Badge>
									))}
								</div>
							</div>

							{error && (
								<div ref={errorRef} className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
									{error}
								</div>
							)}

							{/* Project Selection */}
							<div>
								<Label>Project (Optional)</Label>
								<Popover
									open={projectPopoverOpen}
									onOpenChange={(open) => {
										setProjectPopoverOpen(open)
										if (!open) setProjectSearch("")
									}}
								>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											role="combobox"
											aria-expanded={projectPopoverOpen}
											disabled={isLoadingProjects}
											className={cn(
												"w-full justify-between font-normal",
												selectedProject === "none" && "text-muted-foreground"
											)}
										>
											<span className="truncate">
												{isLoadingProjects ? "Loading projects..." : selectedProjectLabel}
											</span>
											<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="z-[60] flex w-[var(--radix-popover-trigger-width)] max-h-[min(20rem,calc(100vh-8rem))] flex-col overflow-hidden p-0"
										align="start"
										onWheel={(e) => e.stopPropagation()}
									>
										<div className="relative shrink-0 border-b p-2">
											<Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
											<Input
												placeholder="Search projects..."
												value={projectSearch}
												onChange={(e) => setProjectSearch(e.target.value)}
												className="h-8 pl-8 text-sm"
												aria-label="Search projects"
											/>
										</div>
										<div
											className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 space-y-0.5"
											onWheel={(e) => e.stopPropagation()}
											onTouchMove={(e) => e.stopPropagation()}
										>
											<button
												type="button"
												className={cn(
													"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
													selectedProject === "none" && "bg-accent"
												)}
												onClick={() => {
													handleProjectChange("none")
													setProjectPopoverOpen(false)
												}}
											>
												<Check
													className={cn(
														"h-4 w-4 shrink-0",
														selectedProject === "none" ? "opacity-100" : "opacity-0"
													)}
												/>
												<span>No project</span>
											</button>
											{filteredProjects.map((p) => {
												const value = String(p.id)
												const label = formatProjectOptionLabel(p.name, p.clientName)
												const isSelected = selectedProject === value
												return (
													<button
														key={p.id}
														type="button"
														className={cn(
															"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent text-left",
															isSelected && "bg-accent"
														)}
														onClick={() => {
															void handleProjectChange(value)
															setProjectPopoverOpen(false)
														}}
													>
														<Check
															className={cn(
																"h-4 w-4 shrink-0",
																isSelected ? "opacity-100" : "opacity-0"
															)}
														/>
														<span className="truncate">{label}</span>
													</button>
												)
											})}
											{!isLoadingProjects && projects.length === 0 && (
												<p className="text-sm text-muted-foreground text-center py-2">
													No projects available
												</p>
											)}
											{projects.length > 0 && filteredProjects.length === 0 && (
												<p className="text-sm text-muted-foreground text-center py-2">
													No matching projects
												</p>
											)}
										</div>
									</PopoverContent>
								</Popover>
							</div>

							{/* Contact Details */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<Label>
										Booking Name {selectedProject === "none" && <span className="text-destructive">*</span>}
									</Label>
									<Input
										value={bookingName}
										onChange={(e) => setBookingName(e.target.value)}
										placeholder="Contact name"
									/>
								</div>
								<div>
									<Label>
										Company Name {selectedProject === "none" && <span className="text-destructive">*</span>}
									</Label>
									<Input
										value={companyName}
										onChange={(e) => setCompanyName(e.target.value)}
										placeholder="Company"
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<Label>
										Contact Number {selectedProject === "none" && <span className="text-destructive">*</span>}
									</Label>
									<Input
										value={contactNumber}
										onChange={(e) => setContactNumber(e.target.value)}
										placeholder="Phone number"
									/>
								</div>
								<div>
									<Label>Attendees</Label>
									<Input
										type="number"
										min="1"
										value={attendees}
										onChange={(e) => setAttendees(e.target.value)}
										placeholder="Number of attendees"
									/>
								</div>
							</div>

							{/* Purpose & Remarks */}
							<div>
								<Label>Purpose</Label>
								<Textarea
									value={purpose}
									onChange={(e) => setPurpose(e.target.value)}
									placeholder="Purpose of the booking"
									rows={2}
								/>
							</div>
							<div>
								<Label>Remarks</Label>
								<Textarea
									value={remarks}
									onChange={(e) => setRemarks(e.target.value)}
									placeholder="Additional notes"
									rows={2}
								/>
							</div>

							{/* Client emails */}
							<EmailListInput
								emails={clientEmails}
								onChange={setClientEmails}
								required
								label="Client Email Address"
							/>

							{/* Reminders */}
							{(() => {
								const firstSlotHour = sortedSelectedSlots.length > 0
									? parseInt(sortedSelectedSlots[0].split(":")[0], 10)
									: null
								const appointmentStart = firstSlotHour !== null && initialDate
									? parseDateInBusinessTZ(`${initialDate}T${String(firstSlotHour).padStart(2, "0")}:00:00`)
									: null

								return (
									<div className="space-y-3">
										<div>
											<Label>Automated Reminders <span className="text-destructive">*</span></Label>
											<p className="text-xs text-muted-foreground mt-0.5">
												Set up reminder emails to be sent before the appointment. At least one reminder is required.
											</p>
										</div>

										{/* Toggle buttons */}
										<div className="flex flex-wrap gap-2">
											{REMINDER_HOURS.map((hours) => {
												const minutes = reminderOffsetToMinutes(hours)
												const isSelected = reminders.some((r) => r.offsetMinutes === minutes)
												const reminderTime = appointmentStart ? subMinutes(appointmentStart, minutes) : null
												return (
													<Button
														key={minutes}
														type="button"
														variant={isSelected ? "default" : "outline"}
														size="sm"
														onClick={() => toggleReminder(hours)}
														className="text-xs"
													>
														{reminderLabel(hours)} before
														{isSelected && reminderTime && (
															<span className="ml-1 opacity-70">
																({format(reminderTime, "h:mm a")})
															</span>
														)}
													</Button>
												)
											})}
										</div>

										{/* Selected reminders with per-reminder email inputs */}
										{reminders.length > 0 && (
											<div className="space-y-2 border rounded-lg p-3 bg-muted/30">
												<p className="text-xs font-medium text-muted-foreground">
													Selected Reminders ({reminders.length})
												</p>
												{[...reminders]
													.sort((a, b) => b.offsetMinutes - a.offsetMinutes)
													.map((reminder, sortedIndex) => {
														const origIndex = reminders.findIndex(
															(r) => r.offsetMinutes === reminder.offsetMinutes
														)
														const hours = reminder.offsetMinutes === 2880 ? 48 : reminder.offsetMinutes / 60
														const reminderTime = appointmentStart
															? subMinutes(appointmentStart, reminder.offsetMinutes)
															: null
														const label = hours === 48 ? "48 hours (2 days)" : hours === 1 ? "1 hour" : `${hours} hours`
														return (
															<div key={`${reminder.offsetMinutes}-${sortedIndex}`} className="space-y-1.5 p-2 bg-background rounded border">
																<div className="flex items-center justify-between">
																	<div>
																		<p className="text-sm font-medium">{label} before</p>
																		{reminderTime && (
																			<p className="text-xs text-muted-foreground">
																				Will send at: {format(reminderTime, "MMM d, yyyy 'at' h:mm a")}
																			</p>
																		)}
																	</div>
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		onClick={() => removeReminder(origIndex)}
																		className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
																	>
																		×
																	</Button>
																</div>
																<EmailListInput
																	emails={reminder.recipientEmails}
																	onChange={(emails) => updateReminderEmails(origIndex, emails)}
																	required
																	className="mt-1"
																/>
															</div>
														)
													})}
											</div>
										)}
									</div>
								)
							})()}

							{/* Submit */}
							<div className="flex justify-end gap-2 pt-4 border-t">
								<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
									Cancel
								</Button>
								<Button onClick={handleSubmit} disabled={isSubmitting}>
									{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
									Book Appointment
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Field Overwrite Dialog */}
			<FieldOverwriteDialog
				isOpen={showOverwriteDialog}
				onClose={handleOverwriteClose}
				onAccept={handleOverwriteAccept}
				fieldsToOverwrite={{
					bookingName: bookingName || undefined,
					companyName: companyName || undefined,
					contactNumber: contactNumber || undefined,
				}}
				projectClientName={
					projects.find((p) => p.id.toString() === pendingProjectSelection)?.Client?.name || "Client"
				}
		/>

		{/* Email Result Dialog */}
		<Dialog
				open={showResultDialog}
				onOpenChange={(open) => {
					if (!open) {
						setShowResultDialog(false)
						setEmailResult(null)
						onClose()
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							{emailResult?.success ? (
								<>
									<CheckCircle className="w-5 h-5 text-green-600" />
									Email Sent Successfully
								</>
							) : (
								<>
									<XCircle className="w-5 h-5 text-red-600" />
									Failed to Send Email
								</>
							)}
						</DialogTitle>
						<DialogDescription>{emailResult?.message}</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							onClick={() => {
								setShowResultDialog(false)
								setEmailResult(null)
								onClose()
							}}
						>
							OK
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

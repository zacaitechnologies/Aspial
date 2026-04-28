"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
	ArrowLeft,
	ArrowRight,
	Calendar,
	Clock,
	Loader2,
	MapPin,
	AlertTriangle,
	Plus,
	Trash2,
	Search,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "@/app/(main)/contexts/SessionProvider"
import { getActiveBlockers } from "@/app/(main)/calendar/actions"
import {
	createAppointmentBooking,
	getUserProjects,
	getAppointmentBookings,
	getProjectUsersEmails,
} from "@/app/(main)/appointment-bookings/actions"
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

const REMINDER_OPTIONS = [
	{ value: 60, label: "1 hour before" },
	{ value: 120, label: "2 hours before" },
	{ value: 180, label: "3 hours before" },
	{ value: 360, label: "6 hours before" },
	{ value: 720, label: "12 hours before" },
	{ value: 1440, label: "24 hours before" },
	{ value: 2880, label: "48 hours before" },
]

function getSlotStatus(
	hour: number,
	bookings: BookingSlot[],
	blockers: BlockerSlot[],
	selectedDate: string
) {
	const dayStart = new Date(`${selectedDate}T${String(hour).padStart(2, "0")}:00:00`)
	const dayEnd = new Date(`${selectedDate}T${String(hour + 1).padStart(2, "0")}:00:00`)

	for (const blocker of blockers) {
		if (dayStart < blocker.endDateTime && dayEnd > blocker.startDateTime) {
			return { status: "blocked" as const, label: blocker.title }
		}
	}

	for (const booking of bookings) {
		if (dayStart < booking.endDate && dayEnd > booking.startDate) {
			return { status: "booked" as const, label: `Booked by ${booking.bookedBy}` }
		}
	}

	const now = new Date()
	if (dayStart < now) {
		return { status: "past" as const, label: "Past" }
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
	const { enhancedUser } = useSession()
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

	// Fetch projects
	useEffect(() => {
		if (!isOpen) return
		const fetchProjects = async () => {
			if (enhancedUser?.id) {
				setIsLoadingProjects(true)
				const userProjects = await getUserProjects(enhancedUser.id)
				setProjects(userProjects)
				setIsLoadingProjects(false)
			} else {
				setIsLoadingProjects(false)
			}
		}
		fetchProjects()
	}, [isOpen, enhancedUser?.id])

	// Fetch availability when appointment is selected
	useEffect(() => {
		if (step !== "select-time" || !selectedAppointment || !initialDate) return

		const fetchAvailability = async () => {
			setIsLoadingSlots(true)
			const dayStart = new Date(`${initialDate}T00:00:00`)
			const dayEnd = new Date(`${initialDate}T23:59:59`)

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
	const addReminder = () => {
		const usedOffsets = new Set(reminders.map((r) => r.offsetMinutes))
		const nextAvailable = REMINDER_OPTIONS.find((o) => !usedOffsets.has(o.value))
		if (nextAvailable) {
			setReminders([...reminders, { offsetMinutes: nextAvailable.value, recipientEmails: [...clientEmails.filter((e) => e.trim())] }])
		}
	}

	const removeReminder = (index: number) => {
		if (reminders.length <= 1) return
		setReminders(reminders.filter((_, i) => i !== index))
	}

	const updateReminderOffset = (index: number, offset: number) => {
		setReminders(reminders.map((r, i) => (i === index ? { ...r, offsetMinutes: offset } : r)))
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
			setError("At least one email address is required")
			return
		}
		if (reminders.length === 0) {
			setError("At least one reminder is required")
			return
		}

		setIsSubmitting(true)
		const sortedSlots = [...selectedTimeSlots].sort((a, b) => a.localeCompare(b))

		try {
			const bookingResults = await Promise.all(
				sortedSlots.map(async (slot) => {
					const slotHour = parseInt(slot.split(":")[0], 10)
					const slotInfo = getSlotStatus(slotHour, existingBookings, blockers, initialDate)
					if (slotInfo.status !== "available") {
						return { success: false as const, error: `Slot ${slot} is no longer available` }
					}

					const nextHour = String(slotHour + 1).padStart(2, "0")
					const formData = new FormData()
					formData.set("bookedBy", userName)
					formData.set("startDate", `${initialDate}T${slot}:00`)
					formData.set("endDate", `${initialDate}T${nextHour}:00:00`)
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

					return createAppointmentBooking(formData)
				})
			)

			const successfulCount = bookingResults.filter((result) => result.success).length
			const failedResults = bookingResults.filter((result) => !result.success)

			if (failedResults.length === 0 && successfulCount > 0) {
				toast({
					title: successfulCount === 1 ? "Appointment Booked" : "Appointments Booked",
					description:
						successfulCount === 1
							? "Booking confirmed successfully."
							: `${successfulCount} appointments booked successfully.`,
				})
				onSuccess()
				onClose()
			} else {
				const firstError = failedResults[0]?.error || "Failed to create booking"
				if (successfulCount > 0) {
					setError(`${firstError}. ${successfulCount} slot(s) booked, ${failedResults.length} failed.`)
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
															{b.title}: {b.startDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {b.endDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

												return (
													<button
														type="button"
														key={slot}
														className={`text-center p-2 rounded-md border text-sm ${
															isDisabled
																? slotInfo.status === "blocked"
																	? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 cursor-not-allowed"
																	: slotInfo.status === "booked"
																		? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 cursor-not-allowed"
																		: "bg-muted text-muted-foreground cursor-not-allowed"
																: isSelected
																	? "bg-primary border-primary text-primary-foreground"
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
															{slotInfo.status === "available" && (isSelected ? "Selected" : "Available")}
															{slotInfo.status === "booked" && "Booked"}
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
								<Select
									value={selectedProject}
									onValueChange={handleProjectChange}
									disabled={isLoadingProjects}
								>
									<SelectTrigger>
										<SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "No project"} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">No project</SelectItem>
										{projects.map((p) => (
											<SelectItem key={p.id} value={String(p.id)}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
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

							{/* Emails */}
							<EmailListInput
								emails={clientEmails}
								onChange={setClientEmails}
								required
							/>

							{/* Reminders */}
							<div className="space-y-2">
								<Label>Automated Reminders <span className="text-destructive">*</span></Label>
								{reminders.map((reminder, index) => (
									<div key={index} className="flex items-center gap-2">
										<Select
											value={String(reminder.offsetMinutes)}
											onValueChange={(v) => updateReminderOffset(index, parseInt(v))}
										>
											<SelectTrigger className="w-[180px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{REMINDER_OPTIONS.map((opt) => (
													<SelectItem key={opt.value} value={String(opt.value)}>
														{opt.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{reminders.length > 1 && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => removeReminder(index)}
												className="shrink-0"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										)}
									</div>
								))}
								{reminders.length < REMINDER_OPTIONS.length && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={addReminder}
									>
										<Plus className="w-4 h-4 mr-1" />
										Add Reminder
									</Button>
								)}
							</div>

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
		</>
	)
}

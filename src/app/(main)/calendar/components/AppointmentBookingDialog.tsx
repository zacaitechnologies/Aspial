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
	Calendar,
	CheckCircle,
	Loader2,
	MapPin,
	AlertTriangle,
	Search,
	XCircle,
	ChevronDown,
	Check,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getActiveBlockers, getAppointmentBookingDetails, updateAppointmentBooking } from "@/app/(main)/calendar/actions"
import { getAllUsers } from "@/app/(main)/quotations/action"
import { MultiSelectAdvisors, type AdvisorOption } from "@/components/ui/multi-select-advisors"
import type { CalendarBooking } from "../actions"
import {
	createAppointmentBooking,
	getBookingFormProjects,
	getProjectUsersEmails,
} from "@/app/(main)/appointment-bookings/actions"
import { parseDateInBusinessTZ, toBusinessTZParts } from "@/lib/date-utils"
import {
	formatProjectClientLabel,
	formatProjectOptionLabel,
	SYSTEM_CLIENT_DISPLAY_LABEL,
} from "@/lib/no-project"
import { EmailListInput } from "@/app/(main)/appointment-bookings/components/EmailListInput"
import { CopyClientEmailsToRemindersButton } from "@/app/(main)/appointment-bookings/components/CopyClientEmailsToRemindersButton"
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
	initialEndTime?: string | null // HH:MM
	initialAppointmentType?: AppointmentType | null
	appointments: AvailableAppointment[]
	userId: string
	userName: string
	onSuccess: () => void
	/** When set, the dialog opens in edit mode for this booking. */
	editBooking?: CalendarBooking | null
}

interface BlockerSlot {
	id: number
	title: string
	startDateTime: Date
	endDateTime: Date
}

type AppointmentCategory = "INTERNAL" | "EXTERNAL"

const REMINDER_HOURS = [1, 2, 6, 12, 24, 48]

function reminderOffsetToMinutes(hours: number): number {
	return hours === 48 ? 2880 : hours * 60
}

function reminderLabel(hours: number): string {
	if (hours === 48) return "2 days"
	if (hours === 1) return "1h"
	return `${hours}h`
}

function addOneHour(time: string): string {
	const [h, m] = time.split(":").map(Number)
	const nextHour = Math.min((Number.isFinite(h) ? h : 9) + 1, 23)
	const minutes = Number.isFinite(m) ? m : 0
	return `${String(nextHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function groupReminderRows(
	rows: Array<{ offsetMinutes: number; recipientEmail: string }>
): Array<{ offsetMinutes: number; recipientEmails: string[] }> {
	const map = new Map<number, string[]>()
	for (const row of rows) {
		const email = row.recipientEmail.trim()
		if (!email) continue
		const list = map.get(row.offsetMinutes) ?? []
		if (!list.includes(email)) list.push(email)
		map.set(row.offsetMinutes, list)
	}
	return Array.from(map.entries()).map(([offsetMinutes, recipientEmails]) => ({
		offsetMinutes,
		recipientEmails,
	}))
}

export function AppointmentBookingDialog({
	isOpen,
	onClose,
	initialDate,
	initialTime,
	initialEndTime,
	initialAppointmentType,
	appointments,
	userId,
	userName,
	onSuccess,
	editBooking = null,
}: AppointmentBookingDialogProps) {
	const { toast } = useToast()
	const [selectedAppointment, setSelectedAppointment] = useState<AvailableAppointment | null>(null)
	const [appointmentSearch, setAppointmentSearch] = useState("")
	const [appointmentPopoverOpen, setAppointmentPopoverOpen] = useState(false)

	// Time + category
	const [startTime, setStartTime] = useState("09:00")
	const [endTime, setEndTime] = useState("10:00")
	const [appointmentCategory, setAppointmentCategory] = useState<AppointmentCategory>("INTERNAL")
	const [blockers, setBlockers] = useState<BlockerSlot[]>([])

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
	const [assigneeIds, setAssigneeIds] = useState<string[]>([])
	const [teamMembers, setTeamMembers] = useState<AdvisorOption[]>([])
	const [clientEmails, setClientEmails] = useState<string[]>([""])
	const [reminders, setReminders] = useState<Array<{ offsetMinutes: number; recipientEmails: string[] }>>([
		{ offsetMinutes: 1440, recipientEmails: [""] },
	])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isLoadingEdit, setIsLoadingEdit] = useState(false)
	const [editBookingId, setEditBookingId] = useState<number | null>(null)
	const [activeDateStr, setActiveDateStr] = useState(initialDate)
	const [error, setError] = useState<string | null>(null)
	const errorRef = useRef<HTMLDivElement>(null)

	// Email result dialog
	const [showResultDialog, setShowResultDialog] = useState(false)
	const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null)

	// Overwrite dialog
	const [showOverwriteDialog, setShowOverwriteDialog] = useState(false)
	const [pendingProjectSelection, setPendingProjectSelection] = useState<string | null>(null)

	const appointmentsRef = useRef(appointments)
	appointmentsRef.current = appointments

	const isEditMode = editBookingId !== null

	// Reset state only when opening in create mode
	useEffect(() => {
		if (!isOpen || editBooking) return

		setEditBookingId(null)
		setIsLoadingEdit(false)
		setActiveDateStr(initialDate)
		const start = initialTime || "09:00"
		setStartTime(start)
		setEndTime(initialEndTime || addOneHour(start))
		setAppointmentCategory("INTERNAL")
		setAppointmentSearch("")
		setAppointmentPopoverOpen(false)
		const preselected = initialAppointmentType
			? appointmentsRef.current.find((a) => a.appointmentType === initialAppointmentType) ?? null
			: null
		setSelectedAppointment(preselected)
		setPurpose("")
		setAttendees("")
		setSelectedProject("none")
		setProjectSearch("")
		setProjectPopoverOpen(false)
		setBookingName("")
		setCompanyName("")
		setContactNumber("")
		setRemarks("")
		setAssigneeIds([])
		setClientEmails([""])
		setReminders([{ offsetMinutes: 1440, recipientEmails: [""] }])
		setError(null)
		setBlockers([])
		setShowResultDialog(false)
		setEmailResult(null)
	}, [isOpen, initialDate, initialTime, initialEndTime, initialAppointmentType, editBooking])

	// Load existing booking when editing
	useEffect(() => {
		if (!isOpen || !editBooking) return

		const idMatch = editBooking.id.match(/appointment-(\d+)/)
		if (!idMatch) {
			setError("Invalid booking reference")
			setIsLoadingEdit(false)
			return
		}

		const numericId = Number.parseInt(idMatch[1], 10)
		setEditBookingId(numericId)
		setIsLoadingEdit(true)
		setError(null)

		void (async () => {
			const details = await getAppointmentBookingDetails(numericId)
			if (!details) {
				setError("Could not load booking details")
				setIsLoadingEdit(false)
				return
			}

			const start = new Date(details.startDate)
			const end = new Date(details.endDate)
			const startBiz = toBusinessTZParts(start)
			const endBiz = toBusinessTZParts(end)

			setActiveDateStr(startBiz.dateStr)
			setStartTime(startBiz.timeStr)
			setEndTime(endBiz.timeStr)
			setAppointmentCategory(
				details.appointmentCategory === "EXTERNAL" ? "EXTERNAL" : "INTERNAL"
			)
			setPurpose(details.purpose || "")
			setAttendees(details.attendees ? String(details.attendees) : "")
			setBookingName(details.bookingName || "")
			setCompanyName(details.companyName || "")
			setContactNumber(details.contactNumber || "")
			setRemarks(details.remarks || "")
			setAssigneeIds(details.assignees.map((a) => a.userId))
			setSelectedProject(details.projectId ? String(details.projectId) : "none")

			const emailSet = new Set<string>()
			for (const row of details.bookingEmails) {
				const email = row.recipientEmail.trim()
				if (email) emailSet.add(email)
			}
			const projectEmail = details.project?.Client?.email?.trim()
			if (projectEmail) emailSet.add(projectEmail)
			setClientEmails(emailSet.size > 0 ? Array.from(emailSet) : [""])

			const groupedReminders = groupReminderRows(details.reminders)
			setReminders(
				groupedReminders.length > 0
					? groupedReminders
					: [{ offsetMinutes: 1440, recipientEmails: emailSet.size > 0 ? Array.from(emailSet) : [""] }]
			)

			if (details.appointment) {
				setSelectedAppointment({
					id: details.appointment.id,
					name: details.appointment.name,
					location: details.appointment.location,
					brand: details.appointment.brand,
					description: null,
					appointmentType: details.appointment.appointmentType,
				})
			} else {
				setSelectedAppointment(null)
			}

			setIsLoadingEdit(false)
		})()
	}, [isOpen, editBooking])

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

	// Fetch team members for the Assign To field
	useEffect(() => {
		if (!isOpen) return
		void getAllUsers().then((users) => {
			setTeamMembers(
				users.map((u) => ({
					id: u.supabase_id,
					firstName: u.firstName,
					lastName: u.lastName,
					email: u.email,
				}))
			)
		})
	}, [isOpen])

	// Fetch active blockers for the date so we can warn / prevent booking over them
	useEffect(() => {
		if (!isOpen || !activeDateStr || !activeDateStr.includes("-")) return
		const fetchBlockers = async () => {
			const dayStart = parseDateInBusinessTZ(`${activeDateStr}T00:00:00`)
			const dayEnd = parseDateInBusinessTZ(`${activeDateStr}T23:59:59`)
			const blockersResult = await getActiveBlockers(dayStart, dayEnd)
			setBlockers(
				blockersResult.map((b) => ({
					id: b.id,
					title: b.title,
					startDateTime: new Date(b.startDateTime),
					endDateTime: new Date(b.endDateTime),
				}))
			)
		}
		void fetchBlockers()
	}, [isOpen, activeDateStr])

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
			setReminders([
				...reminders,
				{ offsetMinutes: minutes, recipientEmails: [""] },
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
		if (!selectedAppointment) {
			setError("Please select an appointment")
			return
		}
		if (!startTime || !endTime) {
			setError("Please select a start and end time")
			return
		}
		if (endTime <= startTime) {
			setError("End time must be after the start time")
			return
		}

		const startDt = parseDateInBusinessTZ(`${activeDateStr}T${startTime}:00`)
		const endDt = parseDateInBusinessTZ(`${activeDateStr}T${endTime}:00`)

		if (!isEditMode && startDt.getTime() < Date.now()) {
			setError("Start time has already passed. Please choose a future time.")
			return
		}

		const overlappingBlocker = blockers.find(
			(b) => startDt < b.endDateTime && endDt > b.startDateTime
		)
		if (overlappingBlocker) {
			setError(`This time overlaps an active blocker: ${overlappingBlocker.title}`)
			return
		}

		if (selectedProject === "none") {
			if (!bookingName.trim()) { setError("Booking Name is required when no project is selected"); return }
			if (!companyName.trim()) { setError("Company Name is required when no project is selected"); return }
			if (!contactNumber.trim()) { setError("Contact Number is required when no project is selected"); return }
		}
		const validEmails = clientEmails.filter((e) => e.trim())
		if (!isEditMode && validEmails.length === 0) {
			setError("At least one client email address is required")
			return
		}
		const remindersToSubmit = reminders.map((r) => ({
			...r,
			recipientEmails: r.recipientEmails.some((e) => e.trim())
				? r.recipientEmails
				: validEmails.length > 0
					? validEmails
					: r.recipientEmails,
		}))
		if (remindersToSubmit.length === 0) {
			setError("Automated Reminders: Please add at least one reminder (e.g. 24h before).")
			return
		}
		for (const r of remindersToSubmit) {
			if (!r.recipientEmails.some((e) => e.trim())) {
				setError("Each reminder must have at least one recipient email.")
				return
			}
		}

		setIsSubmitting(true)
		try {
			const formData = new FormData()
			formData.set("startDate", `${activeDateStr}T${startTime}:00`)
			formData.set("endDate", `${activeDateStr}T${endTime}:00`)
			formData.set("purpose", purpose)
			formData.set("appointmentCategory", appointmentCategory)
			if (selectedProject !== "none") formData.set("projectId", selectedProject)
			if (attendees) formData.set("attendees", attendees)
			formData.set("bookingName", bookingName)
			formData.set("companyName", companyName)
			formData.set("contactNumber", contactNumber)
			formData.set("remarks", remarks)
			formData.set("assigneeIds", JSON.stringify(assigneeIds))
			formData.set("reminderOffsets", JSON.stringify(remindersToSubmit))

			if (isEditMode && editBookingId) {
				const result = await updateAppointmentBooking(editBookingId, formData, userName)
				if (result.success) {
					toast({
						title: "Booking Updated",
						description: "The appointment has been updated successfully.",
					})
					onSuccess()
					onClose()
				} else {
					setError(result.error || "Failed to update booking")
				}
				return
			}

			formData.set("bookedBy", userName)
			formData.set("userId", userId)
			formData.set("appointmentType", selectedAppointment.appointmentType || "OTHERS")
			formData.set("appointmentId", String(selectedAppointment.id))
			formData.set("clientEmails", JSON.stringify(validEmails))

			const result = await createAppointmentBooking(formData)

			if (result.success) {
				onSuccess()
				const totalEmailSent = result.emailSentCount ?? 0
				const totalEmailFailed = result.emailFailedCount ?? 0
				const totalRecipients = result.uniqueRecipientCount ?? 0
				onClose()
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
						title: "Appointment Booked",
						description: "Booking confirmed successfully.",
					})
				}
			} else {
				setError(result.error || "Failed to create booking")
			}
		} catch {
			setError("An unexpected error occurred")
		} finally {
			setIsSubmitting(false)
		}
	}

	const formattedDate = activeDateStr
		? new Date(`${activeDateStr}T12:00:00`).toLocaleDateString("en-US", {
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

	const appointmentStart = activeDateStr && startTime
		? parseDateInBusinessTZ(`${activeDateStr}T${startTime}:00`)
		: null

	return (
		<>
			<Dialog
				open={isOpen}
				onOpenChange={onClose}
			>
				<DialogContent
					className="z-[60] max-w-2xl max-h-[85vh] overflow-y-auto"
					onPointerDownOutside={(e) => {
						if ((e.target as Element).closest('[data-slot="select-content"]')) {
							e.preventDefault()
						}
					}}
					onFocusOutside={(e) => {
						if ((e.target as Element).closest('[data-slot="select-content"]')) {
							e.preventDefault()
						}
					}}
				>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Calendar className="w-5 h-5" />
							{isEditMode ? "Edit Booking" : "Book Appointment"}
						</DialogTitle>
						{formattedDate && (
							<p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>
						)}
					</DialogHeader>

					{isLoadingEdit ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : appointments.length === 0 && !isEditMode ? (
						<div className="text-center py-8 text-muted-foreground">
							<Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
							<p className="font-medium">No appointments available</p>
							<p className="text-sm">There are no bookable appointments at the moment.</p>
						</div>
					) : (
						<div className="space-y-4">
							{error && (
								<div ref={errorRef} className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
									{error}
								</div>
							)}

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

							{/* Appointment */}
							<div className="space-y-2">
								<Label>Appointment <span className="text-destructive">*</span></Label>
								{isEditMode ? (
									<div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-muted/30 px-3 text-sm">
										<span className="truncate font-medium">
											{selectedAppointment?.name ?? "Appointment"}
										</span>
										{selectedAppointment && (
											<Badge
												variant="secondary"
												className={cn(
													"ml-auto shrink-0 text-[10px]",
													APPOINTMENT_TYPES[selectedAppointment.appointmentType as AppointmentType]?.color ??
														APPOINTMENT_TYPES.OTHERS.color
												)}
											>
												{APPOINTMENT_TYPES[selectedAppointment.appointmentType as AppointmentType]?.label ??
													"Others"}
											</Badge>
										)}
									</div>
								) : (
								<Popover
									open={appointmentPopoverOpen}
									onOpenChange={(open) => {
										setAppointmentPopoverOpen(open)
										if (!open) setAppointmentSearch("")
									}}
								>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											role="combobox"
											aria-expanded={appointmentPopoverOpen}
											className={cn(
												"w-full justify-between font-normal",
												!selectedAppointment && "text-muted-foreground"
											)}
										>
											<span className="truncate">
												{selectedAppointment ? selectedAppointment.name : "Search and select an appointment"}
											</span>
											<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="z-[60] flex w-[var(--radix-popover-trigger-width)] max-h-[min(20rem,calc(100vh-8rem))] flex-col overflow-hidden border-border bg-card p-0 text-card-foreground shadow-md"
										align="start"
										onWheel={(e) => e.stopPropagation()}
									>
										<div className="relative shrink-0 border-b border-border bg-card p-2">
											<Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
											<Input
												placeholder="Search name, type, description, location..."
												value={appointmentSearch}
												onChange={(e) => setAppointmentSearch(e.target.value)}
												className="h-8 pl-8 text-sm"
												aria-label="Search appointments"
											/>
										</div>
										<div
											className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-card p-1 space-y-0.5"
											onWheel={(e) => e.stopPropagation()}
											onTouchMove={(e) => e.stopPropagation()}
										>
											{filteredAppointments.length === 0 ? (
												<p className="text-sm text-muted-foreground text-center py-2">
													No matching appointments
												</p>
											) : (
												filteredAppointments.map((apt) => {
													const typeConfig = APPOINTMENT_TYPES[apt.appointmentType as AppointmentType] || APPOINTMENT_TYPES.OTHERS
													const isSelected = selectedAppointment?.id === apt.id
													return (
														<button
															key={apt.id}
															type="button"
															className={cn(
																"flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent text-left",
																isSelected && "bg-accent"
															)}
															onClick={() => {
																setSelectedAppointment(apt)
																setAppointmentPopoverOpen(false)
																setAppointmentSearch("")
															}}
														>
															<Check
																className={cn(
																	"h-4 w-4 shrink-0 mt-0.5",
																	isSelected ? "opacity-100" : "opacity-0"
																)}
															/>
															<span className="min-w-0 flex-1">
																<span className="flex flex-wrap items-center gap-2">
																	<span className="font-medium truncate">{apt.name}</span>
																	<Badge variant="secondary" className={cn("text-[10px]", typeConfig.color)}>
																		{typeConfig.label}
																	</Badge>
																</span>
																{apt.location && (
																	<span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
																		<MapPin className="w-3 h-3" />
																		{apt.location}
																	</span>
																)}
															</span>
														</button>
													)
												})
											)}
										</div>
									</PopoverContent>
								</Popover>
								)}
							</div>

							{/* Time + category */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<div className="space-y-2">
									<Label>Start Time <span className="text-destructive">*</span></Label>
									<Input
										type="time"
										value={startTime}
										onChange={(e) => setStartTime(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>End Time <span className="text-destructive">*</span></Label>
									<Input
										type="time"
										value={endTime}
										onChange={(e) => setEndTime(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Type <span className="text-destructive">*</span></Label>
									<Select
										value={appointmentCategory}
										onValueChange={(v) => setAppointmentCategory(v as AppointmentCategory)}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="z-[70] bg-card text-card-foreground">
											<SelectItem value="INTERNAL">Internal</SelectItem>
											<SelectItem value="EXTERNAL">External</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							{/* Project Selection */}
							<div className="space-y-2">
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
										className="z-[60] flex w-[var(--radix-popover-trigger-width)] max-h-[min(20rem,calc(100vh-8rem))] flex-col overflow-hidden border-border bg-card p-0 text-card-foreground shadow-md"
										align="start"
										onWheel={(e) => e.stopPropagation()}
									>
										<div className="relative shrink-0 border-b border-border bg-card p-2">
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
											className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-card p-1 space-y-0.5"
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
								<div className="space-y-2">
									<Label>
										Booking Name {selectedProject === "none" && <span className="text-destructive">*</span>}
									</Label>
									<Input
										value={bookingName}
										onChange={(e) => setBookingName(e.target.value)}
										placeholder="Contact name"
									/>
								</div>
								<div className="space-y-2">
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
								<div className="space-y-2">
									<Label>
										Contact Number {selectedProject === "none" && <span className="text-destructive">*</span>}
									</Label>
									<Input
										value={contactNumber}
										onChange={(e) => setContactNumber(e.target.value)}
										placeholder="Phone number"
									/>
								</div>
								<div className="space-y-2">
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

							{/* Assign To — team members who should see this appointment */}
							<div className="space-y-2">
								<Label>Assign To</Label>
								<MultiSelectAdvisors
									users={teamMembers}
									selectedIds={assigneeIds}
									onChange={setAssigneeIds}
									currentUserId={userId}
									isAdmin
									placeholder="Select team members"
									searchPlaceholder="Search team members..."
								/>
							</div>

							{/* Purpose & Remarks */}
							<div className="space-y-2">
								<Label>Purpose</Label>
								<Textarea
									value={purpose}
									onChange={(e) => setPurpose(e.target.value)}
									placeholder="Purpose of the booking"
									rows={2}
								/>
							</div>
							<div className="space-y-2">
								<Label>Remarks</Label>
								<Textarea
									value={remarks}
									onChange={(e) => setRemarks(e.target.value)}
									placeholder="Additional notes"
									rows={2}
								/>
							</div>

							{/* Client emails — create only (stored on initial confirmation send) */}
							{!isEditMode && (
								<EmailListInput
									emails={clientEmails}
									onChange={setClientEmails}
									required
									label="Client Email Address"
								/>
							)}

							{isEditMode && clientEmails.some((e) => e.trim()) && (
								<EmailListInput
									emails={clientEmails}
									onChange={setClientEmails}
									disabled
									label="Client Email Address"
								/>
							)}

							{/* Reminders */}
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
										<div className="flex items-center justify-between gap-2">
											<p className="text-xs font-medium text-muted-foreground">
												Selected Reminders ({reminders.length})
											</p>
											<CopyClientEmailsToRemindersButton
												sourceEmails={clientEmails}
												sourceLabel="client email address"
												reminders={reminders}
												onRemindersChange={setReminders}
											/>
										</div>
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

							{/* Submit */}
							<div className="flex justify-end gap-2 pt-4 border-t">
								<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
									Cancel
								</Button>
								<Button onClick={handleSubmit} disabled={isSubmitting || isLoadingEdit}>
									{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
									{isEditMode ? "Save Changes" : "Book Appointment"}
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
					}
				}}
			>
				<DialogContent nested>
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

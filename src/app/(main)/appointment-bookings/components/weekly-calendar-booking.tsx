"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon, CheckCircle, XCircle } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { format, addDays, startOfWeek, addHours, startOfDay, isBefore, isSameDay, endOfWeek, subMinutes } from "date-fns"
import { cn } from "@/lib/utils"
import { useSession } from "@/app/(main)/contexts/SessionProvider"
import { createAppointmentBooking, getUserProjects, getAppointmentBookings, getProjectUsersEmails } from "@/app/(main)/appointment-bookings/actions"
import type { ProjectWithClient } from "@/app/(main)/appointment-bookings/types"
import { EmailListInput } from "./EmailListInput"
import { FieldOverwriteDialog } from "./FieldOverwriteDialog"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"

interface Appointment {
	id: number
	name: string
	location: string | null
	brand: string | null
	description: string | null
	appointmentType: string
	isAvailable: boolean
}

interface WeeklyCalendarBookingProps {
	appointment: Appointment
	initialDate: Date
	onClose: () => void
	onSuccess: () => void
}

interface BookingSlot {
	id: number
	startDate: Date
	endDate: Date
	bookedBy: string
}

export function WeeklyCalendarBooking({ appointment, initialDate, onClose, onSuccess }: WeeklyCalendarBookingProps) {
	const { enhancedUser } = useSession()
	const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(initialDate, { weekStartsOn: 1 }))
	const [selectedSlots, setSelectedSlots] = useState<{ start: Date; end: Date }[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [purpose, setPurpose] = useState("")
	const [attendees, setAttendees] = useState("")
	const [projects, setProjects] = useState<ProjectWithClient[]>([])
	const [selectedProject, setSelectedProject] = useState<string>("none")
	const [isLoadingProjects, setIsLoadingProjects] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [existingBookings, setExistingBookings] = useState<BookingSlot[]>([])
	const [isLoadingBookings, setIsLoadingBookings] = useState(false)
	const [calendarOpen, setCalendarOpen] = useState(false)
	const [clientEmails, setClientEmails] = useState<string[]>([""])
	const [showResultDialog, setShowResultDialog] = useState(false)
	const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null)
	const [reminders, setReminders] = useState<Array<{ offsetMinutes: number; recipientEmails: string[] }>>([])
	
	// New fields
	const [bookingName, setBookingName] = useState("")
	const [companyName, setCompanyName] = useState("")
	const [contactNumber, setContactNumber] = useState("")
	const [remarks, setRemarks] = useState("")
	
	// Overwrite dialog state
	const [showOverwriteDialog, setShowOverwriteDialog] = useState(false)
	const [pendingProjectSelection, setPendingProjectSelection] = useState<string | null>(null)

	useEffect(() => {
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
	}, [enhancedUser?.id])

	// Auto-fill fields when project is selected
	useEffect(() => {
		const handleProjectSelection = async () => {
			if (selectedProject && selectedProject !== "none") {
				const project = projects.find((p) => p.id.toString() === selectedProject)
				if (project?.Client) {
					// Check if fields are already filled - show overwrite dialog
					const hasFilledFields = bookingName.trim() || companyName.trim() || contactNumber.trim()
					
					if (hasFilledFields) {
						setPendingProjectSelection(selectedProject)
						setShowOverwriteDialog(true)
						return
					}

					// Auto-fill fields with project client info
					setBookingName(project.Client.name || "")
					setCompanyName(project.Client.company || project.Client.name || "")
					setContactNumber(project.Client.phone || "")

					// Auto-fill first email with project client email
					const projectClientEmail = project.Client.email || ""
					if (projectClientEmail) {
						setClientEmails([projectClientEmail])
					}

					// Fetch and add project users' emails
					try {
						const projectUserEmails = await getProjectUsersEmails(project.id)
						const allEmails = new Set([projectClientEmail, ...projectUserEmails].filter(Boolean))
						const allEmailsArray = Array.from(allEmails)
						setClientEmails(allEmailsArray)

						// Auto-add 24h reminder if no reminders exist, with all project emails
						if (reminders.length === 0) {
							setReminders([{ offsetMinutes: 24 * 60, recipientEmails: allEmailsArray.length > 0 ? allEmailsArray : [projectClientEmail].filter(Boolean) }])
						} else {
							// Update existing reminder emails with all project emails
							setReminders(prev => prev.map(r => ({
								...r,
								recipientEmails: r.recipientEmails.length > 0 ? r.recipientEmails : allEmailsArray.length > 0 ? allEmailsArray : [projectClientEmail].filter(Boolean)
							})))
						}
					} catch (error) {
						console.error("Error fetching project users emails:", error)
					}
				}
			} else {
				// Reset fields when no project selected
				setBookingName("")
				setCompanyName("")
				setContactNumber("")
				setClientEmails([""])
				setReminders([]) // Clear reminders when no project
			}
		}

		handleProjectSelection()
	}, [selectedProject, projects])

	// Fetch bookings when week changes
	useEffect(() => {
		const fetchBookings = async () => {
			if (appointment.id) {
				setIsLoadingBookings(true)
				const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
				const bookings = await getAppointmentBookings(
					appointment.id,
					currentWeekStart,
					weekEnd
				)
				setExistingBookings(bookings.map(b => ({
					...b,
					startDate: new Date(b.startDate),
					endDate: new Date(b.endDate),
				})))
				setIsLoadingBookings(false)
			}
		}
		fetchBookings()
	}, [appointment.id, currentWeekStart])

	const userName = enhancedUser.profile 
		? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim() 
		: enhancedUser.email || 'Unknown User'

	const generateWeekDays = () => {
		const days = []
		for (let i = 0; i < 7; i++) {
			days.push(addDays(currentWeekStart, i))
		}
		return days
	}

	const generateTimeSlots = () => {
		const slots = []
		// Generate slots from 8 AM to 10 PM (14 hours)
		for (let i = 0; i < 14; i++) {
			slots.push(8 + i)
		}
		return slots
	}

	const weekDays = generateWeekDays()
	const timeSlots = generateTimeSlots()

	const isSlotSelected = (day: Date, hour: number) => {
		const slotStart = addHours(startOfDay(day), hour)
		return selectedSlots.some(slot => slot.start.getTime() === slotStart.getTime())
	}

	const isSlotPast = (day: Date, hour: number) => {
		const slotStart = addHours(startOfDay(day), hour)
		return isBefore(slotStart, new Date())
	}

	const isSlotBooked = (day: Date, hour: number) => {
		const slotStart = addHours(startOfDay(day), hour)
		const slotEnd = addHours(slotStart, 1)
		
		return existingBookings.some(booking => {
			const bookingStart = new Date(booking.startDate)
			const bookingEnd = new Date(booking.endDate)
			// Check if slot overlaps with booking
			return slotStart < bookingEnd && slotEnd > bookingStart
		})
	}

	const getSlotBookingOwner = (day: Date, hour: number): string | null => {
		const slotStart = addHours(startOfDay(day), hour)
		const slotEnd = addHours(slotStart, 1)
		
		const booking = existingBookings.find(booking => {
			const bookingStart = new Date(booking.startDate)
			const bookingEnd = new Date(booking.endDate)
			// Check if slot overlaps with booking
			return slotStart < bookingEnd && slotEnd > bookingStart
		})
		
		return booking ? booking.bookedBy : null
	}

	const isSlotBookedByUser = (day: Date, hour: number) => {
		const owner = getSlotBookingOwner(day, hour)
		return owner === userName
	}

	const toggleSlot = (day: Date, hour: number) => {
		const slotStart = addHours(startOfDay(day), hour)
		const slotEnd = addHours(slotStart, 1)

		if (isSlotPast(day, hour) || isSlotBooked(day, hour)) return

		setSelectedSlots(prev => {
			const exists = prev.some(slot => slot.start.getTime() === slotStart.getTime())
			if (exists) {
				return prev.filter(slot => slot.start.getTime() !== slotStart.getTime())
			} else {
				return [...prev, { start: slotStart, end: slotEnd }]
			}
		})
	}

	const groupConsecutiveSlots = (slots: { start: Date; end: Date }[]) => {
		if (slots.length === 0) return []
		
		const sortedSlots = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime())
		const groups: { start: Date; end: Date }[][] = []
		let currentGroup: { start: Date; end: Date }[] = [sortedSlots[0]]
		
		for (let i = 1; i < sortedSlots.length; i++) {
			const currentSlot = sortedSlots[i]
			const lastSlotInGroup = currentGroup[currentGroup.length - 1]
			
			if (currentSlot.start.getTime() === lastSlotInGroup.end.getTime()) {
				currentGroup.push(currentSlot)
			} else {
				groups.push([...currentGroup])
				currentGroup = [currentSlot]
			}
		}
		
		groups.push(currentGroup)
		return groups
	}

	const handleOverwriteAccept = () => {
		if (pendingProjectSelection) {
			const project = projects.find((p) => p.id.toString() === pendingProjectSelection)
			if (project?.Client) {
				setBookingName(project.Client.name || "")
				setCompanyName(project.Client.company || project.Client.name || "")
				setContactNumber(project.Client.phone || "")

				const projectClientEmail = project.Client.email || ""
				if (projectClientEmail) {
					setClientEmails([projectClientEmail])
				}

				// Fetch and add project users' emails
				getProjectUsersEmails(project.id).then((projectUserEmails) => {
					const allEmails = new Set([projectClientEmail, ...projectUserEmails].filter(Boolean))
					const allEmailsArray = Array.from(allEmails)
					setClientEmails(allEmailsArray)

					// Auto-add 24h reminder if no reminders exist, with all project emails
					if (reminders.length === 0) {
						setReminders([{ offsetMinutes: 24 * 60, recipientEmails: allEmailsArray.length > 0 ? allEmailsArray : [projectClientEmail].filter(Boolean) }])
					} else {
						// Update existing reminder emails with all project emails
						setReminders(prev => prev.map(r => ({
							...r,
							recipientEmails: r.recipientEmails.length > 0 ? r.recipientEmails : allEmailsArray.length > 0 ? allEmailsArray : [projectClientEmail].filter(Boolean)
						})))
					}
				}).catch((error) => {
					console.error("Error fetching project users emails:", error)
				})
			}
		}
		setShowOverwriteDialog(false)
		setPendingProjectSelection(null)
	}

	const handleOverwriteCancel = () => {
		setShowOverwriteDialog(false)
		setPendingProjectSelection(null)
		// Revert project selection
		setSelectedProject("none")
	}

	const handleSubmit = async () => {
		if (selectedSlots.length === 0) return

		// Validation: If no project, require bookingName, companyName, contactNumber
		if (!selectedProject || selectedProject === "none") {
			if (!bookingName.trim()) {
				setError("Booking name is required when no project is selected")
				return
			}
			if (!companyName.trim()) {
				setError("Company name is required when no project is selected")
				return
			}
			if (!contactNumber.trim()) {
				setError("Contact number is required when no project is selected")
				return
			}
		}

		// Validation: Email is always required
		const validEmails = clientEmails.filter(email => {
			const trimmed = email.trim()
			if (!trimmed) return false
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			return emailRegex.test(trimmed)
		})

		if (validEmails.length === 0) {
			setError("At least one valid email address is required")
			return
		}

		setIsSubmitting(true)
		setError(null)

		try {
			const slotGroups = groupConsecutiveSlots(selectedSlots)
			let totalEmailSentCount = 0
			let totalEmailFailedCount = 0
			let uniqueRecipientCount = validEmails.length // Will be updated from first result

			// Validate reminders: at least one required if project is selected
			if (selectedProject && selectedProject !== "none") {
				if (reminders.length === 0) {
					setError("At least one reminder is required when a project is selected")
					setIsSubmitting(false)
					return
				}

			// Validate all reminders have at least one valid email
			const invalidReminders = reminders.filter(r => {
				if (!r.recipientEmails || r.recipientEmails.length === 0) return true
				const validEmails = r.recipientEmails.filter(email => {
					const trimmed = email.trim()
					return trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
				})
				return validEmails.length === 0
			})
			if (invalidReminders.length > 0) {
				setError("All reminders must have at least one valid email address")
				setIsSubmitting(false)
				return
			}

				// Validate for duplicates
				const reminderOffsets = reminders.map(r => r.offsetMinutes)
				const uniqueOffsets = new Set(reminderOffsets)
				if (uniqueOffsets.size !== reminderOffsets.length) {
					setError("You cannot add multiple reminders for the same time. Please remove duplicates.")
					setIsSubmitting(false)
					return
				}
			}

			for (const group of slotGroups) {
				const formData = new FormData()

				formData.append("bookedBy", userName)
				formData.append("startDate", group[0].start.toISOString())
				formData.append("endDate", group[group.length - 1].end.toISOString())
				formData.append("purpose", purpose)
				formData.append("appointmentType", appointment.appointmentType)
				formData.append("appointmentId", appointment.id.toString())

				if (selectedProject && selectedProject !== "none") {
					formData.append("projectId", selectedProject)
				}
				if (attendees) {
					formData.append("attendees", attendees)
				}

				// New fields
				formData.append("bookingName", bookingName)
				formData.append("companyName", companyName)
				formData.append("contactNumber", contactNumber)
				formData.append("remarks", remarks)
				
				// Multiple emails (always required)
				formData.append("clientEmails", JSON.stringify(validEmails))

				// Reminders are required when project is selected
				if (selectedProject && selectedProject !== "none") {
					formData.append("reminderOffsets", JSON.stringify(reminders))
				} else if (reminders.length > 0) {
					formData.append("reminderOffsets", JSON.stringify(reminders))
				}

				const result = await createAppointmentBooking(formData)

				if (!result.success) {
					setError(result.error || "Failed to create appointment")
					setIsSubmitting(false)
					return
				}

				// Track email sending results (for error reporting)
				if (result.emailSentCount) {
					totalEmailSentCount += result.emailSentCount
				}
				if (result.emailFailedCount) {
					totalEmailFailedCount += result.emailFailedCount
				}

				// Get unique recipient count from first result (accounts for project users added server-side)
				if (result.uniqueRecipientCount && uniqueRecipientCount === validEmails.length) {
					uniqueRecipientCount = result.uniqueRecipientCount
				}
			}

			// Show dialog for email results
			if (totalEmailSentCount > 0 && totalEmailFailedCount === 0) {
				setEmailResult({
					success: true,
					message: `Appointment confirmation emails sent successfully to ${uniqueRecipientCount} recipient${uniqueRecipientCount !== 1 ? 's' : ''}`,
				})
				setShowResultDialog(true)
			} else if (totalEmailFailedCount > 0) {
				setEmailResult({
					success: false,
					message: `Failed to send confirmation emails to ${totalEmailFailedCount} recipient${totalEmailFailedCount !== 1 ? 's' : ''}. ${totalEmailSentCount > 0 ? `${uniqueRecipientCount} email${uniqueRecipientCount !== 1 ? 's' : ''} sent successfully.` : ''}`,
				})
				setShowResultDialog(true)
			} else {
				// No email results, proceed normally
				onSuccess()
			}
		} catch (error) {
			console.error("Failed to create appointments:", error)
			setError("An unexpected error occurred. Please try again.")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="space-y-4">
			{error && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-md">
					<p className="text-sm text-red-800">{error}</p>
				</div>
			)}

			{/* Week Navigation */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
				>
					<ChevronLeft className="w-4 h-4" />
					Previous Week
				</Button>
				
				<div className="flex items-center gap-2">
					<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className="justify-start text-left font-normal min-w-[240px]"
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								{format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={currentWeekStart}
								onSelect={(date) => {
									if (date) {
										setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }))
										setCalendarOpen(false)
									}
								}}
								initialFocus
							/>
						</PopoverContent>
					</Popover>
					
					<Button
						variant="outline"
						size="sm"
						onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
					>
						Today
					</Button>
				</div>
				
				<Button
					variant="outline"
					size="sm"
					onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
				>
					Next Week
					<ChevronRight className="w-4 h-4" />
				</Button>
			</div>

			{/* Legend */}
			<div className="flex items-center gap-4 text-xs bg-gray-50 p-3 rounded-md border flex-wrap">
				{isLoadingBookings && (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="w-3 h-3 animate-spin" />
						<span>Loading bookings...</span>
					</div>
				)}
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-primary rounded"></div>
					<span>Selected</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-[var(--color-chart-3)] rounded"></div>
					<span>Your Booking</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-red-500 rounded"></div>
					<span>Booked by Others</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded opacity-60"></div>
					<span>Past</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-white border-2 border-gray-400 rounded"></div>
					<span>Available</span>
				</div>
			</div>

			{/* Weekly Calendar Grid */}
			<div className="border rounded-lg overflow-x-auto">
				<div className="min-w-full">
					{/* Header - Days of Week */}
					<div className="grid grid-cols-8 border-b">
						<div className="p-3 text-sm font-medium text-center border-r">Time</div>
						{weekDays.map((day, idx) => (
							<div
								key={idx}
								className={cn(
									"p-3 text-sm font-medium text-center border-r last:border-r-0",
									isSameDay(day, new Date()) && "bg-primary/10"
								)}
							>
								<div>{format(day, "EEE")}</div>
								<div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
							</div>
						))}
					</div>

					{/* Time Slots */}
					{timeSlots.map((hour) => (
						<div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
							<div className="p-3 text-xs text-center border-r font-medium bg-gray-50">
								{`${hour}:00`}
							</div>
							{weekDays.map((day, idx) => {
								const isSelected = isSlotSelected(day, hour)
								const isPast = isSlotPast(day, hour)
								const isBooked = isSlotBooked(day, hour)
								const isBookedByUser = isSlotBookedByUser(day, hour)

								return (
									<button
										key={idx}
										type="button"
										disabled={isPast || isBooked}
										onClick={() => toggleSlot(day, hour)}
										className={cn(
											"p-3 text-xs border-r last:border-r-0 transition-colors min-h-[40px]",
											isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
											!isSelected && !isPast && !isBooked && "hover:bg-muted bg-white border-2 border-gray-400",
											isPast && "opacity-60 cursor-not-allowed bg-gray-300 border border-gray-400",
											isBookedByUser && "bg-[var(--color-chart-3)] text-primary-foreground cursor-not-allowed",
											isBooked && !isBookedByUser && "bg-destructive cursor-not-allowed opacity-80"
										)}
										title={
											isBookedByUser 
												? `Booked by you (${getSlotBookingOwner(day, hour)})`
												: isBooked 
													? `Booked by ${getSlotBookingOwner(day, hour)}`
													: isPast
														? "Past time slot"
														: "Available"
										}
									>
										{isSelected && "✓"}
									</button>
								)
							})}
						</div>
					))}
				</div>
			</div>

			{/* Booking Details Form */}
			{selectedSlots.length > 0 && (
				<div className="space-y-4 border-t pt-4">
					<div className="text-sm font-medium">
						{selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} selected
					</div>

					<div className="space-y-2">
						<Label htmlFor="project">Project (Optional)</Label>
						{isLoadingProjects ? (
							<div className="text-sm text-muted-foreground">Loading projects...</div>
						) : projects.length > 0 ? (
							<Select value={selectedProject} onValueChange={setSelectedProject}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a project (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									{projects.map((project) => (
										<SelectItem key={project.id} value={project.id.toString()}>
											{project.name}{project.clientName ? ` (${project.clientName})` : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<div className="text-sm text-muted-foreground">No projects available</div>
						)}
					</div>

					{/* New fields - conditional required */}
					{(!selectedProject || selectedProject === "none") && (
						<>
							<div className="space-y-2">
								<Label htmlFor="bookingName">
									Booking Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="bookingName"
									type="text"
									value={bookingName}
									onChange={(e) => setBookingName(e.target.value)}
									placeholder="Enter booking name"
									required={!selectedProject || selectedProject === "none"}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="companyName">
									Company Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="companyName"
									type="text"
									value={companyName}
									onChange={(e) => setCompanyName(e.target.value)}
									placeholder="Enter company name"
									required={!selectedProject || selectedProject === "none"}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="contactNumber">
									Contact Number <span className="text-destructive">*</span>
								</Label>
								<Input
									id="contactNumber"
									type="tel"
									value={contactNumber}
									onChange={(e) => setContactNumber(e.target.value)}
									placeholder="Enter contact number"
									required={!selectedProject || selectedProject === "none"}
								/>
							</div>
						</>
					)}

					{/* Show fields even when project selected (read-only, showing project client info) */}
					{selectedProject && selectedProject !== "none" && (
						<>
							<div className="space-y-2">
								<Label htmlFor="bookingName">Booking Name</Label>
								<Input
									id="bookingName"
									type="text"
									value={bookingName}
									onChange={(e) => setBookingName(e.target.value)}
									placeholder="Auto-filled from project"
									readOnly
									className="bg-muted"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="companyName">Company Name</Label>
								<Input
									id="companyName"
									type="text"
									value={companyName}
									onChange={(e) => setCompanyName(e.target.value)}
									placeholder="Auto-filled from project"
									readOnly
									className="bg-muted"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="contactNumber">Contact Number</Label>
								<Input
									id="contactNumber"
									type="tel"
									value={contactNumber}
									onChange={(e) => setContactNumber(e.target.value)}
									placeholder="Auto-filled from project"
									readOnly
									className="bg-muted"
								/>
							</div>
						</>
					)}

					<div className="space-y-2">
						<Label htmlFor="attendees">Number of Attendees (Optional)</Label>
						<Input
							id="attendees"
							type="number"
							value={attendees}
							onChange={(e) => setAttendees(e.target.value)}
							min="1"
							placeholder="Number of attendees"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="purpose">Purpose</Label>
						<Textarea
							id="purpose"
							value={purpose}
							onChange={(e) => setPurpose(e.target.value)}
							placeholder="What is this appointment for?"
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="remarks">Remarks (Optional)</Label>
						<Textarea
							id="remarks"
							value={remarks}
							onChange={(e) => setRemarks(e.target.value)}
							placeholder="Any additional remarks or notes"
							rows={2}
						/>
					</div>

					{/* Email addresses - always required */}
					<EmailListInput
						emails={clientEmails}
						onChange={setClientEmails}
						required
					/>

					{/* Reminder Settings - Only show if project is selected */}
					{selectedProject && selectedProject !== "none" && selectedSlots.length > 0 && (
						<div className="space-y-3 border-t pt-4">
							<Label>
								Automated Reminders <span className="text-destructive">*</span>
							</Label>
							<p className="text-xs text-muted-foreground">
								Set up reminder emails to be sent before the appointment starts. At least one reminder is required.
							</p>
							<div className="space-y-3 max-h-64 overflow-y-auto">
								{/* Quick select buttons */}
								<div className="flex flex-wrap gap-2">
									{[1, 2, 6, 12, 24, 48].map((hours) => {
										const minutes = hours === 48 ? 2880 : hours * 60
										const isSelected = reminders.some(r => r.offsetMinutes === minutes)
										const appointmentStart = selectedSlots.length > 0 ? selectedSlots[0].start : new Date()
										const reminderTime = subMinutes(appointmentStart, minutes)
										
										return (
											<Button
												key={minutes}
												type="button"
												variant={isSelected ? "default" : "outline"}
												size="sm"
												onClick={() => {
													if (isSelected) {
														setReminders(reminders.filter(r => r.offsetMinutes !== minutes))
													} else {
														// Check if this reminder time already exists
														if (reminders.some(r => r.offsetMinutes === minutes)) {
															return // Already exists, don't add
														}
														// Use all emails from clientEmails (which includes all project emails)
														const defaultEmails = clientEmails.filter(e => e.trim())
														setReminders([...reminders, { offsetMinutes: minutes, recipientEmails: defaultEmails.length > 0 ? defaultEmails : [""] }])
													}
												}}
												className="text-xs"
											>
												{hours === 48 ? "2 days" : `${hours}h`} before
												{isSelected && (
													<span className="ml-1 text-xs opacity-70">
														({format(reminderTime, "MMM d, h:mm a")})
													</span>
												)}
											</Button>
										)
									})}
								</div>

								{/* Selected reminders list with email inputs */}
								{reminders.length > 0 && (
									<div className="space-y-2 border rounded-lg p-3 bg-gray-50">
										<p className="text-xs font-medium text-muted-foreground mb-2">
											Selected Reminders ({reminders.length})
										</p>
										{reminders
											.sort((a, b) => b.offsetMinutes - a.offsetMinutes)
											.map((reminder, index) => {
												const hours = reminder.offsetMinutes / 60
												const appointmentStart = selectedSlots.length > 0 ? selectedSlots[0].start : new Date()
												const reminderTime = subMinutes(appointmentStart, reminder.offsetMinutes)
												const reminderText = hours === 48 
													? "48 hours (2 days)"
													: hours === 1
													? "1 hour"
													: `${hours} hours`

												return (
													<div key={`${reminder.offsetMinutes}-${index}`} className="space-y-1.5 p-2 bg-white rounded border">
														<div className="flex items-center justify-between">
															<div className="flex-1">
																<p className="text-sm font-medium">
																	{reminderText} before
																</p>
																<p className="text-xs text-muted-foreground">
																	Will send at: {format(reminderTime, "MMM d, yyyy 'at' h:mm a")}
																</p>
															</div>
															<Button
																type="button"
																variant="ghost"
																size="sm"
																onClick={() => {
																	setReminders(reminders.filter((_, i) => i !== index))
																}}
																className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
															>
																×
															</Button>
														</div>
														<EmailListInput
															emails={reminder.recipientEmails}
															onChange={(emails) => {
																const updated = [...reminders]
																updated[index].recipientEmails = emails
																setReminders(updated)
															}}
															required
															className="mt-2"
														/>
													</div>
												)
											})}
									</div>
								)}
							</div>
						</div>
					)}

					<div className="flex gap-2">
						<Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Creating...
								</>
							) : (
								`Book Appointment`
							)}
						</Button>
						<Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{/* Field Overwrite Dialog */}
			{pendingProjectSelection && (
				<FieldOverwriteDialog
					isOpen={showOverwriteDialog}
					onClose={handleOverwriteCancel}
					onAccept={handleOverwriteAccept}
					fieldsToOverwrite={{
						bookingName: bookingName.trim() || undefined,
						companyName: companyName.trim() || undefined,
						contactNumber: contactNumber.trim() || undefined,
					}}
					projectClientName={projects.find((p) => p.id.toString() === pendingProjectSelection)?.Client?.name || "Project Client"}
				/>
			)}

			{/* Email Result Dialog */}
			<Dialog open={showResultDialog} onOpenChange={(open) => {
				if (!open) {
					setShowResultDialog(false)
					setEmailResult(null)
					onSuccess()
				}
			}}>
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
						<DialogDescription>
							{emailResult?.message}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button onClick={() => {
							setShowResultDialog(false)
							setEmailResult(null)
							onSuccess()
						}}>
							OK
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

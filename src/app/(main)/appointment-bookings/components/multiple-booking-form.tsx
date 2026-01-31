"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createAppointmentBooking, getUserProjects, getProjectUsersEmails } from "@/app/(main)/appointment-bookings/actions"
import { APPOINTMENT_TYPES } from "@/app/(main)/calander/constants"
import { EmailListInput } from "./EmailListInput"
import { FieldOverwriteDialog } from "./FieldOverwriteDialog"
import { format, subMinutes } from "date-fns"
import { useSession } from "@/app/(main)/contexts/SessionProvider"
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

interface Project {
	id: number
	name: string
	clientName: string
	status: string
	Client?: {
		id: string
		name: string
		email: string
		phone: string | null
		company: string | null
	}
}

interface MultipleBookingFormProps {
	item: Appointment
	slots: { start: Date; end: Date }[]
	onClose: () => void
	onSuccess?: () => void
}

export function MultipleBookingForm({ item, slots, onClose, onSuccess }: MultipleBookingFormProps) {
	const { enhancedUser } = useSession()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [purpose, setPurpose] = useState("")
	const [attendees, setAttendees] = useState("")
	const [projects, setProjects] = useState<Project[]>([])
	const [selectedProject, setSelectedProject] = useState<string>("")
	const [appointmentType, setAppointmentType] = useState<string>("OTHERS")
	const [isLoadingProjects, setIsLoadingProjects] = useState(true)
	const [error, setError] = useState<string | null>(null)
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

	// Fetch user's accessible projects
	useEffect(() => {
		const fetchProjects = async () => {
			if (enhancedUser?.id) {
				setIsLoadingProjects(true)
				const userProjects = await getUserProjects(enhancedUser.id)
				setProjects(userProjects as Project[])
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
			if (selectedProject && selectedProject !== "") {
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

  // Get user name from session
  const userName = enhancedUser.profile 
    ? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim() 
    : enhancedUser.email || 'Unknown User'

  // Function to group consecutive slots
  const groupConsecutiveSlots = (slots: { start: Date; end: Date }[]) => {
    if (slots.length === 0) return []
    
    // Sort slots by start time
    const sortedSlots = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime())
    const groups: { start: Date; end: Date }[][] = []
    let currentGroup: { start: Date; end: Date }[] = [sortedSlots[0]]
    
    for (let i = 1; i < sortedSlots.length; i++) {
      const currentSlot = sortedSlots[i]
      const lastSlotInGroup = currentGroup[currentGroup.length - 1]
      
      // Check if current slot is consecutive (starts when the previous one ends)
      if (currentSlot.start.getTime() === lastSlotInGroup.end.getTime()) {
        currentGroup.push(currentSlot)
      } else {
        // Start a new group
        groups.push([...currentGroup])
        currentGroup = [currentSlot]
      }
    }
    
    // Add the last group
    groups.push(currentGroup)
    
    return groups
  }

  // Group consecutive slots
  const slotGroups = groupConsecutiveSlots(slots)
  
  // Calculate total duration for display
  const totalDuration = slots.length * 60 // minutes
  const totalHours = Math.floor(totalDuration / 60)
  const remainingMinutes = totalDuration % 60
  const durationText = totalHours > 0 
    ? `${totalHours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`.trim()
    : `${remainingMinutes}m`

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
					setClientEmails(Array.from(allEmails))
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
		setSelectedProject("")
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		// Validation: If no project, require bookingName, companyName, contactNumber
		if (!selectedProject || selectedProject === "") {
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

		// Validate reminders: at least one required if project is selected
		if (selectedProject && selectedProject !== "") {
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

		setIsSubmitting(true)
		setError(null)

		try {
			// Create bookings for each group of consecutive slots
			let totalEmailSentCount = 0
			let totalEmailFailedCount = 0
			let uniqueRecipientCount = validEmails.length // Will be updated from first result

			for (const group of slotGroups) {
				const formData = new FormData()

				formData.append("appointmentId", item.id.toString())
				formData.append("attendees", attendees || "1")
				
				// Add project ID
				if (selectedProject) {
					formData.append("projectId", selectedProject)
				}

				formData.append("bookedBy", userName)
				// Send dates preserving local time (avoid timezone conversion)
				const startDateTime = group[0].start
				const endDateTime = group[group.length - 1].end
				formData.append("startDate", `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, '0')}-${String(startDateTime.getDate()).padStart(2, '0')}T${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}:${String(startDateTime.getSeconds()).padStart(2, '0')}`)
				formData.append("endDate", `${endDateTime.getFullYear()}-${String(endDateTime.getMonth() + 1).padStart(2, '0')}-${String(endDateTime.getDate()).padStart(2, '0')}T${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}:${String(endDateTime.getSeconds()).padStart(2, '0')}`)
				formData.append("purpose", purpose)
				formData.append("appointmentType", appointmentType)

				// New fields
				formData.append("bookingName", bookingName)
				formData.append("companyName", companyName)
				formData.append("contactNumber", contactNumber)
				formData.append("remarks", remarks)
				
				// Multiple emails (always required)
				formData.append("clientEmails", JSON.stringify(validEmails))

				// Reminders are required when project is selected
				if (selectedProject && selectedProject !== "") {
					formData.append("reminderOffsets", JSON.stringify(reminders))
				} else if (reminders.length > 0) {
					formData.append("reminderOffsets", JSON.stringify(reminders))
				}

				const result = await createAppointmentBooking(formData)

				// Check if booking creation failed
				if (!result.success) {
					setError(result.error || "Failed to create booking")
					setIsSubmitting(false)
					return
				}

				// Track email sending results
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
				onSuccess?.()
				onClose()
			}
		} catch (error) {
			console.error("Failed to create bookings:", error)
			setError("An unexpected error occurred. Please try again.")
		} finally {
			setIsSubmitting(false)
		}
	}

  return (
    <div className="w-full max-w-md border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          Book Appointment: {item.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {slots.length} slot{slots.length > 1 ? 's' : ''} selected ({durationText}) - {slotGroups.length} booking{slotGroups.length > 1 ? 's' : ''} will be created
        </p>
      </div>

			<form onSubmit={handleSubmit} className="space-y-4">
				{error && (
					<div className="p-3 bg-red-50 border border-red-200 rounded-md">
						<p className="text-sm text-red-800">{error}</p>
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="bookedBy">Booked By</Label>
					<Input
						id="bookedBy"
						value={userName}
						disabled
						className="bg-gray-50"
					/>
				</div>

				{/* Appointment Type selector */}
				<div className="space-y-2">
					<Label htmlFor="appointmentType">Appointment Type</Label>
					<Select value={appointmentType} onValueChange={setAppointmentType}>
						<SelectTrigger className="w-full bg-background border-2 border-accent">
							<SelectValue placeholder="Select appointment type" />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(APPOINTMENT_TYPES).map(([key, config]) => (
								<SelectItem key={key} value={key}>
									{config.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Project dropdown */}
				<div className="space-y-2">
					<Label htmlFor="project">Project (Optional)</Label>
					{isLoadingProjects ? (
						<div className="text-sm text-muted-foreground">Loading projects...</div>
					) : projects.length > 0 ? (
						<Select value={selectedProject} onValueChange={setSelectedProject}>
							<SelectTrigger className="w-full bg-background border-2 border-accent">
								<SelectValue placeholder="Select a project (optional)" />
							</SelectTrigger>
							<SelectContent>
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
				{(!selectedProject || selectedProject === "") && (
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
								required={!selectedProject || selectedProject === ""}
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
								required={!selectedProject || selectedProject === ""}
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
								required={!selectedProject || selectedProject === ""}
							/>
						</div>
					</>
				)}

				{/* Show fields even when project selected (read-only, showing project client info) */}
				{selectedProject && selectedProject !== "" && (
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
					<Label htmlFor="purpose">Purpose</Label>
					<Textarea
						id="purpose"
						value={purpose}
						onChange={(e) => setPurpose(e.target.value)}
						placeholder="What will this be used for?"
						rows={3}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="attendees">Number of Attendees</Label>
					<Input
						id="attendees"
						type="number"
						value={attendees}
						onChange={(e) => setAttendees(e.target.value)}
						required
						min="1"
						placeholder="Number of attendees"
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
					{selectedProject && selectedProject !== "" && slots.length > 0 && (
						<div className="space-y-3 border-t pt-4">
							<Label>Automated Reminders (Optional)</Label>
							<p className="text-xs text-muted-foreground">
								Set up reminder emails to be sent before the appointment starts
							</p>
							<div className="space-y-3 max-h-64 overflow-y-auto">
								{/* Quick select buttons */}
								<div className="flex flex-wrap gap-2">
									{[1, 2, 6, 12, 24, 48].map((hours) => {
										const minutes = hours === 48 ? 2880 : hours * 60
										const isSelected = reminders.some(r => r.offsetMinutes === minutes)
										const appointmentStart = slots.length > 0 ? slots[0].start : new Date()
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
												const appointmentStart = slots.length > 0 ? slots[0].start : new Date()
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

				<div className="space-y-2">
					<Label>Selected Time Slots</Label>
					<div className="max-h-32 overflow-y-auto space-y-1">
						{slotGroups.map((group, groupIndex) => (
							<div key={groupIndex} className="space-y-1">
								{group.length > 1 && (
									<div className="text-xs text-blue-600 font-medium">
										Group {groupIndex + 1} (Combined)
									</div>
								)}
								{group.map((slot, slotIndex) => (
									<div key={`${groupIndex}-${slotIndex}`} className="text-sm bg-muted p-2 rounded">
										{format(slot.start, "HH:mm")} - {format(slot.end, "HH:mm")}
									</div>
								))}
							</div>
						))}
					</div>
				</div>

				<div className="flex gap-2 pt-4">
					<Button type="submit" disabled={isSubmitting} className="flex-1">
						{isSubmitting ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Creating...
							</>
						) : (
							`Create ${slotGroups.length} Booking${slotGroups.length > 1 ? 's' : ''}`
						)}
					</Button>
					<Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
						Cancel
					</Button>
				</div>
			</form>

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
					onSuccess?.()
					onClose()
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
							onSuccess?.()
							onClose()
						}}>
							OK
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
    </div>
  )
}

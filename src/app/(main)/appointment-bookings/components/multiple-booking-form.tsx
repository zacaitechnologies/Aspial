"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createAppointmentBooking, getUserProjects } from "@/app/(main)/appointment-bookings/actions"
import { APPOINTMENT_TYPES } from "@/app/(main)/calander/constants"
import { format } from "date-fns"
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
	const [notifyClient, setNotifyClient] = useState(false)
	const [clientEmail, setClientEmail] = useState("")
	const [showResultDialog, setShowResultDialog] = useState(false)
	const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null)
	const [reminders, setReminders] = useState<Array<{ offsetMinutes: number; recipientEmail: string }>>([]) // Store reminders with emails

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

	// Auto-fill email when project is selected
	useEffect(() => {
		if (selectedProject && selectedProject !== "") {
			const project = projects.find((p: any) => p.id.toString() === selectedProject)
			if (project?.Client?.email) {
				setClientEmail(project.Client.email)
			}
		} else {
			setClientEmail("")
		}
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		// Validate email if notify client is checked
		if (notifyClient) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			if (!clientEmail || !emailRegex.test(clientEmail)) {
				setError("Please enter a valid email address to notify the client")
				return
			}
		}

		// Validate reminders for duplicates before submitting
		if (reminders.length > 0) {
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
			let emailSentCount = 0
			let emailFailedCount = 0

			for (const group of slotGroups) {
				const formData = new FormData()

				formData.append("appointmentId", item.id.toString())
				formData.append("attendees", attendees || "1")
				
				// Add project ID
					if (selectedProject) {
						formData.append("projectId", selectedProject)
				}

				formData.append("bookedBy", userName)
				// Use the start time of the first slot and end time of the last slot
				formData.append("startDate", group[0].start.toISOString())
				formData.append("endDate", group[group.length - 1].end.toISOString())
				formData.append("purpose", purpose)
				formData.append("appointmentType", appointmentType)

				if (notifyClient) {
					formData.append("notifyClient", "true")
					formData.append("clientEmail", clientEmail)
				}
				if (reminders.length > 0) {
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
				if (notifyClient) {
					if (result.emailSent) {
						emailSentCount++
					} else if (result.emailError) {
						emailFailedCount++
					}
				}
			}

			// Show dialog for email results
			if (notifyClient) {
				if (emailSentCount > 0 && emailFailedCount === 0) {
					setEmailResult({
						success: true,
						message: `Appointment confirmation email sent successfully to ${clientEmail}`,
					})
					setShowResultDialog(true)
				} else if (emailFailedCount > 0) {
					setEmailResult({
						success: false,
						message: `Could not send confirmation email to ${clientEmail}. Please check if the email address is correct.`,
					})
					setShowResultDialog(true)
				} else {
					// No email results, proceed normally
					onSuccess?.()
					onClose()
				}
			} else {
				// No email notification, proceed normally
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
						<SelectTrigger className="w-full bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
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
								<SelectTrigger className="w-full bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
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
						<div className="flex items-center space-x-2">
							<Checkbox
								id="notifyClient"
								checked={notifyClient}
								onCheckedChange={(checked) => setNotifyClient(checked === true)}
							/>
							<Label htmlFor="notifyClient" className="cursor-pointer">
								Notify client via email
							</Label>
						</div>
					</div>

					{notifyClient && (
						<div className="space-y-2">
							<Label htmlFor="clientEmail">
								Client Email <span className="text-red-500">*</span>
							</Label>
							<Input
								id="clientEmail"
								type="email"
								value={clientEmail}
								onChange={(e) => setClientEmail(e.target.value)}
								placeholder="client@example.com"
								required={notifyClient}
								className={!clientEmail ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
							/>
							{!clientEmail && (
								<p className="text-xs text-red-500 font-medium">
									⚠ Email is required to notify the client
								</p>
							)}
							{clientEmail && (
								<p className="text-xs text-muted-foreground">
									{selectedProject && selectedProject !== ""
										? "Email auto-filled from project client. You can edit it if needed."
										: "Enter the client's email address to send confirmation."}
								</p>
							)}
						</div>
					)}

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
														const project = projects.find(p => p.id.toString() === selectedProject)
														const defaultEmail = project?.Client?.email || clientEmail || ""
														setReminders([...reminders, { offsetMinutes: minutes, recipientEmail: defaultEmail }])
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
														<Input
															type="email"
															value={reminder.recipientEmail}
															onChange={(e) => {
																const updated = [...reminders]
																updated[index].recipientEmail = e.target.value
																setReminders(updated)
															}}
															placeholder="Email address"
															className="h-8 text-xs"
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

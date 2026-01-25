"use client"

import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Loader2, Bell, Trash2, Edit2, Check, X } from "lucide-react"
import { getRemindersForBooking, updateBookingReminders, getAppointmentBookingWithDetails, deleteReminder, updateReminderEmail, getProjectUsersEmails } from "../actions"
import { format, subMinutes, isPast as isDatePast } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { EmailListInput } from "./EmailListInput"

interface EditAppointmentRemindersDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	appointmentBookingId: number
	onSuccess?: () => void
}

export default function EditAppointmentRemindersDialog({
	isOpen,
	onOpenChange,
	appointmentBookingId,
	onSuccess,
}: EditAppointmentRemindersDialogProps) {
	const [isLoading, setIsLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [allReminders, setAllReminders] = useState<Array<{
		id: number
		offsetMinutes: number
		recipientEmail: string // Keep for backward compatibility
		recipientEmails: string[] // New field with all emails
		remindAt: Date
		status: string
		sentAt: Date | null
	}>>([])
	const [editingReminderId, setEditingReminderId] = useState<number | null>(null)
	const [editingEmails, setEditingEmails] = useState<string[]>([])
	const [bookingStartDate, setBookingStartDate] = useState<Date | null>(null)
	const [defaultEmail, setDefaultEmail] = useState<string>("")
	const [projectId, setProjectId] = useState<number | null>(null)
	const [allProjectEmails, setAllProjectEmails] = useState<string[]>([])
	const [newReminders, setNewReminders] = useState<Array<{ offsetMinutes: number; recipientEmails: string[] }>>([])
	const [isAddingNew, setIsAddingNew] = useState(false)

	useEffect(() => {
		if (isOpen && appointmentBookingId) {
			loadReminders()
		} else {
			// Reset state when dialog closes
			setAllReminders([])
			setError(null)
			setBookingStartDate(null)
			setDefaultEmail("")
			setProjectId(null)
			setAllProjectEmails([])
			setEditingReminderId(null)
			setEditingEmails([])
			setNewReminders([])
			setIsAddingNew(false)
		}
	}, [isOpen, appointmentBookingId])

	const loadReminders = async () => {
		setIsLoading(true)
		setError(null)
		try {
			// Get booking details to access startDate and client email
			const booking = await getAppointmentBookingWithDetails(appointmentBookingId)
			if (booking) {
				setBookingStartDate(new Date(booking.startDate))
				const clientEmail = booking.project?.Client?.email || ""
				setDefaultEmail(clientEmail)
				
				// Get project ID and fetch all project emails (client + users)
				if (booking.project?.id) {
					setProjectId(booking.project.id)
					try {
						const projectUserEmails = await getProjectUsersEmails(booking.project.id)
						const allEmails = new Set([clientEmail, ...projectUserEmails].filter(Boolean))
						setAllProjectEmails(Array.from(allEmails))
					} catch (error) {
						console.error("Error fetching project users emails:", error)
						setAllProjectEmails(clientEmail ? [clientEmail] : [])
					}
				} else {
					setAllProjectEmails(clientEmail ? [clientEmail] : [])
				}
			}

		const reminderData = await getRemindersForBooking(appointmentBookingId)
		// Show all reminders, not just pending
		setAllReminders(reminderData.map(r => ({
			id: r.id,
			offsetMinutes: r.offsetMinutes,
			recipientEmail: r.recipientEmail || defaultEmail,
			recipientEmails: (r as { recipientEmails?: string[] }).recipientEmails || [r.recipientEmail || defaultEmail].filter(Boolean),
			remindAt: new Date(r.remindAt),
			status: r.status,
			sentAt: r.sentAt ? new Date(r.sentAt) : null,
		})))
		} catch (error) {
			console.error("Error loading reminders:", error)
			setError("Failed to load reminders")
		} finally {
			setIsLoading(false)
		}
	}

	const handleDeleteReminder = async (reminderId: number) => {
		if (!confirm("Are you sure you want to delete this reminder?")) {
			return
		}

		setIsSaving(true)
		setError(null)
		try {
			const result = await deleteReminder(reminderId)
			if (!result.success) {
				setError(result.error || "Failed to delete reminder")
				toast({
					title: "Error",
					description: result.error || "Failed to delete reminder",
					variant: "destructive",
				})
			} else {
				await loadReminders()
				toast({
					title: "Success",
					description: "Reminder deleted successfully",
				})
			}
		} catch (error: unknown) {
			console.error("Error deleting reminder:", error)
			const errorMessage = error instanceof Error ? error.message : "Failed to delete reminder"
			setError(errorMessage)
			toast({
				title: "Error",
				description: errorMessage,
				variant: "destructive",
			})
		} finally {
			setIsSaving(false)
		}
	}

	const handleStartEdit = (reminder: typeof allReminders[0]) => {
		setEditingReminderId(reminder.id)
		setEditingEmails(reminder.recipientEmails.length > 0 ? reminder.recipientEmails : [reminder.recipientEmail].filter(Boolean))
	}

	const handleCancelEdit = () => {
		setEditingReminderId(null)
		setEditingEmails([])
	}

	const handleSaveEdit = async (reminderId: number) => {
		// Validate emails
		const validEmails = editingEmails.filter(e => {
			const trimmed = e.trim()
			return trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
		})
		
		if (validEmails.length === 0) {
			setError("At least one valid email address is required")
			return
		}

		setIsSaving(true)
		setError(null)
		try {
			const result = await updateReminderEmail(reminderId, validEmails)
			if (!result.success) {
				setError(result.error || "Failed to update reminder emails")
				toast({
					title: "Error",
					description: result.error || "Failed to update reminder emails",
					variant: "destructive",
				})
			} else {
				setEditingReminderId(null)
				setEditingEmails([])
				await loadReminders()
				toast({
					title: "Success",
					description: "Reminder emails updated successfully",
				})
			}
		} catch (error: unknown) {
			console.error("Error updating reminder:", error)
			const errorMessage = error instanceof Error ? error.message : "Failed to update reminder"
			setError(errorMessage)
			toast({
				title: "Error",
				description: errorMessage,
				variant: "destructive",
			})
		} finally {
			setIsSaving(false)
		}
	}

	const handleAddNewReminders = async () => {
		// Check for duplicates with existing reminders
		const existingOffsets = new Set(allReminders.map(r => r.offsetMinutes))
		const duplicateReminders = newReminders.filter(r => existingOffsets.has(r.offsetMinutes))
		
		if (duplicateReminders.length > 0) {
			const hours = duplicateReminders[0].offsetMinutes / 60
			const reminderText = hours === 48 ? "2 days" : hours === 1 ? "1 hour" : `${hours} hours`
			setError(`A reminder for ${reminderText} before already exists. Please remove it first or choose a different time.`)
			return
		}

		// Check for duplicates within new reminders
		const newOffsets = newReminders.map(r => r.offsetMinutes)
		const duplicateInNew = newOffsets.filter((offset, index) => newOffsets.indexOf(offset) !== index)
		if (duplicateInNew.length > 0) {
			setError("You cannot add multiple reminders for the same time. Please remove duplicates.")
			return
		}

		// Validate all new reminders have at least one valid email
		for (const reminder of newReminders) {
			const validEmails = reminder.recipientEmails.filter(e => {
				const trimmed = e.trim()
				return trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
			})
			if (validEmails.length === 0) {
				setError(`Please enter at least one valid email address for the ${reminder.offsetMinutes / 60} hour reminder`)
				return
			}
		}

		if (newReminders.length === 0) {
			setError("Please add at least one reminder")
			return
		}

		setIsSaving(true)
		setError(null)
		try {
			const result = await updateBookingReminders(appointmentBookingId, newReminders)
			if (!result.success) {
				setError(result.error || "Failed to add reminders")
				toast({
					title: "Error",
					description: result.error || "Failed to add reminders",
					variant: "destructive",
				})
			} else {
				setNewReminders([])
				setIsAddingNew(false)
				await loadReminders()
				toast({
					title: "Success",
					description: `Successfully scheduled ${newReminders.length} reminder${newReminders.length !== 1 ? 's' : ''}`,
				})
			}
		} catch (error: unknown) {
			console.error("Error adding reminders:", error)
			const errorMessage = error instanceof Error ? error.message : "Failed to add reminders"
			setError(errorMessage)
			toast({
				title: "Error",
				description: errorMessage,
				variant: "destructive",
			})
		} finally {
			setIsSaving(false)
		}
	}


	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
				<DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
					<DialogTitle className="flex items-center gap-2">
						<Bell className="w-5 h-5" />
						Edit Appointment Reminders
					</DialogTitle>
					<DialogDescription>
						Configure automated reminder emails to be sent before the appointment starts.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-8 px-6">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="space-y-4 overflow-y-auto flex-1 px-6 min-h-0">
						{error && (
							<div className="p-3 bg-red-50 border border-red-200 rounded-md">
								<p className="text-sm text-red-800">{error}</p>
							</div>
						)}

						{bookingStartDate && (
							<div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
								<p className="text-sm font-medium text-blue-900">Appointment Start:</p>
								<p className="text-sm text-blue-700">{format(bookingStartDate, "MMM d, yyyy 'at' h:mm a")}</p>
							</div>
						)}

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<div>
									<Label>All Reminders</Label>
									<p className="text-xs text-muted-foreground">
										View and manage all reminder emails for this appointment
									</p>
								</div>
								{!isAddingNew && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setIsAddingNew(true)}
										className="flex items-center gap-2"
									>
										<Bell className="w-4 h-4" />
										Add New
									</Button>
								)}
							</div>

							{/* Add New Reminders Section */}
							{isAddingNew && (
								<div className="border rounded-lg p-4 bg-blue-50 space-y-3">
									<div className="flex items-center justify-between">
										<Label className="text-blue-900">Add New Reminders</Label>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => {
												setIsAddingNew(false)
												setNewReminders([])
											}}
											className="h-6 w-6 p-0"
										>
											×
										</Button>
									</div>
									
									{/* Quick select buttons */}
									<div className="flex flex-wrap gap-2">
										{[1, 2, 6, 12, 24, 48].map((hours) => {
											const minutes = hours === 48 ? 2880 : hours * 60
											const isSelectedInNew = newReminders.some(r => r.offsetMinutes === minutes)
											const alreadyExists = allReminders.some(r => r.offsetMinutes === minutes)
											const isSelected = isSelectedInNew || alreadyExists
											const reminderTime = bookingStartDate ? subMinutes(bookingStartDate, minutes) : null
											
											return (
												<Button
													key={minutes}
													type="button"
													variant={isSelected ? "default" : "outline"}
													size="sm"
													disabled={alreadyExists}
													onClick={() => {
														if (alreadyExists) {
															setError(`A reminder for ${hours === 48 ? "2 days" : `${hours} hour${hours > 1 ? 's' : ''}`} before already exists`)
															return
														}
														if (isSelectedInNew) {
															setNewReminders(newReminders.filter(r => r.offsetMinutes !== minutes))
														} else {
															// Auto-fill with all project emails (client + users) if available, otherwise use default email
															const emailsToUse = allProjectEmails.length > 0 ? allProjectEmails : (defaultEmail ? [defaultEmail] : [""])
															setNewReminders([...newReminders, { offsetMinutes: minutes, recipientEmails: emailsToUse }])
														}
													}}
													className="text-xs"
													title={alreadyExists ? "This reminder time already exists" : undefined}
												>
													{hours === 48 ? "2 days" : `${hours}h`} before
													{isSelected && reminderTime && (
														<span className="ml-1 text-xs opacity-70">
															({format(reminderTime, "MMM d, h:mm a")})
														</span>
													)}
													{alreadyExists && (
														<span className="ml-1 text-xs opacity-70">(exists)</span>
													)}
												</Button>
											)
										})}
									</div>

									{/* Selected new reminders list with email inputs */}
									{newReminders.length > 0 && (
										<div className="space-y-2 border rounded-lg p-3 bg-white">
											<p className="text-xs font-medium text-muted-foreground mb-2">
												New Reminders ({newReminders.length})
											</p>
											{newReminders
												.sort((a, b) => b.offsetMinutes - a.offsetMinutes)
												.map((reminder, index) => {
													const hours = reminder.offsetMinutes / 60
													const reminderTime = bookingStartDate ? subMinutes(bookingStartDate, reminder.offsetMinutes) : null
													const reminderText = hours === 48 
														? "48 hours (2 days)"
														: hours === 1
														? "1 hour"
														: `${hours} hours`

													return (
														<div key={`new-${reminder.offsetMinutes}-${index}`} className="space-y-1.5 p-2 bg-gray-50 rounded border">
															<div className="flex items-center justify-between">
																<div className="flex-1">
																	<p className="text-sm font-medium">
																		{reminderText} before
																	</p>
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
																	onClick={() => {
																		setNewReminders(newReminders.filter((_, i) => i !== index))
																	}}
																	className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
																>
																	×
																</Button>
															</div>
															<EmailListInput
																emails={reminder.recipientEmails}
																onChange={(emails) => {
																	const updated = [...newReminders]
																	updated[index].recipientEmails = emails
																	setNewReminders(updated)
																}}
																required
																className="mt-2"
															/>
														</div>
													)
												})}
										</div>
									)}

									<Button
										type="button"
										onClick={handleAddNewReminders}
										disabled={isSaving || newReminders.length === 0}
										className="w-full"
									>
										{isSaving ? (
											<>
												<Loader2 className="w-4 h-4 mr-2 animate-spin" />
												Adding...
											</>
										) : (
											<>Add {newReminders.length} Reminder{newReminders.length !== 1 ? 's' : ''}</>
										)}
									</Button>
								</div>
							)}

							{/* List of all reminders */}
							{allReminders.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground border rounded-lg">
									<Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
									<p>No reminders configured yet.</p>
								</div>
							) : (
								<div className="space-y-2 border rounded-lg p-3 bg-gray-50 max-h-96 overflow-y-auto">
									{allReminders
										.sort((a, b) => b.offsetMinutes - a.offsetMinutes)
										.map((reminder) => {
											const hours = reminder.offsetMinutes / 60
											const reminderText = hours === 48 
												? "48 hours (2 days)"
												: hours === 1
												? "1 hour"
												: `${hours} hours`
											const isPast = isDatePast(reminder.remindAt)
											const isEditing = editingReminderId === reminder.id
											const statusColors = {
												PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
												SENT: "bg-green-100 text-green-800 border-green-200",
												FAILED: "bg-red-100 text-red-800 border-red-200",
												SENDING: "bg-blue-100 text-blue-800 border-blue-200",
											}

											return (
												<div key={reminder.id} className="p-3 bg-white rounded border space-y-2">
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<div className="flex items-center gap-2 mb-1">
																<p className="text-sm font-medium">
																	{reminderText} before
																</p>
																<span className={`text-xs px-2 py-0.5 rounded border ${statusColors[reminder.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}`}>
																	{reminder.status}
																</span>
															</div>
															<p className="text-xs text-muted-foreground">
																Will send at: {format(reminder.remindAt, "MMM d, yyyy 'at' h:mm a")}
															</p>
															{reminder.sentAt && (
																<p className="text-xs text-muted-foreground">
																	Sent at: {format(reminder.sentAt, "MMM d, yyyy 'at' h:mm a")}
																</p>
															)}
														</div>
														<div className="flex gap-1">
															{!isPast && reminder.status === 'PENDING' && (
																<>
																	{isEditing ? (
																		<>
																			<Button
																				type="button"
																				variant="ghost"
																				size="sm"
																				onClick={() => handleSaveEdit(reminder.id)}
																				disabled={isSaving}
																				className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
																			>
																				<Check className="w-4 h-4" />
																			</Button>
																			<Button
																				type="button"
																				variant="ghost"
																				size="sm"
																				onClick={handleCancelEdit}
																				disabled={isSaving}
																				className="h-7 w-7 p-0 text-gray-600 hover:text-gray-700"
																			>
																				<X className="w-4 h-4" />
																			</Button>
																		</>
																	) : (
																		<Button
																			type="button"
																			variant="ghost"
																			size="sm"
																			onClick={() => handleStartEdit(reminder)}
																			disabled={isSaving}
																			className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
																		>
																			<Edit2 className="w-4 h-4" />
																		</Button>
																	)}
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		onClick={() => handleDeleteReminder(reminder.id)}
																		disabled={isSaving}
																		className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
																	>
																		<Trash2 className="w-4 h-4" />
																	</Button>
																</>
															)}
														</div>
													</div>
													{isEditing ? (
														<EmailListInput
															emails={editingEmails}
															onChange={setEditingEmails}
															required
															className="mt-2"
														/>
													) : (
														<div className="text-xs text-muted-foreground">
															<p className="font-medium mb-1">Recipients:</p>
															{reminder.recipientEmails.length > 0 ? (
																<ul className="list-disc list-inside space-y-0.5">
																	{reminder.recipientEmails.map((email, idx) => (
																		<li key={idx}>{email}</li>
																	))}
																</ul>
															) : (
																<p>Email: {reminder.recipientEmail}</p>
															)}
														</div>
													)}
													{isPast && (
														<p className="text-xs text-red-600 font-medium">
															⚠ This reminder time has passed and cannot be edited
														</p>
													)}
												</div>
											)
										})}
								</div>
							)}
						</div>
					</div>
				)}

				<DialogFooter className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}


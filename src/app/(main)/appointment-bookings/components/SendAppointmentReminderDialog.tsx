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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, User, Building2, Mail as MailIcon } from "lucide-react"
import { getAppointmentBookingWithDetails, sendAppointmentReminder } from "../actions"
import type { AppointmentBookingWithDetails } from "../types"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"

interface SendAppointmentReminderDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	appointmentBookingId: number
	onSuccess?: () => void
}

export default function SendAppointmentReminderDialog({
	isOpen,
	onOpenChange,
	appointmentBookingId,
	onSuccess,
}: SendAppointmentReminderDialogProps) {
	const [isLoading, setIsLoading] = useState(false)
	const [isSending, setIsSending] = useState(false)
	const [clientEmail, setClientEmail] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [bookingDetails, setBookingDetails] = useState<AppointmentBookingWithDetails | null>(null)

	useEffect(() => {
		if (isOpen && appointmentBookingId) {
			loadBookingDetails()
		} else {
			// Reset state when dialog closes
			setClientEmail("")
			setError(null)
			setBookingDetails(null)
		}
	}, [isOpen, appointmentBookingId])

	const loadBookingDetails = async () => {
		setIsLoading(true)
		setError(null)
		try {
			const details = await getAppointmentBookingWithDetails(appointmentBookingId)
			if (!details) {
				setError("Failed to load appointment booking details")
				return
			}

			if (!details.project) {
				setError("No project associated with this appointment")
				return
			}

			if (!details.project.Client) {
				setError("No client associated with this project")
				return
			}

			setBookingDetails(details)
			// Auto-fill client email if available
			if (details.project.Client.email) {
				setClientEmail(details.project.Client.email)
			}
		} catch (error) {
			console.error("Error loading booking details:", error)
			setError("Failed to load appointment booking details")
		} finally {
			setIsLoading(false)
		}
	}

	const handleSend = async () => {
		if (!clientEmail || !/\S+@\S+\.\S+/.test(clientEmail)) {
			setError("Please enter a valid email address")
			return
		}

		setIsSending(true)
		setError(null)

		try {
			const result = await sendAppointmentReminder(appointmentBookingId, clientEmail)

			if (!result.success) {
				setError(result.error || "Failed to send reminder email")
				toast({
					title: "Failed",
					description: result.error || "Failed to send reminder email",
					variant: "destructive",
				})
				setIsSending(false)
				return
			}

			// Success - show toast and keep dialog open
			toast({
				title: "Success",
				description: "Reminder email sent successfully",
			})
			// Don't close dialog or call onSuccess - just show toast
		} catch (error: unknown) {
			console.error("Error sending reminder:", error)
			const errorMessage = error instanceof Error ? error.message : "Failed to send reminder email"
			setError(errorMessage)
			toast({
				title: "Failed",
				description: errorMessage,
				variant: "destructive",
			})
		} finally {
			setIsSending(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<MailIcon className="w-5 h-5" />
						Send Appointment Reminder
					</DialogTitle>
					<DialogDescription>
						Send a reminder email to the client for this appointment booking.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				) : error && !bookingDetails ? (
					<div className="text-center py-8">
						<p className="text-sm text-red-600">{error}</p>
					</div>
				) : bookingDetails ? (
					<div className="space-y-4">
						{/* Appointment Details */}
						<div className="space-y-3 p-4 bg-gray-50 rounded-lg">
							<h4 className="font-semibold text-sm">Appointment Details</h4>
							<div className="space-y-2 text-sm">
								<div>
									<span className="font-medium">Appointment:</span>{" "}
									<span className="text-muted-foreground">
										{bookingDetails.appointment?.name || "N/A"}
									</span>
								</div>
								{bookingDetails.appointment?.location && (
									<div>
										<span className="font-medium">Location:</span>{" "}
										<span className="text-muted-foreground">
											{bookingDetails.appointment.location}
										</span>
									</div>
								)}
								<div>
									<span className="font-medium">Start:</span>{" "}
									<span className="text-muted-foreground">
										{format(new Date(bookingDetails.startDate), "PPp")}
									</span>
								</div>
								<div>
									<span className="font-medium">End:</span>{" "}
									<span className="text-muted-foreground">
										{format(new Date(bookingDetails.endDate), "PPp")}
									</span>
								</div>
							</div>
						</div>

						{/* Client Details */}
						{bookingDetails.project?.Client && (
							<div className="space-y-3 p-4 bg-blue-50 rounded-lg">
								<h4 className="font-semibold text-sm flex items-center gap-2">
									<User className="w-4 h-4" />
									Client Details
								</h4>
								<div className="space-y-2 text-sm">
									<div>
										<span className="font-medium">Name:</span>{" "}
										<span className="text-muted-foreground">
											{bookingDetails.project.Client.name || "N/A"}
										</span>
									</div>
									{bookingDetails.project.Client.company && (
										<div className="flex items-center gap-2">
											<Building2 className="w-4 h-4 text-muted-foreground" />
											<span className="font-medium">Company:</span>{" "}
											<span className="text-muted-foreground">
												{bookingDetails.project.Client.company}
											</span>
										</div>
									)}
									<div className="flex items-center gap-2">
										<Mail className="w-4 h-4 text-muted-foreground" />
										<span className="font-medium">Email:</span>{" "}
										<span className="text-muted-foreground">
											{bookingDetails.project.Client.email || "N/A"}
										</span>
									</div>
								</div>
							</div>
						)}

						{/* Project Details */}
						{bookingDetails.project && (
							<div className="space-y-2 p-4 bg-green-50 rounded-lg">
								<h4 className="font-semibold text-sm">Project</h4>
								<div className="text-sm">
									<span className="font-medium">Name:</span>{" "}
									<span className="text-muted-foreground">
										{bookingDetails.project.name || bookingDetails.project.clientName || "N/A"}
									</span>
								</div>
							</div>
						)}

						{/* Email Input */}
						<div className="space-y-2">
							<Label htmlFor="clientEmail">
								Client Email <span className="text-red-500">*</span>
							</Label>
							<Input
								id="clientEmail"
								type="email"
								value={clientEmail}
								onChange={(e) => {
									setClientEmail(e.target.value)
									setError(null)
								}}
								placeholder="Enter client email address"
								className={error && !clientEmail ? "border-red-500" : ""}
							/>
							{error && (
								<p className="text-sm text-red-500">{error}</p>
							)}
						</div>
					</div>
				) : null}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSend}
						disabled={isSending || !clientEmail || isLoading}
						className="flex items-center gap-2"
					>
						{isSending ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Sending...
							</>
						) : (
							<>
								<MailIcon className="w-4 h-4" />
								Send Reminder
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}


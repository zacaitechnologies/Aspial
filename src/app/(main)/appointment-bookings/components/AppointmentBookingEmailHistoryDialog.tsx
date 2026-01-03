"use client"

import { useState, useEffect } from "react"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Clock, User, Bot, UserCircle } from "lucide-react"
import { getAppointmentBookingEmailHistory } from "../actions"
import { format } from "date-fns"

interface AppointmentBookingEmailHistoryDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	appointmentBookingId: number
}

interface EmailHistoryItem {
	id: number
	recipientEmail: string
	sentAt: Date
	sentBy: {
		firstName: string
		lastName: string
		email: string
	} | null
	isAutomated: boolean
}

export default function AppointmentBookingEmailHistoryDialog({
	isOpen,
	onOpenChange,
	appointmentBookingId,
}: AppointmentBookingEmailHistoryDialogProps) {
	const [emails, setEmails] = useState<EmailHistoryItem[]>([])
	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		if (isOpen && appointmentBookingId) {
			loadEmailHistory()
		}
	}, [isOpen, appointmentBookingId])

	const loadEmailHistory = async () => {
		setIsLoading(true)
		try {
			const history = await getAppointmentBookingEmailHistory(appointmentBookingId)
			setEmails(history)
		} catch (error) {
			console.error("Error loading email history:", error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Mail className="w-5 h-5" />
						Email History
					</DialogTitle>
					<DialogDescription>
						View all emails sent for this appointment booking (manual and automated reminders).
					</DialogDescription>
				</DialogHeader>
				<div className="max-h-[500px] overflow-y-auto">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
						</div>
					) : emails.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
							<p>No confirmation emails have been sent for this appointment booking yet.</p>
						</div>
					) : (
						<div className="space-y-4">
							{emails.map((email) => (
								<div
									key={email.id}
									className="border rounded-lg p-4 space-y-3 bg-card"
								>
									<div className="flex items-start justify-between">
										<div className="space-y-1 flex-1">
											<div className="flex items-center gap-2">
												<Mail className="w-4 h-4 text-muted-foreground" />
												<span className="font-medium">{email.recipientEmail}</span>
											</div>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Clock className="w-3 h-3" />
												<span>
													{format(new Date(email.sentAt), "PPp")}
												</span>
											</div>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												{email.isAutomated ? (
													<>
														<Bot className="w-3 h-3" />
														<span>Automated Reminder</span>
													</>
												) : (
													<>
														<UserCircle className="w-3 h-3" />
														<span>
															{email.sentBy
																? `Sent by ${email.sentBy.firstName} ${email.sentBy.lastName}`
																: "Manual"}
														</span>
													</>
												)}
											</div>
											{email.isAutomated && (
												<div className="mt-1">
													<span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded border border-blue-200">
														Automated
													</span>
												</div>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}


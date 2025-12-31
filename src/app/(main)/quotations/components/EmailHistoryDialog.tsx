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
import { Loader2, Mail, Clock, User } from "lucide-react"
import { getQuotationEmailHistory } from "../action"
import { format } from "date-fns"

interface EmailHistoryDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	quotationId: number
}

interface EmailHistoryItem {
	id: number
	recipientEmail: string
	sentAt: Date
	sentBy: {
		firstName: string
		lastName: string
		email: string
	}
}

export default function EmailHistoryDialog({
	isOpen,
	onOpenChange,
	quotationId,
}: EmailHistoryDialogProps) {
	const [emails, setEmails] = useState<EmailHistoryItem[]>([])
	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		if (isOpen && quotationId) {
			loadEmailHistory()
		}
	}, [isOpen, quotationId])

	const loadEmailHistory = async () => {
		setIsLoading(true)
		try {
			const history = await getQuotationEmailHistory(quotationId)
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
						View all emails sent for this quotation.
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
							<p>No emails have been sent for this quotation yet.</p>
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
												<User className="w-3 h-3" />
												<span>
													Sent by {email.sentBy.firstName} {email.sentBy.lastName}
												</span>
											</div>
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



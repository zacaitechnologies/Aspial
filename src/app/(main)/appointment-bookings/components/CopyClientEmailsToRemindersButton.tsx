"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Copy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
	applyEmailsToAllReminders,
	getValidEmails,
	remindersHaveConfiguredEmails,
	type ReminderWithEmails,
} from "../utils/reminder-email-copy"

interface CopyClientEmailsToRemindersButtonProps {
	sourceEmails: string[]
	sourceLabel?: string
	reminders: ReminderWithEmails[]
	onRemindersChange: (reminders: ReminderWithEmails[]) => void
	disabled?: boolean
}

export function CopyClientEmailsToRemindersButton({
	sourceEmails,
	sourceLabel = "client email address",
	reminders,
	onRemindersChange,
	disabled = false,
}: CopyClientEmailsToRemindersButtonProps) {
	const { toast } = useToast()
	const [showConflictDialog, setShowConflictDialog] = useState(false)

	const applyCopy = (mode: "overwrite" | "append") => {
		const validSource = getValidEmails(sourceEmails)
		onRemindersChange(applyEmailsToAllReminders(reminders, validSource, mode))
		setShowConflictDialog(false)
		toast({
			title: "Emails copied",
			description:
				mode === "overwrite"
					? `Replaced reminder emails with ${validSource.length} client email${validSource.length !== 1 ? "s" : ""}.`
					: `Added ${validSource.length} client email${validSource.length !== 1 ? "s" : ""} to all reminders.`,
		})
	}

	const handleCopy = () => {
		const validSource = getValidEmails(sourceEmails)
		if (validSource.length === 0) {
			toast({
				title: "No emails to copy",
				description: `Add at least one valid ${sourceLabel} first.`,
				variant: "destructive",
			})
			return
		}
		if (reminders.length === 0) {
			toast({
				title: "No reminders selected",
				description: "Select at least one reminder before copying emails.",
				variant: "destructive",
			})
			return
		}
		if (remindersHaveConfiguredEmails(reminders)) {
			setShowConflictDialog(true)
			return
		}
		applyCopy("overwrite")
	}

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={handleCopy}
				disabled={disabled}
				className="shrink-0 text-xs h-7"
			>
				<Copy className="w-3.5 h-3.5 mr-1.5" />
				Copy client emails
			</Button>

			<Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
				<DialogContent nested className="z-[80] sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Reminder emails already configured</DialogTitle>
						<DialogDescription>
							Some reminders already have email addresses. Do you want to replace them with
							the client emails or add the client emails to the existing list?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => setShowConflictDialog(false)}
						>
							Cancel
						</Button>
						<Button type="button" variant="secondary" onClick={() => applyCopy("append")}>
							Append
						</Button>
						<Button type="button" onClick={() => applyCopy("overwrite")}>
							Overwrite
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

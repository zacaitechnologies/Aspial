"use client"

import { useState } from "react"
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
import { Loader2, Mail, Send } from "lucide-react"
import { sendQuotationEmail } from "../action"
import { toast } from "@/components/ui/use-toast"

interface SendQuotationDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	quotationId: number
	clientEmail: string
	onSuccess?: () => void
}

export default function SendQuotationDialog({
	isOpen,
	onOpenChange,
	quotationId,
	clientEmail,
	onSuccess,
}: SendQuotationDialogProps) {
	const [email, setEmail] = useState(clientEmail)
	const [isSending, setIsSending] = useState(false)
	const [sendingProgress, setSendingProgress] = useState<string>("")

	const handleSend = async () => {
		if (!email || !email.includes("@")) {
			toast({
				title: "Invalid Email",
				description: "Please enter a valid email address.",
				variant: "destructive",
			})
			return
		}

		setIsSending(true)
		setSendingProgress("Fetching quotation data...")
		
		try {
			// Add a small delay to show the loading state
			await new Promise(resolve => setTimeout(resolve, 300))
			
			setSendingProgress("Generating PDF document...")
			await new Promise(resolve => setTimeout(resolve, 200))
			
			setSendingProgress("Sending email...")
			const result = await sendQuotationEmail(quotationId, email)
			
			if (result.success) {
				toast({
					title: "Success",
					description: "Quotation PDF has been sent successfully.",
				})
				onOpenChange(false)
				setEmail(clientEmail) // Reset to client email
				onSuccess?.()
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to send quotation.",
					variant: "destructive",
				})
			}
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to send quotation.",
				variant: "destructive",
			})
		} finally {
			setIsSending(false)
			setSendingProgress("")
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Mail className="w-5 h-5" />
						Send Quotation PDF
					</DialogTitle>
					<DialogDescription>
						Enter the recipient email address to send the quotation PDF. The email will include the quotation details and the PDF attachment.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="recipient-email">Recipient Email</Label>
						<Input
							id="recipient-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="customer@example.com"
							disabled={isSending}
						/>
						<p className="text-xs text-muted-foreground">
							The client's email is pre-filled, but you can edit it if needed.
						</p>
					</div>
					{isSending && sendingProgress && (
						<div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
							<Loader2 className="w-4 h-4 animate-spin text-blue-600" />
							<p className="text-sm text-blue-700">{sendingProgress}</p>
						</div>
					)}
				</div>
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
						disabled={isSending || !email}
						className="gap-2"
					>
						{isSending ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Sending...
							</>
						) : (
							<>
								<Send className="w-4 h-4" />
								Send Quotation
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}



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
import { Loader2, Mail, Send } from "lucide-react"
import { sendInvoiceEmail } from "../action"
import { toast } from "@/components/ui/use-toast"

interface SendInvoiceDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	invoiceId: string
	clientEmail: string
	onSuccess?: () => void
}

export default function SendInvoiceDialog({
	isOpen,
	onOpenChange,
	invoiceId,
	clientEmail,
	onSuccess,
}: SendInvoiceDialogProps) {
	const [email, setEmail] = useState(clientEmail)
	const [isSending, setIsSending] = useState(false)
	const [sendingProgress, setSendingProgress] = useState<string>("")

	// Update email when dialog opens or clientEmail changes
	useEffect(() => {
		if (isOpen) {
			// Always update email when dialog opens or clientEmail changes
			// This ensures it gets updated when invoice data loads
			if (clientEmail && clientEmail.trim() !== "") {
				console.log("SendInvoiceDialog: Setting email to", clientEmail)
				setEmail(clientEmail)
			} else if (!email || email.trim() === "") {
				// Only clear if email is empty, otherwise keep user's input
				setEmail("")
			}
		}
	}, [isOpen, clientEmail]) // eslint-disable-line react-hooks/exhaustive-deps

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
		setSendingProgress("Fetching invoice data...")
		
		try {
			// Add a small delay to show the loading state
			await new Promise(resolve => setTimeout(resolve, 300))
			
			setSendingProgress("Generating PDF document...")
			await new Promise(resolve => setTimeout(resolve, 200))
			
			setSendingProgress("Sending email...")
			const result = await sendInvoiceEmail(invoiceId, email)
			
			if (result.success) {
				toast({
					title: "Success",
					description: "Invoice PDF has been sent successfully.",
				})
				onOpenChange(false)
				setEmail(clientEmail) // Reset to client email
				onSuccess?.()
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to send invoice.",
					variant: "destructive",
				})
			}
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to send invoice.",
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
						Send Invoice PDF
					</DialogTitle>
					<DialogDescription>
						Enter the recipient email address to send the invoice PDF. The email will include the invoice details and the PDF attachment.
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
								Send Invoice
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}


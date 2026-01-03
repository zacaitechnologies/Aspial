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
import { sendReceiptEmail } from "../action"
import { toast } from "@/components/ui/use-toast"

interface SendReceiptDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	receiptId: string
	clientEmail: string
	onSuccess?: () => void
}

export default function SendReceiptDialog({
	isOpen,
	onOpenChange,
	receiptId,
	clientEmail,
	onSuccess,
}: SendReceiptDialogProps) {
	const [email, setEmail] = useState(clientEmail)
	const [isSending, setIsSending] = useState(false)
	const [sendingProgress, setSendingProgress] = useState<string>("")

	// Update email when dialog opens or clientEmail changes
	useEffect(() => {
		if (isOpen) {
			if (clientEmail && clientEmail.trim() !== "") {
				console.log("SendReceiptDialog: Setting email to", clientEmail)
				setEmail(clientEmail)
			} else if (!email || email.trim() === "") {
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
		setSendingProgress("Fetching receipt data...")
		
		try {
			await new Promise(resolve => setTimeout(resolve, 300))
			
			setSendingProgress("Generating PDF document...")
			await new Promise(resolve => setTimeout(resolve, 200))
			
			setSendingProgress("Sending email...")
			const result = await sendReceiptEmail(receiptId, email)
			
			if (result.success) {
				toast({
					title: "Success",
					description: "Receipt PDF has been sent successfully.",
				})
				onOpenChange(false)
				setEmail(clientEmail)
				onSuccess?.()
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to send receipt.",
					variant: "destructive",
				})
			}
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to send receipt.",
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
						Send Receipt PDF
					</DialogTitle>
					<DialogDescription>
						Enter the recipient email address to send the receipt PDF. The email will include the receipt details and the PDF attachment.
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
								Send Receipt
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}


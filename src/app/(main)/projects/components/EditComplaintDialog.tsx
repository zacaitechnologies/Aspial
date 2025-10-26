"use client"

import { useState } from "react"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { updateComplaint } from "../action"

interface EditComplaintDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	complaint: {
		id: number
		customer: string
		reason: string
		user: {
			firstName: string
			lastName: string
		}
	}
	onComplaintUpdated?: () => void
}

export default function EditComplaintDialog({
	open,
	onOpenChange,
	complaint,
	onComplaintUpdated,
}: EditComplaintDialogProps) {
	const [customer, setCustomer] = useState(complaint.customer)
	const [reason, setReason] = useState(complaint.reason)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError("")

		if (!customer || !reason) {
			setError("Please fill in all fields")
			return
		}

		setLoading(true)
		try {
			const result = await updateComplaint(complaint.id, reason, customer)

			if (result.success) {
				onOpenChange(false)
				onComplaintUpdated?.()
			} else {
				setError(result.error || "Failed to update complaint")
			}
		} catch (err) {
			setError("An error occurred")
			console.error(err)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Edit Complaint</DialogTitle>
					<DialogDescription>
						Update complaint for {complaint.user.firstName} {complaint.user.lastName}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
							{error}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="customer">Customer Name</Label>
						<Input
							id="customer"
							value={customer}
							onChange={(e) => setCustomer(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="reason">Complaint Reason</Label>
						<Textarea
							id="reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							className="min-h-[100px]"
						/>
					</div>

					<div className="flex gap-2 justify-end pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={loading}
							style={{ backgroundColor: "#202F21" }}
							className="text-white"
						>
							{loading ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Updating...
								</>
							) : (
								"Update Complaint"
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}

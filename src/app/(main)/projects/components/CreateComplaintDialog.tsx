"use client"

import { useState } from "react"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import { AlertCircle, Loader2 } from "lucide-react"
import { createProjectComplaint } from "../action"
import { useSession } from "../../contexts/SessionProvider"

interface CreateComplaintDialogProps {
	projectId: number
	projectName: string
	clientName?: string
	staffMembers: Array<{
		id: string
		firstName: string
		lastName: string
		email: string
	}>
	onComplaintCreated?: () => void
}

export default function CreateComplaintDialog({
	projectId,
	projectName,
	clientName,
	staffMembers,
	onComplaintCreated,
}: CreateComplaintDialogProps) {
	const { enhancedUser } = useSession()
	const [open, setOpen] = useState(false)
	const [selectedStaff, setSelectedStaff] = useState<string>("")
	const [customer, setCustomer] = useState<string>(clientName || "")
	const [reason, setReason] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError("")

		if (!selectedStaff || !customer || !reason) {
			setError("Please fill in all fields")
			return
		}

		if (loading) return; // Prevent double submission

		setLoading(true)
		try {
			const result = await createProjectComplaint(
				projectId,
				selectedStaff,
				reason,
				customer
			)

			if (result.success) {
				setSelectedStaff("")
				setCustomer("")
				setReason("")
				setOpen(false)
				onComplaintCreated?.()
			} else {
				setError(result.error || "Failed to create complaint")
			}
		} catch (err) {
			setError("An error occurred")
			console.error(err)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					style={{ backgroundColor: "#202F21" }}
					className="flex items-center gap-2 text-white w-full"
				>
					<AlertCircle className="w-4 h-4" />
					Report Complaint
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Report Staff Complaint</DialogTitle>
					<DialogDescription>
						Report a complaint for {projectName} project
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
							{error}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="staff">Select Staff Member</Label>
						<Select value={selectedStaff} onValueChange={setSelectedStaff}>
							<SelectTrigger>
								<SelectValue placeholder="Choose staff member..." />
							</SelectTrigger>
							<SelectContent>
								{Array.from(
									new Map(
										staffMembers.map((staff) => [
											staff.id,
											staff,
										])
									).values()
								).map((staff) => (
									<SelectItem key={staff.id} value={staff.id}>
										{staff.firstName} {staff.lastName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="customer">Customer Name</Label>
						<Input
							id="customer"
							placeholder="Enter customer name"
							value={customer}
							onChange={(e) => setCustomer(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="reason">Complaint Reason</Label>
						<Textarea
							id="reason"
							placeholder="Describe the complaint..."
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							className="min-h-[100px]"
						/>
					</div>

					<div className="flex gap-2 justify-end pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={loading}
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
									Creating...
								</>
							) : (
								"Create Complaint"
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}

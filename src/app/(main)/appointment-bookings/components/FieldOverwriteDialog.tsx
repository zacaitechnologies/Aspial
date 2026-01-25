"use client"

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface FieldOverwriteDialogProps {
	isOpen: boolean
	onClose: () => void
	onAccept: () => void
	fieldsToOverwrite: {
		bookingName?: string
		companyName?: string
		contactNumber?: string
	}
	projectClientName: string
}

export function FieldOverwriteDialog({
	isOpen,
	onClose,
	onAccept,
	fieldsToOverwrite,
	projectClientName,
}: FieldOverwriteDialogProps) {
	const fieldsList = Object.entries(fieldsToOverwrite)
		.filter(([_, value]) => value !== undefined && value !== "")
		.map(([key, value]) => {
			const labels: Record<string, string> = {
				bookingName: "Booking Name",
				companyName: "Company Name",
				contactNumber: "Contact Number",
			}
			return { label: labels[key] || key, value: value as string }
		})

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-full bg-yellow-50 border border-yellow-200">
							<AlertTriangle className="w-5 h-5 text-yellow-600" />
						</div>
						<DialogTitle>Overwrite Fields with Project Client Info?</DialogTitle>
					</div>
					<DialogDescription className="text-sm text-muted-foreground mt-2">
						You have already filled in some fields, but a project has been selected. The following fields will be overwritten with information from the project&apos;s client ({projectClientName}):
					</DialogDescription>
				</DialogHeader>

				{fieldsList.length > 0 && (
					<div className="space-y-2 p-4 bg-muted rounded-md">
						<p className="text-sm font-medium text-foreground mb-2">Fields to be overwritten:</p>
						<ul className="space-y-1 list-disc list-inside">
							{fieldsList.map((field, index) => (
								<li key={index} className="text-sm text-muted-foreground">
									<strong>{field.label}:</strong> {field.value}
								</li>
							))}
						</ul>
					</div>
				)}

				<DialogFooter className="flex gap-2 sm:justify-end">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={onAccept}>
						Accept & Overwrite
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmailListInputProps {
	emails: string[]
	onChange: (emails: string[]) => void
	required?: boolean
	disabled?: boolean
	className?: string
}

export function EmailListInput({
	emails,
	onChange,
	required = false,
	disabled = false,
	className,
}: EmailListInputProps) {
	const [emailErrors, setEmailErrors] = useState<Record<number, string>>({})

	const validateEmail = (email: string): string | null => {
		if (!email.trim()) {
			return required ? "Email is required" : null
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(email)) {
			return "Please enter a valid email address"
		}
		return null
	}

	const handleEmailChange = (index: number, value: string) => {
		const newEmails = [...emails]
		newEmails[index] = value
		onChange(newEmails)

		// Validate and update error state
		const error = validateEmail(value)
		if (error) {
			setEmailErrors((prev) => ({ ...prev, [index]: error }))
		} else {
			setEmailErrors((prev) => {
				const updated = { ...prev }
				delete updated[index]
				return updated
			})
		}
	}

	const handleAddEmail = () => {
		onChange([...emails, ""])
	}

	const handleRemoveEmail = (index: number) => {
		const newEmails = emails.filter((_, i) => i !== index)
		onChange(newEmails)
		setEmailErrors((prev) => {
			const updated = { ...prev }
			delete updated[index]
			// Reindex errors
			const reindexed: Record<number, string> = {}
			Object.entries(updated).forEach(([key, value]) => {
				const oldIndex = Number.parseInt(key)
				if (oldIndex > index) {
					reindexed[oldIndex - 1] = value
				} else if (oldIndex < index) {
					reindexed[oldIndex] = value
				}
			})
			return reindexed
		})
	}

	const hasErrors = Object.keys(emailErrors).length > 0
	const hasValidEmails = emails.some((email) => email.trim() && !validateEmail(email))

	return (
		<div className={cn("space-y-2", className)}>
			<Label>
				Email Addresses {required && <span className="text-destructive">*</span>}
			</Label>
			<div className="space-y-2">
				{emails.map((email, index) => (
					<div key={index} className="flex items-start gap-2">
						<div className="flex-1">
							<Input
								type="email"
								value={email}
								onChange={(e) => handleEmailChange(index, e.target.value)}
								placeholder="email@example.com"
								disabled={disabled}
								className={cn(
									emailErrors[index] && "border-destructive focus:border-destructive focus:ring-destructive"
								)}
							/>
							{emailErrors[index] && (
								<p className="text-xs text-destructive mt-1">{emailErrors[index]}</p>
							)}
						</div>
						{emails.length > 1 && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => handleRemoveEmail(index)}
								disabled={disabled}
								className="shrink-0"
							>
								<X className="w-4 h-4" />
							</Button>
						)}
					</div>
				))}
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleAddEmail}
					disabled={disabled}
					className="w-full"
				>
					<Plus className="w-4 h-4 mr-2" />
					Add Email
				</Button>
			</div>
			{required && !hasValidEmails && (
				<p className="text-xs text-destructive font-medium">
					At least one valid email address is required
				</p>
			)}
			{emails.length > 0 && (
				<p className="text-xs text-muted-foreground">
					{emails.filter((e) => e.trim()).length} email{emails.filter((e) => e.trim()).length !== 1 ? "s" : ""} configured
				</p>
			)}
		</div>
	)
}

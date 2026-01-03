"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export interface DeletionImpactItem {
	label: string
	count: number
	examples?: string[]
}

export interface DeletionImpact {
	items: DeletionImpactItem[]
}

interface DeletionImpactWarningDialogProps {
	isOpen: boolean
	onClose: () => void
	onProceed: () => void
	title: string
	entityName: string
	impactItems: DeletionImpactItem[]
	isLoading?: boolean
}

export function DeletionImpactWarningDialog({
	isOpen,
	onClose,
	onProceed,
	title,
	entityName,
	impactItems,
	isLoading = false,
}: DeletionImpactWarningDialogProps) {
	const hasImpact = impactItems.length > 0 && impactItems.some((item) => item.count > 0)

	const formatImpactText = () => {
		if (!hasImpact) return ""

		const items = impactItems
			.filter((item) => item.count > 0)
			.map((item) => {
				const examples = item.examples && item.examples.length > 0
					? ` (e.g., ${item.examples.slice(0, 3).join(", ")})`
					: ""
				return `${item.count} ${item.label}${examples}`
			})

		return items.join(", ")
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-full bg-yellow-50 border border-yellow-200">
							<AlertTriangle className="w-5 h-5 text-yellow-500" />
						</div>
						<DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
					</div>
					<DialogDescription asChild>
						<div className="text-sm text-muted-foreground mt-2 space-y-2">
							<div>
								Deleting this {entityName} is <strong className="text-yellow-600">not recommended</strong> because it has related records:
							</div>
							{hasImpact && (
								<ul className="list-disc list-inside space-y-1 ml-2">
									{impactItems
										.filter((item) => item.count > 0)
										.map((item, index) => (
											<li key={index} className="text-sm">
												<strong>{item.count}</strong> {item.label}
												{item.examples && item.examples.length > 0 && (
													<span className="text-muted-foreground">
														{" "}
														(e.g., {item.examples.slice(0, 3).join(", ")})
													</span>
												)}
											</li>
										))}
								</ul>
							)}
							<div className="text-xs text-muted-foreground mt-3">
								Proceeding will delete this {entityName} and may affect related data. This action cannot be undone.
							</div>
						</div>
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="flex gap-2 sm:justify-end">
					<Button variant="outline" onClick={onClose} disabled={isLoading}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onProceed} disabled={isLoading}>
						{isLoading ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
								Deleting...
							</>
						) : (
							"Proceed with Delete"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}


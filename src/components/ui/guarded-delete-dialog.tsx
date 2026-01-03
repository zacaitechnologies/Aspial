'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { DeletionImpact } from '@/lib/deletion-impact'
import { formatDeletionImpact } from '@/lib/deletion-impact'

interface GuardedDeleteDialogProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	title: string
	description: string
	impact: DeletionImpact
	entityName: string
	confirmText?: string
	cancelText?: string
	isLoading?: boolean
}

const REQUIRED_CONFIRM_TEXT = 'delete'

export function GuardedDeleteDialog({
	isOpen,
	onClose,
	onConfirm,
	title,
	description,
	impact,
	entityName,
	confirmText = 'Delete Everything',
	cancelText = 'Cancel',
	isLoading = false
}: GuardedDeleteDialogProps) {
	const [confirmInput, setConfirmInput] = useState('')
	const [showForceDelete, setShowForceDelete] = useState(false)

	const hasRelations = impact.items.some(item => item.count > 0)
	const canDelete = !hasRelations || (showForceDelete && confirmInput === REQUIRED_CONFIRM_TEXT)

	const handleConfirm = () => {
		if (canDelete) {
			onConfirm()
			setConfirmInput('')
			setShowForceDelete(false)
		}
	}

	const handleClose = () => {
		setConfirmInput('')
		setShowForceDelete(false)
		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-full bg-red-50 border border-red-200">
							<AlertTriangle className="w-5 h-5 text-red-500" />
						</div>
						<DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
					</div>
					<DialogDescription className="text-sm text-muted-foreground mt-2">
						{description}
					</DialogDescription>
				</DialogHeader>

				{hasRelations && (
					<div className="space-y-4">
				<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
					<p className="text-sm font-medium text-yellow-800 mb-2">
						This {entityName} has related records:
					</p>
					<ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
						{impact.items
							.filter(item => item.count > 0)
							.map((item, idx) => (
								<li key={idx}>
									<strong>{item.count}</strong> {item.relation}
									{item.examples && item.examples.length > 0 && (
										<span className="text-yellow-600">
											{' '}(e.g., {item.examples.slice(0, 2).join(', ')})
										</span>
									)}
								</li>
							))}
					</ul>
					<p className="text-xs text-yellow-600 mt-2">
						Note: Some related records (like quotations) will remain, but their association with this {entityName} will be removed.
					</p>
				</div>

						{!showForceDelete ? (
							<div className="p-4 bg-red-50 border border-red-200 rounded-md">
								<p className="text-sm font-medium text-red-800 mb-2">
									⚠️ Warning: Deleting everything is not recommended
								</p>
								<p className="text-sm text-red-700 mb-3">
									This action will permanently delete all related records. This cannot be undone.
								</p>
								<Button
									variant="destructive"
									onClick={() => setShowForceDelete(true)}
									className="w-full"
								>
									<Trash2 className="w-4 h-4 mr-2" />
									Delete Everything (Not Recommended)
								</Button>
							</div>
						) : (
							<div className="p-4 bg-red-50 border border-red-200 rounded-md">
								<p className="text-sm font-medium text-red-800 mb-2">
									Type <strong>&quot;{REQUIRED_CONFIRM_TEXT}&quot;</strong> to confirm:
								</p>
								<Input
									type="text"
									value={confirmInput}
									onChange={(e) => setConfirmInput(e.target.value)}
									placeholder={REQUIRED_CONFIRM_TEXT}
									className="mt-2"
									autoFocus
								/>
								{confirmInput && confirmInput !== REQUIRED_CONFIRM_TEXT && (
									<p className="text-xs text-red-600 mt-1">
										Please type &quot;{REQUIRED_CONFIRM_TEXT}&quot; exactly
									</p>
								)}
							</div>
						)}
					</div>
				)}

				<DialogFooter className="flex gap-2 sm:justify-end">
					<Button
						variant="outline"
						onClick={handleClose}
						disabled={isLoading}
					>
						{cancelText}
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={!canDelete || isLoading}
					>
						{isLoading ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
								Processing...
							</>
						) : (
							confirmText
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}


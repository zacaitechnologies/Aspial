"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
	Download,
	MoreVertical,
	Loader2,
	Send,
	History,
	Eye,
	FileText,
	XCircle,
	CheckCircle,
} from "lucide-react"
import { InvoiceWithQuotation } from "../types"
import { generateInvoicePDF } from "../utils/pdfExport"
import { updateInvoiceAdmin, invalidateInvoicesCache, reactivateInvoiceWithReceipts } from "../action"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import SendInvoiceDialog from "./SendInvoiceDialog"
import EmailHistoryDialog from "./EmailHistoryDialog"
import CreateReceiptForm from "../../receipts/components/CreateReceiptForm"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getReceiptsForInvoice, invalidateReceiptsCache } from "../../receipts/action"

interface InvoiceCardProps {
	invoice: InvoiceWithQuotation
	onRefresh?: () => void
	isAdmin: boolean
	userId: string
}

export default function InvoiceCard({
	invoice,
	onRefresh,
	isAdmin,
	userId,
}: InvoiceCardProps) {
	// Check if current user is the invoice owner
	const isOwner = invoice.createdBy?.supabase_id === userId
	const router = useRouter()
	const [isMounted, setIsMounted] = useState(false)
	const [isExportingPDF, setIsExportingPDF] = useState(false)
	const [isSendInvoiceDialogOpen, setIsSendInvoiceDialogOpen] = useState(false)
	const [isEmailHistoryDialogOpen, setIsEmailHistoryDialogOpen] = useState(false)
	const [isTogglingStatus, setIsTogglingStatus] = useState(false)
	const [isCreateReceiptDialogOpen, setIsCreateReceiptDialogOpen] = useState(false)
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
	const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false)
	const [reactivateReceipts, setReactivateReceipts] = useState(false)
	const [activeReceiptsCount, setActiveReceiptsCount] = useState<number | null>(null)
	const isQuotationCancelled = invoice.quotation?.workflowStatus === "cancelled"

	// Prevent hydration errors from Radix UI dynamic IDs
	useEffect(() => {
		setIsMounted(true)
	}, [])

	// Fetch active receipts count when cancel dialog opens
	useEffect(() => {
		if (isCancelDialogOpen && invoice.status !== "cancelled") {
			getReceiptsForInvoice(invoice.id, undefined, true)
				.then(receipts => {
					setActiveReceiptsCount(receipts.filter(r => r.status === "active").length)
				})
				.catch(() => {
					setActiveReceiptsCount(0)
				})
		}
	}, [isCancelDialogOpen, invoice.id, invoice.status])

	const handleCancelInvoice = async () => {
		setIsCancelDialogOpen(false)
		setIsTogglingStatus(true)
		try {
			const newStatus = invoice.status === "cancelled" ? "active" : "cancelled"
			await updateInvoiceAdmin(invoice.id, { status: newStatus })
			await invalidateInvoicesCache()
			await invalidateReceiptsCache()
			toast({
				title: "Success",
				description: `Invoice ${newStatus === "cancelled" ? "cancelled" : "reactivated"} successfully.${newStatus === "cancelled" && activeReceiptsCount && activeReceiptsCount > 0 ? ` ${activeReceiptsCount} associated receipt${activeReceiptsCount > 1 ? "s have" : " has"} also been cancelled.` : ""}`,
			})
			if (onRefresh) {
				onRefresh()
			}
		} catch (error: unknown) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error toggling invoice status:", error)
			}
			const errorMessage = error instanceof Error ? error.message : "Failed to update invoice status. Please try again."
			toast({
				title: "Error",
				description: errorMessage,
				variant: "destructive",
			})
		} finally {
			setIsTogglingStatus(false)
			setActiveReceiptsCount(null)
		}
	}

	const getTypeBadge = (type: string) => {
		const colors: Record<string, string> = {
			SO: "bg-blue-600 text-white",
			EPO: "bg-purple-600 text-white",
			EO: "bg-green-600 text-white",
		}
		return (
			<Badge className={colors[type] || "bg-gray-600 text-white"}>
				{type}
			</Badge>
		)
	}

	const getStatusBadge = (status: string) => {
		if (status === "cancelled") {
			return (
				<Badge className="bg-red-600 text-white">
					Cancelled
				</Badge>
			)
		}
		return null
	}

	return (
		<Card 
			className="hover:shadow-md transition-shadow duration-200 border-l-2 border-l-primary pt-0 pb-0"
		>
			<CardContent className="p-3">
				<div className="flex items-center gap-3">
					{/* Left Section - Main Info */}
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<CardTitle 
								className="text-base font-semibold truncate text-gray-900"
								title={invoice.invoiceNumber}
							>
								{invoice.invoiceNumber}
							</CardTitle>
							<div className="flex items-center gap-1.5 shrink-0">
								{getTypeBadge(invoice.type)}
								{getStatusBadge(invoice.status)}
							</div>
						</div>
						
						{/* Client and Metadata - Single Line */}
						<div className="flex items-center gap-3 text-xs text-gray-600">
							{(invoice.quotation?.Client) && (
								<>
									<div className="flex items-center gap-1">
										<FileText className="w-3 h-3" />
										<span className="font-medium text-gray-900">
											{invoice.quotation.Client.name}
										</span>
									</div>
									<span className="text-gray-400">•</span>
								</>
							)}
							<span>Quotation: {invoice.quotation?.name || 'N/A'}</span>
							<span className="text-gray-400">•</span>
							<span>{new Date(invoice.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
							{invoice.createdBy && (
								<>
									<span className="text-gray-400">•</span>
									<span>By {invoice.createdBy.firstName} {invoice.createdBy.lastName}</span>
								</>
							)}
						</div>
					</div>

					{/* Right Section - Fixed Width for Alignment */}
					<div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
						{/* Invoice Amount - Compact */}
						<div className="text-right">
							<div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded px-3 py-1.5 border border-blue-200">
								<p className="text-[10px] text-gray-600 mb-0.5">Amount</p>
								<p className="text-lg font-bold text-blue-700">
									RM{invoice.amount.toFixed(2)}
								</p>
							</div>
						</div>

					{/* Three Dot Dropdown Menu */}
					{isMounted && (
						<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 w-8 p-0 hover:bg-gray-100 cursor-pointer"
										onClick={(e) => e.stopPropagation()}
										onPointerDown={(e) => e.stopPropagation()}
									>
										<MoreVertical className="w-4 h-4 text-gray-600" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent 
									align="end" 
									className="w-48"
									onClick={(e) => e.stopPropagation()}
									onPointerDown={(e) => e.stopPropagation()}
								>
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation()
											e.preventDefault()
											router.push(`/invoices/${invoice.id}`)
										}}
										onPointerDown={(e) => e.stopPropagation()}
										className="cursor-pointer"
									>
										<Eye className="w-4 h-4 mr-2" />
										View Invoice Details
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation()
											e.preventDefault()
											setIsCreateReceiptDialogOpen(true)
										}}
										onPointerDown={(e) => e.stopPropagation()}
										className="cursor-pointer"
									>
										<FileText className="w-4 h-4 mr-2" />
										Create Receipt
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation()
											e.preventDefault()
											setIsSendInvoiceDialogOpen(true)
										}}
										onPointerDown={(e) => e.stopPropagation()}
										className="cursor-pointer"
									>
										<Send className="w-4 h-4 mr-2" />
										Send Invoice PDF
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation()
											e.preventDefault()
											setIsEmailHistoryDialogOpen(true)
										}}
										onPointerDown={(e) => e.stopPropagation()}
										className="cursor-pointer"
									>
										<History className="w-4 h-4 mr-2" />
										Email History
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={async (e) => {
											e.stopPropagation()
											e.preventDefault()
											setIsExportingPDF(true)
											try {
												await generateInvoicePDF(invoice)
												toast({
													title: "Success",
													description: "PDF exported successfully.",
												})
											} catch (error) {
												if (process.env.NODE_ENV === 'development') {
													console.error("Error exporting PDF:", error)
												}
												toast({
													title: "Error",
													description: "Failed to export PDF. Please try again.",
													variant: "destructive",
												})
											} finally {
												setIsExportingPDF(false)
											}
										}}
										onPointerDown={(e) => e.stopPropagation()}
										className="cursor-pointer"
										disabled={isExportingPDF}
									>
										{isExportingPDF ? (
											<>
												<Loader2 className="w-4 h-4 mr-2 animate-spin" />
												Exporting...
											</>
										) : (
											<>
												<Download className="w-4 h-4 mr-2" />
												Export as PDF
											</>
										)}
									</DropdownMenuItem>
									{(isAdmin || isOwner) && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={(e) => {
													e.stopPropagation()
													e.preventDefault()
													if (invoice.status === "cancelled") {
														// Show reactivate dialog
														if (isQuotationCancelled) {
															toast({
																title: "Warning",
																description: "The quotation for this invoice is cancelled. You can still reactivate the invoice, but the quotation remains cancelled.",
																variant: "default",
															})
														}
														setIsReactivateDialogOpen(true)
													} else {
														// Show confirmation dialog for cancellation
														setIsCancelDialogOpen(true)
													}
												}}
												onPointerDown={(e) => e.stopPropagation()}
												className={`cursor-pointer ${invoice.status === "cancelled" ? "text-green-600" : "text-red-600"}`}
												disabled={isTogglingStatus}
											>
												{isTogglingStatus ? (
													<>
														<Loader2 className="w-4 h-4 mr-2 animate-spin" />
														Updating...
													</>
												) : invoice.status === "cancelled" ? (
													<>
														<CheckCircle className="w-4 h-4 mr-2" />
														Reactivate Invoice
													</>
												) : (
													<>
														<XCircle className="w-4 h-4 mr-2" />
														Cancel Invoice
													</>
												)}
											</DropdownMenuItem>
										</>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
					)}
				</div>
				</div>
			</CardContent>

			{/* Send Invoice Dialog */}
			<SendInvoiceDialog
				isOpen={isSendInvoiceDialogOpen}
				onOpenChange={setIsSendInvoiceDialogOpen}
				invoiceId={invoice.id}
				clientEmail={invoice.quotation?.Client?.email || ""}
				onSuccess={() => {
					if (onRefresh) {
						onRefresh()
					}
				}}
			/>

			{/* Email History Dialog */}
			<EmailHistoryDialog
				isOpen={isEmailHistoryDialogOpen}
				onOpenChange={setIsEmailHistoryDialogOpen}
				invoiceId={invoice.id}
			/>

			{/* Create Receipt Dialog */}
			<CreateReceiptForm
				isOpen={isCreateReceiptDialogOpen}
				onOpenChange={setIsCreateReceiptDialogOpen}
				prefilledInvoiceId={invoice.id}
				prefetchedInvoice={invoice}
				onSuccess={() => {
					if (onRefresh) {
						onRefresh()
					}
				}}
			/>

			{/* Cancel Invoice Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={isCancelDialogOpen}
				onClose={() => setIsCancelDialogOpen(false)}
				onConfirm={handleCancelInvoice}
				title="Cancel Invoice"
				description={
					activeReceiptsCount && activeReceiptsCount > 0
						? `Are you sure you want to cancel this invoice? This will also automatically cancel ${activeReceiptsCount} active receipt${activeReceiptsCount > 1 ? "s" : ""} associated with this invoice. This action cannot be undone.`
						: "Are you sure you want to cancel this invoice? This action cannot be undone."
				}
				confirmText="Cancel Invoice"
				cancelText="Keep Active"
				variant="warning"
				isLoading={isTogglingStatus}
			/>

			{/* Reactivate Invoice Dialog */}
			<ConfirmationDialog
				isOpen={isReactivateDialogOpen}
				onClose={() => {
					setIsReactivateDialogOpen(false)
					setReactivateReceipts(false)
				}}
				onConfirm={async () => {
					setIsReactivateDialogOpen(false)
					setIsTogglingStatus(true)
					try {
						await reactivateInvoiceWithReceipts(invoice.id, {
							reactivateReceipts,
						})
						await invalidateInvoicesCache()
						await invalidateReceiptsCache()
						toast({
							title: "Success",
							description: `Invoice reactivated successfully.${reactivateReceipts ? " Related receipts have also been reactivated." : ""}`,
						})
						if (onRefresh) {
							onRefresh()
						}
					} catch (error: unknown) {
						if (process.env.NODE_ENV === 'development') {
							console.error("Error reactivating invoice:", error)
						}
						const errorMessage = error instanceof Error ? error.message : "Failed to reactivate invoice. Please try again."
						toast({
							title: "Error",
							description: errorMessage,
							variant: "destructive",
						})
					} finally {
						setIsTogglingStatus(false)
						setReactivateReceipts(false)
					}
				}}
				title="Reactivate Invoice"
				description={
					<div className="space-y-4">
						<p>Are you sure you want to reactivate this invoice?</p>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="reactivate-receipts"
								checked={reactivateReceipts}
								onCheckedChange={(checked) => setReactivateReceipts(checked === true)}
							/>
							<Label htmlFor="reactivate-receipts" className="cursor-pointer">
								Also reactivate related receipts
							</Label>
						</div>
					</div>
				}
				confirmText="Reactivate"
				cancelText="Cancel"
				variant="default"
				isLoading={isTogglingStatus}
			/>
		</Card>
	)
}


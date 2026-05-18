"use client"

import { useState } from "react"
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
	Calendar,
} from "lucide-react"
import { formatNumber } from "@/lib/format-number"
import { ReceiptWithInvoice, PAYMENT_METHOD_LABELS, PaymentMethodType } from "../types"
import { generateReceiptPDF } from "../utils/pdfExport"
import { updateReceiptAdmin, invalidateReceiptsCache } from "../action"
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { formatLocalDate, formatMYTDateForDisplay } from "@/lib/date-utils"
import SendReceiptDialog from "./SendReceiptDialog"
import ReceiptEmailHistoryDialog from "./ReceiptEmailHistoryDialog"

interface ReceiptCardProps {
	receipt: ReceiptWithInvoice
	onRefresh?: () => void
	isAdmin: boolean
	userId: string
}

export default function ReceiptCard({
	receipt,
	onRefresh,
	isAdmin,
	userId,
}: ReceiptCardProps) {
	const isOwner = receipt.createdBy?.supabase_id === userId
	const router = useRouter()
	const [isExportingPDF, setIsExportingPDF] = useState(false)
	const [isSendReceiptDialogOpen, setIsSendReceiptDialogOpen] = useState(false)
	const [isEmailHistoryDialogOpen, setIsEmailHistoryDialogOpen] = useState(false)
	const [isTogglingStatus, setIsTogglingStatus] = useState(false)
	const [isEditDateDialogOpen, setIsEditDateDialogOpen] = useState(false)
	const [editReceiptDate, setEditReceiptDate] = useState("")
	const [isSavingDate, setIsSavingDate] = useState(false)

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
			className="hover:shadow-md transition-shadow duration-200 border-l-2 pt-0 pb-0"
			style={{ borderLeftColor: '#3b82f6' }}
		>
			<CardContent className="p-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
					<div className="min-w-0 flex-1 w-full">
						<div className="mb-1.5 flex flex-wrap items-center gap-2">
							<CardTitle 
								className="min-w-0 max-w-full truncate text-base font-semibold text-gray-900"
								title={receipt.receiptNumber}
							>
								{receipt.receiptNumber}
							</CardTitle>
							{getStatusBadge(receipt.status)}
						</div>
						
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
							{receipt.Client && (
								<>
									<div className="flex items-center gap-1">
										<FileText className="w-3 h-3" />
										<span className="font-medium text-gray-900">
											{receipt.Client.name}
										</span>
									</div>
									<span className="text-gray-400">•</span>
								</>
							)}
							{receipt.invoice ? (
								<span>Invoice: {receipt.invoice.invoiceNumber}</span>
							) : (
								<Badge variant="outline" className="text-[10px] py-0 px-1.5">Standalone</Badge>
							)}
							<span className="text-gray-400">•</span>
							<span>{formatMYTDateForDisplay(new Date(receipt.receiptDate ?? receipt.created_at), { includeYear: true })}</span>
							{receipt.paymentMethod && (
								<>
									<span className="text-gray-400">•</span>
									<span>{PAYMENT_METHOD_LABELS[receipt.paymentMethod as PaymentMethodType] || receipt.paymentMethod}</span>
								</>
							)}
							{receipt.advisors && receipt.advisors.length > 0 && (
								<>
									<span className="text-gray-400">•</span>
									<span>Advised by {receipt.advisors.map(a => `${a.firstName} ${a.lastName}`).join(", ")}</span>
								</>
							)}
						</div>
					</div>

					<div
						className="flex w-full shrink-0 items-center justify-between gap-2 border-t border-border/60 pt-3 sm:w-auto sm:border-t-0 sm:pt-0 sm:justify-end"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="text-right">
							<div className="rounded border border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 px-2.5 py-1.5 sm:px-3">
								<p className="mb-0.5 text-[10px] text-gray-600">Amount</p>
								<p className="text-lg font-bold text-blue-900">
									RM{formatNumber(receipt.amount)}
								</p>
							</div>
						</div>

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
											router.push(`/receipts/${receipt.id}`)
										}}
										onPointerDown={(e) => e.stopPropagation()}
										className="cursor-pointer"
									>
										<Eye className="w-4 h-4 mr-2" />
										View Receipt Details
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation()
											e.preventDefault()
											setIsSendReceiptDialogOpen(true)
										}}
										onPointerDown={(e) => e.stopPropagation()}
										className="cursor-pointer"
									>
										<Send className="w-4 h-4 mr-2" />
										Send Receipt PDF
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
												await generateReceiptPDF(receipt as any)
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
									{isAdmin && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={(e) => {
													e.stopPropagation()
													e.preventDefault()
													setEditReceiptDate(receipt.receiptDate ? formatLocalDate(new Date(receipt.receiptDate)) : formatLocalDate(new Date()))
													setIsEditDateDialogOpen(true)
												}}
												onPointerDown={(e) => e.stopPropagation()}
												className="cursor-pointer"
											>
												<Calendar className="w-4 h-4 mr-2" />
												Edit Receipt Date
											</DropdownMenuItem>
										</>
									)}
									{(isAdmin || isOwner) && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={async (e) => {
													e.stopPropagation()
													e.preventDefault()
													setIsTogglingStatus(true)
													try {
														const newStatus = receipt.status === "cancelled" ? "active" : "cancelled"
														await updateReceiptAdmin(receipt.id, { status: newStatus })
														await invalidateReceiptsCache()
														toast({
															title: "Success",
															description: `Receipt ${newStatus === "cancelled" ? "cancelled" : "reactivated"} successfully.`,
														})
														if (onRefresh) {
															onRefresh()
														}
													} catch (error) {
														if (process.env.NODE_ENV === 'development') {
															console.error("Error toggling receipt status:", error)
														}
														toast({
															title: "Error",
															description: error instanceof Error ? error.message : "Failed to update receipt status. Please try again.",
															variant: "destructive",
														})
													} finally {
														setIsTogglingStatus(false)
													}
												}}
												onPointerDown={(e) => e.stopPropagation()}
												className={`cursor-pointer ${receipt.status === "cancelled" ? "text-green-600" : "text-red-600"}`}
												disabled={isTogglingStatus}
											>
												{isTogglingStatus ? (
													<>
														<Loader2 className="w-4 h-4 mr-2 animate-spin" />
														Updating...
													</>
												) : receipt.status === "cancelled" ? (
													<>
														<CheckCircle className="w-4 h-4 mr-2" />
														Reactivate Receipt
													</>
												) : (
													<>
														<XCircle className="w-4 h-4 mr-2" />
														Cancel Receipt
													</>
												)}
											</DropdownMenuItem>
										</>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
					</div>
				</div>
			</CardContent>

			{/* Send Receipt Dialog */}
			<SendReceiptDialog
				isOpen={isSendReceiptDialogOpen}
				onOpenChange={setIsSendReceiptDialogOpen}
				receiptId={receipt.id}
				clientEmail={receipt.Client?.email || receipt.invoice?.quotation?.Client?.email || ""}
				onSuccess={() => {
					if (onRefresh) {
						onRefresh()
					}
				}}
			/>

			{/* Email History Dialog */}
			<ReceiptEmailHistoryDialog
				isOpen={isEmailHistoryDialogOpen}
				onOpenChange={setIsEmailHistoryDialogOpen}
				receiptId={receipt.id}
			/>

			{/* Edit Receipt Date Dialog (Admin only) */}
			<Dialog open={isEditDateDialogOpen} onOpenChange={setIsEditDateDialogOpen}>
				<DialogContent className="sm:max-w-[400px]" onClick={(e) => e.stopPropagation()}>
					<DialogHeader>
						<DialogTitle>Edit Receipt Date</DialogTitle>
						<DialogDescription>
							Change the receipt date. This will update the date shown on the receipt and PDF.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-receipt-date">Receipt Date</Label>
							<Input
								id="edit-receipt-date"
								type="date"
								value={editReceiptDate}
								onChange={(e) => setEditReceiptDate(e.target.value)}
								disabled={isSavingDate}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsEditDateDialogOpen(false)}
							disabled={isSavingDate}
						>
							Cancel
						</Button>
						<Button
							onClick={async () => {
								if (!editReceiptDate) return
								setIsSavingDate(true)
								try {
									await updateReceiptAdmin(receipt.id, { receiptDate: editReceiptDate })
									await invalidateReceiptsCache()
									toast({
										title: "Success",
										description: "Receipt date updated successfully.",
									})
									setIsEditDateDialogOpen(false)
									if (onRefresh) {
										onRefresh()
									}
								} catch (error: unknown) {
									if (process.env.NODE_ENV === "development") {
										console.error("Error updating receipt date:", error)
									}
									toast({
										title: "Error",
										description: error instanceof Error ? error.message : "Failed to update receipt date.",
										variant: "destructive",
									})
								} finally {
									setIsSavingDate(false)
								}
							}}
							disabled={isSavingDate || !editReceiptDate}
						>
							{isSavingDate ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								"Save"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	)
}


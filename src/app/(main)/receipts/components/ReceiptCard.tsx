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
} from "lucide-react"
import { ReceiptWithInvoice } from "../types"
import { generateReceiptPDF } from "../utils/pdfExport"
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
import SendReceiptDialog from "./SendReceiptDialog"
import ReceiptEmailHistoryDialog from "./ReceiptEmailHistoryDialog"

interface ReceiptCardProps {
	receipt: ReceiptWithInvoice
	onRefresh?: () => void
}

export default function ReceiptCard({
	receipt,
	onRefresh,
}: ReceiptCardProps) {
	const router = useRouter()
	const [isExportingPDF, setIsExportingPDF] = useState(false)
	const [isSendReceiptDialogOpen, setIsSendReceiptDialogOpen] = useState(false)
	const [isEmailHistoryDialogOpen, setIsEmailHistoryDialogOpen] = useState(false)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	return (
		<Card 
			className="hover:shadow-md transition-shadow duration-200 border-l-2 pt-0 pb-0"
			style={{ borderLeftColor: '#3b82f6' }}
		>
			<CardContent className="p-3">
				<div className="flex items-center gap-3">
					{/* Left Section - Main Info */}
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<CardTitle 
								className="text-base font-semibold truncate text-gray-900"
								title={receipt.receiptNumber}
							>
								{receipt.receiptNumber}
							</CardTitle>
						</div>
						
						{/* Client and Metadata - Single Line */}
						<div className="flex items-center gap-3 text-xs text-gray-600">
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
							<span>Invoice: {receipt.invoice?.invoiceNumber || 'N/A'}</span>
							<span className="text-gray-400">•</span>
							<span>{new Date(receipt.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
							{receipt.createdBy && (
								<>
									<span className="text-gray-400">•</span>
									<span>By {receipt.createdBy.firstName} {receipt.createdBy.lastName}</span>
								</>
							)}
						</div>
					</div>

					{/* Right Section - Fixed Width for Alignment */}
					<div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
						{/* Receipt Amount - Compact */}
						<div className="text-right">
							<div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded px-3 py-1.5 border border-blue-200">
								<p className="text-[10px] text-gray-600 mb-0.5">Amount</p>
								<p className="text-lg font-bold text-blue-700">
									RM{receipt.amount.toFixed(2)}
								</p>
							</div>
						</div>

						{/* Three Dot Dropdown Menu */}
						{mounted ? (
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
												console.error("Error exporting PDF:", error)
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
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 hover:bg-gray-100 cursor-pointer"
								disabled
							>
								<MoreVertical className="w-4 h-4 text-gray-600" />
							</Button>
						)}
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
		</Card>
	)
}


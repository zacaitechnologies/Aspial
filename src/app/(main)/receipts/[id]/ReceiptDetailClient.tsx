"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
	ArrowLeft,
	Calendar,
	User,
	Mail,
	Building2,
	Package,
	DollarSign,
	FileText,
	Download,
	Send,
	History,
	Loader2,
	XCircle,
	CheckCircle,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { generateReceiptPDF } from "../utils/pdfExport"
import SendReceiptDialog from "../components/SendReceiptDialog"
import ReceiptEmailHistoryDialog from "../components/ReceiptEmailHistoryDialog"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatLocalDate } from "@/lib/date-utils"
import { formatNumber } from "@/lib/format-number"
import { FormattedDescription } from "@/components/FormattedDescription"
import { updateReceiptAdmin, invalidateReceiptsCache } from "../action"

interface ReceiptDetailClientProps {
	receipt: NonNullable<Awaited<ReturnType<typeof import("../action").getReceiptFullById>>>
	isAdmin: boolean
	remainingAmount: number | null
}

export default function ReceiptDetailClient({
	receipt,
	isAdmin,
	remainingAmount,
}: ReceiptDetailClientProps) {
	const router = useRouter()
	const [isSendReceiptDialogOpen, setIsSendReceiptDialogOpen] = useState(false)
	const [isEmailHistoryDialogOpen, setIsEmailHistoryDialogOpen] = useState(false)
	const [isExportingPDF, setIsExportingPDF] = useState(false)
	const [isTogglingStatus, setIsTogglingStatus] = useState(false)
	const [isEditDateDialogOpen, setIsEditDateDialogOpen] = useState(false)
	const [editReceiptDate, setEditReceiptDate] = useState("")
	const [isSavingDate, setIsSavingDate] = useState(false)
	const isInvoiceCancelled = receipt.invoice?.status === "cancelled"

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

	const handleRefresh = async () => {
		// Invalidate cache and refresh the page
		await invalidateReceiptsCache()
		router.refresh()
	}

	return (
		<div className="container mx-auto p-6 max-w-6xl">
			{/* Header */}
			<div className="mb-6">
				<Button
					variant="ghost"
					onClick={() => router.push("/receipts")}
					className="mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Receipts
				</Button>
				<div className="flex justify-between items-start">
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-3xl font-bold">{receipt.receiptNumber}</h1>
							{receipt.status === "cancelled" && (
								<Badge className="bg-red-600 text-white">
									Cancelled
								</Badge>
							)}
						</div>
						<p className="text-muted-foreground mt-2">
							Invoice: {receipt.invoice?.invoiceNumber || 'N/A'} {receipt.invoice?.type && getTypeBadge(receipt.invoice.type)}
						</p>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => setIsSendReceiptDialogOpen(true)}
							className="flex items-center gap-2"
						>
							<Send className="w-4 h-4" />
							Send Email
						</Button>
						<Button
							variant="outline"
							onClick={() => setIsEmailHistoryDialogOpen(true)}
							className="flex items-center gap-2"
						>
							<History className="w-4 h-4" />
							Email History
						</Button>
						<Button
							variant="outline"
							onClick={async () => {
								setIsExportingPDF(true)
								try {
									await generateReceiptPDF(receipt)
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
							className="flex items-center gap-2"
							disabled={isExportingPDF}
						>
							{isExportingPDF ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Exporting...
								</>
							) : (
								<>
									<Download className="w-4 h-4" />
									Export PDF
								</>
							)}
						</Button>
						{isAdmin && (
							<Button
								variant="outline"
								onClick={() => {
									setEditReceiptDate(receipt.created_at ? formatLocalDate(new Date(receipt.created_at)) : formatLocalDate(new Date()))
									setIsEditDateDialogOpen(true)
								}}
								className="flex items-center gap-2"
								disabled={isSavingDate}
							>
								<Calendar className="w-4 h-4" />
								Edit Receipt Date
							</Button>
						)}
						{isAdmin && (
							<Button
								variant={receipt.status === "cancelled" ? "default" : "destructive"}
								onClick={async () => {
									if (receipt.status === "cancelled" && isInvoiceCancelled) {
										toast({
											title: "Cannot reactivate",
											description: "Cannot reactivate receipt because the invoice is cancelled. Please reactivate the invoice first.",
											variant: "destructive",
										})
										return
									}
									setIsTogglingStatus(true)
									try {
										const newStatus = receipt.status === "cancelled" ? "active" : "cancelled"
										await updateReceiptAdmin(receipt.id, { status: newStatus })
										await invalidateReceiptsCache()
										toast({
											title: "Success",
											description: `Receipt ${newStatus === "cancelled" ? "cancelled" : "reactivated"} successfully.`,
										})
										await handleRefresh()
									} catch (error: unknown) {
										if (process.env.NODE_ENV === 'development') {
											console.error("Error toggling receipt status:", error)
										}
										const errorMessage = error instanceof Error ? error.message : "Failed to update receipt status. Please try again."
										toast({
											title: "Error",
											description: errorMessage,
											variant: "destructive",
										})
									} finally {
										setIsTogglingStatus(false)
									}
								}}
								className="flex items-center gap-2"
								disabled={isTogglingStatus || (receipt.status === "cancelled" && isInvoiceCancelled)}
							>
								{isTogglingStatus ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Updating...
									</>
								) : receipt.status === "cancelled" ? (
									<>
										<CheckCircle className="w-4 h-4" />
										Reactivate
									</>
								) : (
									<>
										<XCircle className="w-4 h-4" />
										Cancel
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Client Information */}
					{receipt.invoice?.quotation?.Client && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<User className="w-5 h-5" />
									Client Information
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Name</p>
										<p className="font-medium">{receipt.invoice.quotation.Client.name}</p>
									</div>
									{receipt.invoice.quotation.Client.company && (
										<div>
											<p className="text-sm font-medium text-muted-foreground">Company</p>
											<p className="font-medium flex items-center gap-1">
												<Building2 className="w-4 h-4" />
												{receipt.invoice.quotation.Client.company}
											</p>
										</div>
									)}
									<div>
										<p className="text-sm font-medium text-muted-foreground">Email</p>
										<p className="font-medium flex items-center gap-1">
											<Mail className="w-4 h-4" />
											{receipt.invoice.quotation.Client.email}
										</p>
									</div>
									{receipt.invoice.quotation.Client.phone && (
										<div>
											<p className="text-sm font-medium text-muted-foreground">Phone</p>
											<p className="font-medium">{receipt.invoice.quotation.Client.phone}</p>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Invoice Reference */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="w-5 h-5" />
								Invoice Reference
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
								<p className="font-medium">{receipt.invoice?.invoiceNumber || 'N/A'}</p>
							</div>
							{receipt.invoice?.quotation?.name && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Quotation Number</p>
									<p className="font-medium">{receipt.invoice.quotation.name}</p>
								</div>
							)}
							{receipt.invoice?.quotation?.description && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Description</p>
									<p className="font-medium">{receipt.invoice.quotation.description}</p>
								</div>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.push(`/invoices/${receipt.invoiceId}`)}
							>
								View Invoice Details
							</Button>
						</CardContent>
					</Card>

					{/* Services from Quotation */}
					{receipt.invoice?.quotation?.services && receipt.invoice.quotation.services.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Package className="w-5 h-5" />
									Services
								</CardTitle>
								<CardDescription>
									Services from referenced quotation
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{receipt.invoice.quotation.services
										.filter((qs) => !qs.customServiceId)
										.map((qs) => (
											<div
												key={qs.id}
												className="flex justify-between items-start p-3 border rounded-lg"
											>
												<div className="flex-1">
													<p className="font-medium">{qs.service?.name ?? ""}</p>
													<FormattedDescription
														text={qs.service?.description ?? ""}
														className="text-sm text-muted-foreground"
													/>
												</div>
												<Badge variant="outline" className="ml-4">
													RM{formatNumber(qs.service?.basePrice ?? 0)}
												</Badge>
											</div>
										))}
									{receipt.invoice.quotation.customServices && receipt.invoice.quotation.customServices
										.filter((cs) => cs.status === "APPROVED")
										.map((cs) => (
											<div
												key={cs.id}
												className="flex justify-between items-start p-3 border rounded-lg bg-blue-50"
											>
												<div className="flex-1">
													<p className="font-medium">{cs.name}</p>
													<FormattedDescription
														text={cs.description}
														className="text-sm text-muted-foreground"
													/>
												</div>
												<Badge variant="outline" className="ml-4">
													RM{formatNumber(cs.price)}
												</Badge>
											</div>
										))}
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Receipt Summary */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<DollarSign className="w-5 h-5" />
								Receipt Summary
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Invoice Amount:</span>
								<span className="font-semibold">
									RM{receipt.invoice?.amount != null ? formatNumber(receipt.invoice.amount) : '0.00'}
								</span>
							</div>

							<Separator />

							<div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
								<div>
									<p className="text-sm font-semibold text-blue-800">
										Receipt Amount:
									</p>
								</div>
								<span className="text-2xl font-bold text-blue-800">
									RM{formatNumber(receipt.amount)}
								</span>
							</div>

							<Separator />

							<div className="flex justify-between">
								<span className="text-muted-foreground">Amount Received (up to this receipt):</span>
								<span className="font-semibold">
									RM{formatNumber((receipt.invoice?.amount || 0) - (remainingAmount ?? 0))}
								</span>
							</div>

							<div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
								<div>
									<p className="text-sm font-semibold text-green-800">
										Remaining Amount:
									</p>
									<p className="text-xs text-green-600 mt-1">
										(At time of receipt creation)
									</p>
								</div>
								<span className="text-2xl font-bold text-green-800">
									RM{formatNumber(remainingAmount ?? 0)}
								</span>
							</div>
						</CardContent>
					</Card>

					{/* Timeline */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="w-5 h-5" />
								Timeline
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created</p>
								<p className="font-medium">
									{new Date(receipt.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created By</p>
								<p className="font-medium">
									{receipt.createdBy.firstName} {receipt.createdBy.lastName}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Send Receipt Dialog */}
			<SendReceiptDialog
				isOpen={isSendReceiptDialogOpen}
				onOpenChange={setIsSendReceiptDialogOpen}
				receiptId={receipt.id}
				clientEmail={receipt.invoice?.quotation?.Client?.email || ""}
				onSuccess={handleRefresh}
			/>

			{/* Email History Dialog */}
			<ReceiptEmailHistoryDialog
				isOpen={isEmailHistoryDialogOpen}
				onOpenChange={setIsEmailHistoryDialogOpen}
				receiptId={receipt.id}
			/>

			{/* Edit Receipt Date Dialog (Admin only) */}
			<Dialog open={isEditDateDialogOpen} onOpenChange={setIsEditDateDialogOpen}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>Edit Receipt Date</DialogTitle>
						<DialogDescription>
							Change the receipt date. This will update the date shown on the receipt and PDF.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-receipt-date-detail">Receipt Date</Label>
							<Input
								id="edit-receipt-date-detail"
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
									await handleRefresh()
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
		</div>
	)
}

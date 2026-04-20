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
import { generateInvoicePDF } from "../utils/pdfExport"
import SendInvoiceDialog from "../components/SendInvoiceDialog"
import EmailHistoryDialog from "../components/EmailHistoryDialog"
import CreateReceiptForm from "../../receipts/components/CreateReceiptForm"
import { getReceiptsForInvoice, updateReceiptAdmin, invalidateReceiptsCache } from "../../receipts/action"
import { updateInvoiceAdmin, invalidateInvoicesCache, reactivateInvoiceWithReceipts } from "../action"
import { formatNumber } from "@/lib/format-number"
import { FormattedDescription } from "@/components/FormattedDescription"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatLocalDate } from "@/lib/date-utils"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { useSession } from "../../contexts/SessionProvider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

type InvoiceFull = NonNullable<Awaited<ReturnType<typeof import("../action").getInvoiceFullById>>>
type ReceiptForInvoice = Awaited<ReturnType<typeof import("../../receipts/action").getReceiptsForInvoice>>[0]

interface InvoiceDetailClientProps {
	invoice: InvoiceFull
	receipts: ReceiptForInvoice[]
	isAdmin: boolean
	userId: string
	quotationGrandTotal: number
	remainingAmount: number
}

export default function InvoiceDetailClient({
	invoice,
	receipts: initialReceipts,
	isAdmin,
	userId,
	quotationGrandTotal,
	remainingAmount,
}: InvoiceDetailClientProps) {
	const router = useRouter()
	const { enhancedUser } = useSession()
	const isCreator = invoice.createdBy?.supabase_id === userId
	const currentDbUserId = enhancedUser?.profile?.id
	const isAdvisor = Boolean(
		currentDbUserId && invoice.advisors?.some((a) => a.id === currentDbUserId),
	)
	const isOwner = isCreator || isAdvisor
	const [isSendInvoiceDialogOpen, setIsSendInvoiceDialogOpen] = useState(false)
	const [isEmailHistoryDialogOpen, setIsEmailHistoryDialogOpen] = useState(false)
	const [isExportingPDF, setIsExportingPDF] = useState(false)
	const [isCreateReceiptDialogOpen, setIsCreateReceiptDialogOpen] = useState(false)
	const [receipts, setReceipts] = useState(initialReceipts)
	const [isTogglingStatus, setIsTogglingStatus] = useState(false)
	const [togglingReceiptId, setTogglingReceiptId] = useState<string | null>(null)
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
	const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false)
	const [reactivateReceipts, setReactivateReceipts] = useState(false)
	const [isEditDateDialogOpen, setIsEditDateDialogOpen] = useState(false)
	const [editInvoiceDate, setEditInvoiceDate] = useState("")
	const [isSavingDate, setIsSavingDate] = useState(false)
	const isQuotationCancelled = invoice.quotation?.workflowStatus === "cancelled"

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
		await Promise.all([
			invalidateInvoicesCache(),
			invalidateReceiptsCache(),
		])
		router.refresh()
	}

	const handleRefreshReceipts = async () => {
		try {
			const updatedReceipts = await getReceiptsForInvoice(invoice.id, undefined, false)
			setReceipts(updatedReceipts)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error loading receipts:", error)
			}
		}
	}

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
				description: `Invoice ${newStatus === "cancelled" ? "cancelled" : "reactivated"} successfully.${newStatus === "cancelled" && receipts.filter(r => r.status === "active").length > 0 ? " All associated receipts have also been cancelled." : ""}`,
			})
			await handleRefresh()
		} catch (error) {
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
		}
	}

	const handleReactivateInvoice = async () => {
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
			await handleRefresh()
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
	}

	const activeReceiptsCount = receipts.filter(r => r.status === "active").length

	return (
		<div className="container mx-auto p-6 max-w-6xl">
			{/* Header */}
			<div className="mb-6">
				<Button
					variant="ghost"
					onClick={() => router.push("/invoices")}
					className="mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Invoices
				</Button>
				<div className="flex justify-between items-start">
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-3xl font-bold">{invoice.invoiceNumber}</h1>
							{invoice.status === "cancelled" && (
								<Badge className="bg-red-600 text-white">
									Cancelled
								</Badge>
							)}
						</div>
						<p className="text-muted-foreground mt-2">
							Invoice Type: {getTypeBadge(invoice.type)}
						</p>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => setIsCreateReceiptDialogOpen(true)}
							className="flex items-center gap-2"
						>
							<FileText className="w-4 h-4" />
							Create Receipt
						</Button>
						<Button
							variant="outline"
							onClick={() => setIsSendInvoiceDialogOpen(true)}
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
									await generateInvoicePDF(invoice as any)
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
									setEditInvoiceDate(invoice.invoiceDate ? formatLocalDate(new Date(invoice.invoiceDate)) : formatLocalDate(new Date()))
									setIsEditDateDialogOpen(true)
								}}
								className="flex items-center gap-2"
								disabled={isSavingDate}
							>
								<Calendar className="w-4 h-4" />
								Edit Invoice Date
							</Button>
						)}
						{(isAdmin || isOwner) && (
							<Button
								variant={invoice.status === "cancelled" ? "default" : "destructive"}
								onClick={() => {
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
								className="flex items-center gap-2"
								disabled={isTogglingStatus}
							>
								{isTogglingStatus ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Updating...
									</>
								) : invoice.status === "cancelled" ? (
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
					{invoice.quotation?.Client && (
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
										<p className="font-medium">{invoice.quotation.Client.name}</p>
									</div>
									{invoice.quotation.Client.company && (
										<div>
											<p className="text-sm font-medium text-muted-foreground">Company</p>
											<p className="font-medium flex items-center gap-1">
												<Building2 className="w-4 h-4" />
												{invoice.quotation.Client.company}
											</p>
										</div>
									)}
									<div>
										<p className="text-sm font-medium text-muted-foreground">Email</p>
										<p className="font-medium flex items-center gap-1">
											<Mail className="w-4 h-4" />
											{invoice.quotation.Client.email}
										</p>
									</div>
									{invoice.quotation.Client.phone && (
										<div>
											<p className="text-sm font-medium text-muted-foreground">Phone</p>
											<p className="font-medium">{invoice.quotation.Client.phone}</p>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Quotation Reference */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="w-5 h-5" />
								Quotation Reference
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Quotation Number</p>
								<p className="font-medium">{invoice.quotation?.name || 'N/A'}</p>
							</div>
							{invoice.quotation?.description && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Description</p>
									<p className="font-medium">{invoice.quotation.description}</p>
								</div>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.push(`/quotations/${invoice.quotationId}`)}
							>
								View Quotation Details
							</Button>
						</CardContent>
					</Card>

					{/* Services from Quotation */}
					{invoice.quotation?.services && invoice.quotation.services.length > 0 && (
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
									{invoice.quotation.services
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
									{invoice.quotation.customServices && invoice.quotation.customServices
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

					{/* Receipts List */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="w-5 h-5" />
								Receipts
							</CardTitle>
							<CardDescription>
								All receipts created for this invoice
							</CardDescription>
						</CardHeader>
						<CardContent>
							{receipts.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									No receipts created yet.
								</p>
							) : (
								<div className="space-y-2">
									{receipts.map((receipt) => (
										<div
											key={receipt.id}
											className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
										>
											<div 
												className="flex-1 min-w-0 cursor-pointer"
												onClick={() => router.push(`/receipts/${receipt.id}`)}
											>
												<div className="flex items-center gap-2">
													<p className="font-semibold text-sm">{receipt.receiptNumber}</p>
													{receipt.status === "cancelled" && (
														<Badge className="bg-red-600 text-white text-xs">
															Cancelled
														</Badge>
													)}
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													{new Date(receipt.receiptDate ?? receipt.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
												</p>
											</div>
											<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
												<div className="text-right">
													<p className="font-bold text-sm">RM{formatNumber(receipt.amount)}</p>
												</div>
												{isAdmin && (
													<Button
														variant={receipt.status === "cancelled" ? "default" : "destructive"}
														size="sm"
														onClick={async () => {
															setTogglingReceiptId(receipt.id)
															try {
																const newStatus = receipt.status === "cancelled" ? "active" : "cancelled"
																await updateReceiptAdmin(receipt.id, { status: newStatus })
																await invalidateReceiptsCache()
																toast({
																	title: "Success",
																	description: `Receipt ${newStatus === "cancelled" ? "cancelled" : "reactivated"} successfully.`,
																})
																await handleRefreshReceipts()
															} catch (error) {
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
																setTogglingReceiptId(null)
															}
														}}
														disabled={togglingReceiptId === receipt.id}
													>
														{togglingReceiptId === receipt.id ? (
															<Loader2 className="w-4 h-4 animate-spin" />
														) : receipt.status === "cancelled" ? (
															<CheckCircle className="w-4 h-4" />
														) : (
															<XCircle className="w-4 h-4" />
														)}
													</Button>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Invoice Summary */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<DollarSign className="w-5 h-5" />
								Invoice Summary
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Quotation Total:</span>
								<span className="font-semibold">
									RM{formatNumber(quotationGrandTotal)}
								</span>
							</div>

							<Separator />

							<div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
								<div>
									<p className="text-sm font-semibold text-blue-800">
										Invoice Amount:
									</p>
								</div>
								<span className="text-2xl font-bold text-blue-800">
									RM{formatNumber(invoice.amount)}
								</span>
							</div>

							<Separator />

							<div className="flex justify-between">
								<span className="text-muted-foreground">Remaining Amount:</span>
								<span className={`font-semibold ${remainingAmount < 0 ? 'text-red-600' : ''}`}>
									RM{formatNumber(remainingAmount)}
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
								<p className="text-sm font-medium text-muted-foreground">Invoice date</p>
								<p className="font-medium">
									{new Date(invoice.invoiceDate ?? invoice.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Record created</p>
								<p className="font-medium">
									{new Date(invoice.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created By</p>
								<p className="font-medium">
									{invoice.createdBy.firstName} {invoice.createdBy.lastName}
								</p>
							</div>
							{invoice.advisors && invoice.advisors.length > 0 && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Advisors</p>
									<p className="font-medium">
										{invoice.advisors.map((a) => `${a.firstName} ${a.lastName}`).join(', ')}
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Send Invoice Dialog */}
			<SendInvoiceDialog
				isOpen={isSendInvoiceDialogOpen}
				onOpenChange={setIsSendInvoiceDialogOpen}
				invoiceId={invoice.id}
				clientEmail={invoice.quotation?.Client?.email || ""}
				onSuccess={handleRefresh}
			/>

			{/* Email History Dialog */}
			<EmailHistoryDialog
				isOpen={isEmailHistoryDialogOpen}
				onOpenChange={setIsEmailHistoryDialogOpen}
				invoiceId={invoice.id}
			/>

			{/* Edit Invoice Date Dialog (Admin only) */}
			<Dialog open={isEditDateDialogOpen} onOpenChange={setIsEditDateDialogOpen}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>Edit Invoice Date</DialogTitle>
						<DialogDescription>
							Change the invoice date. This will update the date shown on the invoice and PDF.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-invoice-date-detail">Invoice Date</Label>
							<Input
								id="edit-invoice-date-detail"
								type="date"
								value={editInvoiceDate}
								onChange={(e) => setEditInvoiceDate(e.target.value)}
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
								if (!editInvoiceDate) return
								setIsSavingDate(true)
								try {
									await updateInvoiceAdmin(invoice.id, { invoiceDate: editInvoiceDate })
									await invalidateInvoicesCache()
									toast({
										title: "Success",
										description: "Invoice date updated successfully.",
									})
									setIsEditDateDialogOpen(false)
									await handleRefresh()
								} catch (error: unknown) {
									if (process.env.NODE_ENV === "development") {
										console.error("Error updating invoice date:", error)
									}
									toast({
										title: "Error",
										description: error instanceof Error ? error.message : "Failed to update invoice date.",
										variant: "destructive",
									})
								} finally {
									setIsSavingDate(false)
								}
							}}
							disabled={isSavingDate || !editInvoiceDate}
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

			{/* Create Receipt Dialog */}
			<CreateReceiptForm
				isOpen={isCreateReceiptDialogOpen}
				onOpenChange={setIsCreateReceiptDialogOpen}
				prefilledInvoiceId={invoice.id}
				prefetchedInvoice={invoice}
				isAdminProp={isAdmin}
				onSuccess={async () => {
					await handleRefresh()
					await handleRefreshReceipts()
				}}
			/>

			{/* Reactivate Invoice Dialog */}
			<ConfirmationDialog
				isOpen={isReactivateDialogOpen}
				onClose={() => {
					setIsReactivateDialogOpen(false)
					setReactivateReceipts(false)
				}}
				onConfirm={handleReactivateInvoice}
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

			{/* Cancel Invoice Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={isCancelDialogOpen}
				onClose={() => setIsCancelDialogOpen(false)}
				onConfirm={handleCancelInvoice}
				title="Cancel Invoice"
				description={
					activeReceiptsCount > 0
						? `Are you sure you want to cancel this invoice? This will also automatically cancel ${activeReceiptsCount} active receipt${activeReceiptsCount > 1 ? "s" : ""} associated with this invoice. This action cannot be undone.`
						: "Are you sure you want to cancel this invoice? This action cannot be undone."
				}
				confirmText="Cancel Invoice"
				cancelText="Keep Active"
				variant="warning"
				isLoading={isTogglingStatus}
			/>
		</div>
	)
}

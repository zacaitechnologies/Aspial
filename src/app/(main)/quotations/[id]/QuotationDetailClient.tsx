"use client"

import { useRouter } from "next/navigation"
import { useState, useMemo, useCallback } from "react"
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
	AlertCircle,
	CheckCircle,
	XCircle,
	Clock,
	Download,
	Send,
	History,
	Loader2,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { workflowStatusOptions, paymentStatusOptions } from "../types"
import { generateQuotationPDF } from "../utils/pdfExport"
import SendQuotationDialog from "../components/SendQuotationDialog"
import EmailHistoryDialog from "../components/EmailHistoryDialog"
import CreateInvoiceForm from "../../invoices/components/CreateInvoiceForm"
import { updateInvoiceAdmin, invalidateInvoicesCache } from "../../invoices/action"
import { invalidateQuotationsCache, reactivateQuotationCascade } from "../action"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useSession } from "../../contexts/SessionProvider"
import type { QuotationWithServices } from "../types"

type QuotationFull = NonNullable<Awaited<ReturnType<typeof import("../action").getQuotationFullById>>>
type InvoiceForQuotation = Awaited<ReturnType<typeof import("../action").getInvoicesForQuotation>>[0]

interface QuotationDetailClientProps {
	quotation: QuotationFull
	invoices: InvoiceForQuotation[]
	isAdmin: boolean
}

export default function QuotationDetailClient({
	quotation,
	invoices: initialInvoices,
	isAdmin,
}: QuotationDetailClientProps) {
	const router = useRouter()
	const { enhancedUser } = useSession()
	const [isSendQuotationDialogOpen, setIsSendQuotationDialogOpen] = useState(false)
	const [isEmailHistoryDialogOpen, setIsEmailHistoryDialogOpen] = useState(false)
	const [isExportingPDF, setIsExportingPDF] = useState(false)
	const [isCreateInvoiceDialogOpen, setIsCreateInvoiceDialogOpen] = useState(false)
	const [invoices, setInvoices] = useState(initialInvoices)
	const [togglingInvoiceId, setTogglingInvoiceId] = useState<string | null>(null)
	const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false)
	const [reactivateInvoices, setReactivateInvoices] = useState(false)
	const [reactivateReceipts, setReactivateReceipts] = useState(false)
	const [isReactivating, setIsReactivating] = useState(false)
	const isCancelled = quotation.workflowStatus === "cancelled"

	// Memoize badge functions
	const getWorkflowStatusBadge = useCallback((status: string) => {
		const statusConfig = workflowStatusOptions.find((opt) => opt.value === status)
		return (
			<Badge variant={statusConfig?.color || "secondary"}>
				{statusConfig?.label || status}
			</Badge>
		)
	}, [])

	const getPaymentStatusBadge = useCallback((status: string) => {
		const statusConfig = paymentStatusOptions.find((opt) => opt.value === status)
		return (
			<Badge variant={statusConfig?.color || "secondary"}>
				{statusConfig?.label || status}
			</Badge>
		)
	}, [])

	const getCustomServiceStatusBadge = (status: string) => {
		switch (status) {
			case "APPROVED":
				return (
					<Badge variant="default" className="bg-primary text-primary-foreground">
						<CheckCircle className="w-3 h-3 mr-1" />
						Approved
					</Badge>
				)
			case "REJECTED":
				return (
					<Badge variant="destructive">
						<XCircle className="w-3 h-3 mr-1" />
						Rejected
					</Badge>
				)
			default:
				return (
					<Badge variant="secondary">
						<Clock className="w-3 h-3 mr-1" />
						Pending
					</Badge>
				)
		}
	}

	// Use quotation's totalPrice directly - always show the full amount regardless of invoices
	const quotationGrandTotal = quotation?.totalPrice || 0

	const handleRefresh = async () => {
		// Invalidate cache and refresh the page
		await Promise.all([
			invalidateQuotationsCache(),
			invalidateInvoicesCache(),
		])
		router.refresh()
	}

	const handleRefreshInvoices = async () => {
		try {
			const { getInvoicesForQuotation } = await import("../action")
			const updatedInvoices = await getInvoicesForQuotation(quotation.id)
			setInvoices(updatedInvoices)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error loading invoices:", error)
			}
		}
	}

	return (
		<div className="container mx-auto p-6 max-w-6xl">
			{/* Header */}
			<div className="mb-6">
				<Button
					variant="ghost"
					onClick={() => router.push("/quotations")}
					className="mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Quotations
				</Button>
				<div className="flex justify-between items-start">
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-3xl font-bold">{quotation.name}</h1>
							{getWorkflowStatusBadge(quotation.workflowStatus)}
							{getPaymentStatusBadge(quotation.paymentStatus)}
						</div>
						<p className="text-muted-foreground mt-2">
							{quotation.description || "No description"}
						</p>
					</div>
					<div className="flex gap-2">
						{isCancelled && (isAdmin || quotation.createdBy?.supabase_id === enhancedUser?.id) && (
							<Button
								variant="default"
								onClick={() => setIsReactivateDialogOpen(true)}
								className="flex items-center gap-2"
							>
								<CheckCircle className="w-4 h-4" />
								Reactivate Quotation
							</Button>
						)}
						{!isCancelled && (
							<Button
								variant="outline"
								onClick={() => setIsCreateInvoiceDialogOpen(true)}
								className="flex items-center gap-2"
							>
								<FileText className="w-4 h-4" />
								Create Invoice
							</Button>
						)}
						<Button
							variant="outline"
							onClick={() => setIsSendQuotationDialogOpen(true)}
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
									await generateQuotationPDF(quotation as QuotationWithServices)
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
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Client Information */}
					{quotation.Client && (
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
										<p className="font-medium">{quotation.Client.name}</p>
									</div>
									{quotation.Client.company && (
										<div>
											<p className="text-sm font-medium text-muted-foreground">Company</p>
											<p className="font-medium flex items-center gap-1">
												<Building2 className="w-4 h-4" />
												{quotation.Client.company}
											</p>
										</div>
									)}
									<div>
										<p className="text-sm font-medium text-muted-foreground">Email</p>
										<p className="font-medium flex items-center gap-1">
											<Mail className="w-4 h-4" />
											{quotation.Client.email}
										</p>
									</div>
									{quotation.Client.phone && (
										<div>
											<p className="text-sm font-medium text-muted-foreground">Phone</p>
											<p className="font-medium">{quotation.Client.phone}</p>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Services */}
					{quotation.services && quotation.services.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Package className="w-5 h-5" />
									Services
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{quotation.services
										.filter((qs) => !qs.customServiceId)
										.map((qs) => (
											<div
												key={qs.id}
												className="flex justify-between items-start p-3 border rounded-lg"
											>
												<div className="flex-1">
													<p className="font-medium">{qs.service.name}</p>
													<p className="text-sm text-muted-foreground">
														{qs.service.description}
													</p>
												</div>
												<Badge variant="outline" className="ml-4">
													RM{qs.service.basePrice.toFixed(2)}
												</Badge>
											</div>
										))}
									{quotation.customServices && quotation.customServices
										.filter((cs) => cs.status === "APPROVED")
										.map((cs) => (
											<div
												key={cs.id}
												className="flex justify-between items-start p-3 border rounded-lg bg-blue-50"
											>
												<div className="flex-1">
													<p className="font-medium">{cs.name}</p>
													<p className="text-sm text-muted-foreground">
														{cs.description}
													</p>
													<div className="mt-1">
														{getCustomServiceStatusBadge(cs.status)}
													</div>
												</div>
												<Badge variant="outline" className="ml-4">
													RM{cs.price.toFixed(2)}
												</Badge>
											</div>
										))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Invoices List */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="w-5 h-5" />
								Invoices
							</CardTitle>
							<CardDescription>
								All invoices created for this quotation
							</CardDescription>
						</CardHeader>
						<CardContent>
							{invoices.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									No invoices created yet.
								</p>
							) : (
								<div className="space-y-2">
									{invoices.map((invoice) => (
										<div
											key={invoice.id}
											className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
										>
											<div 
												className="flex-1 min-w-0 cursor-pointer"
												onClick={() => router.push(`/invoices/${invoice.id}`)}
											>
												<div className="flex items-center gap-2">
													<p className="font-semibold text-sm">{invoice.invoiceNumber}</p>
													{invoice.status === "cancelled" && (
														<Badge className="bg-red-600 text-white text-xs">
															Cancelled
														</Badge>
													)}
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													{new Date(invoice.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
												</p>
											</div>
											<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
												<div className="text-right">
													<p className="font-bold text-sm">RM{invoice.amount.toFixed(2)}</p>
												</div>
												{isAdmin && (
													<Button
														variant={invoice.status === "cancelled" ? "default" : "destructive"}
														size="sm"
														onClick={async () => {
															if (invoice.status === "cancelled" && isCancelled) {
																toast({
																	title: "Cannot reactivate",
																	description: "Cannot reactivate invoice because the quotation is cancelled. Please reactivate the quotation first.",
																	variant: "destructive",
																})
																return
															}
															setTogglingInvoiceId(invoice.id)
															try {
																const newStatus = invoice.status === "cancelled" ? "active" : "cancelled"
																await updateInvoiceAdmin(invoice.id, { status: newStatus })
																await invalidateInvoicesCache()
																toast({
																	title: "Success",
																	description: `Invoice ${newStatus === "cancelled" ? "cancelled" : "reactivated"} successfully.`,
																})
																await handleRefreshInvoices()
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
																setTogglingInvoiceId(null)
															}
														}}
														disabled={togglingInvoiceId === invoice.id || (invoice.status === "cancelled" && isCancelled)}
													>
														{togglingInvoiceId === invoice.id ? (
															<Loader2 className="w-4 h-4 animate-spin" />
														) : invoice.status === "cancelled" ? (
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
					{/* Quotation Summary */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<DollarSign className="w-5 h-5" />
								Quotation Summary
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
								<div>
									<p className="text-sm font-semibold text-blue-800">
										Grand Total:
									</p>
								</div>
								<span className="text-2xl font-bold text-blue-800">
									RM{quotationGrandTotal.toFixed(2)}
								</span>
							</div>

							{quotation.discountValue && quotation.discountValue > 0 && (
								<>
									<Separator />
									<div className="flex justify-between">
										<span className="text-muted-foreground">Discount:</span>
										<span className="font-semibold">
											{quotation.discountType === "percentage"
												? `${quotation.discountValue}%`
												: `RM${quotation.discountValue.toFixed(2)}`}
										</span>
									</div>
								</>
							)}
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
									{new Date(quotation.created_at).toLocaleDateString()}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created By</p>
								<p className="font-medium">
									{quotation.createdBy.firstName} {quotation.createdBy.lastName}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Send Quotation Dialog */}
			<SendQuotationDialog
				isOpen={isSendQuotationDialogOpen}
				onOpenChange={setIsSendQuotationDialogOpen}
				quotationId={quotation.id}
				clientEmail={quotation.Client?.email || ""}
				onSuccess={handleRefresh}
			/>

			{/* Reactivate Quotation Dialog */}
			<ConfirmationDialog
				isOpen={isReactivateDialogOpen}
				onClose={() => {
					setIsReactivateDialogOpen(false)
					setReactivateInvoices(false)
					setReactivateReceipts(false)
				}}
				onConfirm={async () => {
					setIsReactivating(true)
					try {
						await reactivateQuotationCascade(quotation.id, {
							reactivateInvoices,
							reactivateReceipts,
						})
						toast({
							title: "Success",
							description: "Quotation reactivated successfully.",
						})
						await handleRefresh()
					} catch (error: unknown) {
						if (process.env.NODE_ENV === 'development') {
							console.error("Error reactivating quotation:", error)
						}
						const errorMessage = error instanceof Error ? error.message : "Failed to reactivate quotation. Please try again."
						toast({
							title: "Error",
							description: errorMessage,
							variant: "destructive",
						})
					} finally {
						setIsReactivating(false)
						setIsReactivateDialogOpen(false)
						setReactivateInvoices(false)
						setReactivateReceipts(false)
					}
				}}
				title="Reactivate Quotation"
				description={
					<div className="space-y-4">
						<p>Are you sure you want to reactivate this quotation? It will be set back to "final" status.</p>
						<div className="space-y-3">
							<div className="flex items-center space-x-2">
								<Checkbox
									id="reactivate-invoices"
									checked={reactivateInvoices}
									onCheckedChange={(checked) => setReactivateInvoices(checked === true)}
								/>
								<Label htmlFor="reactivate-invoices" className="cursor-pointer">
									Also reactivate related invoices
								</Label>
							</div>
							{reactivateInvoices && (
								<div className="flex items-center space-x-2 ml-6">
									<Checkbox
										id="reactivate-receipts"
										checked={reactivateReceipts}
										onCheckedChange={(checked) => setReactivateReceipts(checked === true)}
									/>
									<Label htmlFor="reactivate-receipts" className="cursor-pointer">
										Also reactivate related receipts
									</Label>
								</div>
							)}
						</div>
					</div>
				}
				confirmText="Reactivate"
				cancelText="Cancel"
				variant="default"
				isLoading={isReactivating}
			/>

			{/* Email History Dialog */}
			<EmailHistoryDialog
				isOpen={isEmailHistoryDialogOpen}
				onOpenChange={setIsEmailHistoryDialogOpen}
				quotationId={quotation.id}
			/>

			{/* Create Invoice Dialog */}
			<CreateInvoiceForm
				isOpen={isCreateInvoiceDialogOpen}
				onOpenChange={setIsCreateInvoiceDialogOpen}
				prefilledQuotationId={quotation.id}
				onSuccess={async () => {
					await handleRefresh()
					await handleRefreshInvoices()
				}}
			/>
		</div>
	)
}

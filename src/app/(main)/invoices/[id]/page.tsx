"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
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
	AlertCircle,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { generateInvoicePDF } from "../utils/pdfExport"
import { useInvoiceCache } from "../hooks/useInvoiceCache"
import SendInvoiceDialog from "../components/SendInvoiceDialog"
import EmailHistoryDialog from "../components/EmailHistoryDialog"
import LoadingProgress from "../../quotations/components/LoadingProgress"
import CreateReceiptForm from "../../receipts/components/CreateReceiptForm"
import { getReceiptsForInvoice } from "../../receipts/action"

export default function InvoiceDetailPage() {
	const params = useParams()
	const router = useRouter()
	const { invoice, isLoading, onRefresh } = useInvoiceCache(params.id as string, { fetchFullData: true })
	const [mounted, setMounted] = useState(false)
	const [isSendInvoiceDialogOpen, setIsSendInvoiceDialogOpen] = useState(false)
	const [isEmailHistoryDialogOpen, setIsEmailHistoryDialogOpen] = useState(false)
	const [isExportingPDF, setIsExportingPDF] = useState(false)
	const [isCreateReceiptDialogOpen, setIsCreateReceiptDialogOpen] = useState(false)
	const [receipts, setReceipts] = useState<any[]>([])
	const [isLoadingReceipts, setIsLoadingReceipts] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	// Load receipts for this invoice
	useEffect(() => {
		if (invoice?.id) {
			setIsLoadingReceipts(true)
			getReceiptsForInvoice(invoice.id)
				.then((data) => {
					setReceipts(data)
				})
				.catch((error) => {
					console.error("Error loading receipts:", error)
				})
				.finally(() => {
					setIsLoadingReceipts(false)
				})
		}
	}, [invoice?.id])

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

	// Memoize calculations to avoid recalculating on every render
	const quotationGrandTotal = useMemo(() => {
		if (!invoice?.quotation) return 0
		const regularServices = invoice.quotation.services.filter((qs) => !qs.customServiceId)
		const servicesTotal = regularServices.reduce(
			(sum, serviceItem) => sum + serviceItem.service.basePrice,
			0
		)
		const approvedCustomServicesTotal = (invoice.quotation.customServices || [])
			.filter((cs) => cs.status === "APPROVED")
			.reduce((sum, cs) => sum + cs.price, 0)
		const subtotal = servicesTotal + approvedCustomServicesTotal

		let discountAmount = 0
		if (invoice.quotation.discountValue && invoice.quotation.discountValue > 0) {
			discountAmount =
				invoice.quotation.discountType === "percentage"
					? (subtotal * invoice.quotation.discountValue) / 100
					: invoice.quotation.discountValue
		}

		return subtotal - discountAmount
	}, [invoice?.quotation])

	const remainingAmount = useMemo(() => {
		return quotationGrandTotal - (invoice?.amount || 0)
	}, [quotationGrandTotal, invoice?.amount])

	// Prevent hydration mismatch by only showing loading after mount
	if (!mounted || isLoading) {
		return (
			<div className="container mx-auto p-6 max-w-6xl">
				<div className="mb-6">
					<Button
						variant="ghost"
						onClick={() => router.push("/invoices")}
						className="mb-4"
						disabled
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Invoices
					</Button>
				</div>
				<LoadingProgress message="Loading invoice details..." size="lg" className="h-64" />
			</div>
		)
	}

	if (!invoice) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardContent className="p-6 text-center">
						<AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
						<p className="text-muted-foreground">Invoice not found</p>
						<Button onClick={() => router.push("/invoices")} className="mt-4">
							Back to Invoices
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

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
						<h1 className="text-3xl font-bold">{invoice.invoiceNumber}</h1>
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
									await generateInvoicePDF(invoice)
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
									{invoice.quotation.customServices && invoice.quotation.customServices
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
							{isLoadingReceipts ? (
								<div className="flex items-center justify-center py-4">
									<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
								</div>
							) : receipts.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									No receipts created yet.
								</p>
							) : (
								<div className="space-y-2">
									{receipts.map((receipt) => (
										<div
											key={receipt.id}
											className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
											onClick={() => router.push(`/receipts/${receipt.id}`)}
										>
											<div className="flex-1 min-w-0">
												<p className="font-semibold text-sm">{receipt.receiptNumber}</p>
												<p className="text-xs text-muted-foreground mt-1">
													{new Date(receipt.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
												</p>
											</div>
											<div className="text-right">
												<p className="font-bold text-sm">RM{receipt.amount.toFixed(2)}</p>
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
									RM{quotationGrandTotal.toFixed(2)}
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
									RM{invoice.amount.toFixed(2)}
								</span>
							</div>

							<Separator />

							<div className="flex justify-between">
								<span className="text-muted-foreground">Remaining Amount:</span>
								<span className={`font-semibold ${remainingAmount < 0 ? 'text-red-600' : ''}`}>
									RM{remainingAmount.toFixed(2)}
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
									{new Date(invoice.created_at).toLocaleDateString()}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created By</p>
								<p className="font-medium">
									{invoice.createdBy.firstName} {invoice.createdBy.lastName}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Send Invoice Dialog */}
			{invoice && (
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
			)}

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
				onSuccess={() => {
					if (onRefresh) {
						onRefresh()
					}
					// Refresh receipts list
					if (invoice?.id) {
						getReceiptsForInvoice(invoice.id)
							.then((data) => {
								setReceipts(data)
							})
							.catch((error) => {
								console.error("Error loading receipts:", error)
							})
					}
				}}
			/>
		</div>
	)
}


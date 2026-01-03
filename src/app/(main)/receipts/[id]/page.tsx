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
import { generateReceiptPDF } from "../utils/pdfExport"
import { useReceiptCache } from "../hooks/useReceiptCache"
import SendReceiptDialog from "../components/SendReceiptDialog"
import ReceiptEmailHistoryDialog from "../components/ReceiptEmailHistoryDialog"
import LoadingProgress from "../../quotations/components/LoadingProgress"
import { getReceiptsForInvoice } from "../action"

export default function ReceiptDetailPage() {
	const params = useParams()
	const router = useRouter()
	const { receipt, isLoading, onRefresh } = useReceiptCache(params.id as string, { fetchFullData: true })
	const [mounted, setMounted] = useState(false)
	const [isSendReceiptDialogOpen, setIsSendReceiptDialogOpen] = useState(false)
	const [isEmailHistoryDialogOpen, setIsEmailHistoryDialogOpen] = useState(false)
	const [isExportingPDF, setIsExportingPDF] = useState(false)
	const [remainingAmount, setRemainingAmount] = useState<number | null>(null)
	const [isLoadingRemaining, setIsLoadingRemaining] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	// Calculate remaining amount based on receipts created at or before this receipt
	useEffect(() => {
		if (receipt?.id && receipt?.invoiceId && receipt?.created_at) {
			setIsLoadingRemaining(true)
			const receiptCreatedAt = new Date(receipt.created_at)
			getReceiptsForInvoice(receipt.invoiceId, receiptCreatedAt)
				.then((allReceipts) => {
					const totalReceived = allReceipts.reduce((sum, r) => sum + r.amount, 0)
					const invoiceAmount = receipt.invoice?.amount || 0
					const remaining = invoiceAmount - totalReceived
					setRemainingAmount(Math.max(0, remaining))
				})
				.catch((error) => {
					console.error("Error calculating remaining amount:", error)
				})
				.finally(() => {
					setIsLoadingRemaining(false)
				})
		}
	}, [receipt?.id, receipt?.invoiceId, receipt?.created_at, receipt?.invoice?.amount])

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

	// Prevent hydration mismatch by only showing loading after mount
	if (!mounted || isLoading) {
		return (
			<div className="container mx-auto p-6 max-w-6xl">
				<div className="mb-6">
					<Button
						variant="ghost"
						onClick={() => router.push("/receipts")}
						className="mb-4"
						disabled
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Receipts
					</Button>
				</div>
				<LoadingProgress message="Loading receipt details..." size="lg" className="h-64" />
			</div>
		)
	}

	if (!receipt) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardContent className="p-6 text-center">
						<AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
						<p className="text-muted-foreground">Receipt not found</p>
						<Button onClick={() => router.push("/receipts")} className="mt-4">
							Back to Receipts
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
					onClick={() => router.push("/receipts")}
					className="mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Receipts
				</Button>
				<div className="flex justify-between items-start">
					<div>
						<h1 className="text-3xl font-bold">{receipt.receiptNumber}</h1>
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
									{receipt.invoice.quotation.customServices && receipt.invoice.quotation.customServices
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
									RM{receipt.invoice?.amount.toFixed(2) || '0.00'}
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
									RM{receipt.amount.toFixed(2)}
								</span>
							</div>

							<Separator />

							<div className="flex justify-between">
								<span className="text-muted-foreground">Amount Received (up to this receipt):</span>
								<span className="font-semibold">
									{isLoadingRemaining ? (
										<Loader2 className="w-4 h-4 animate-spin inline" />
									) : (
										`RM${((receipt.invoice?.amount || 0) - (remainingAmount ?? 0)).toFixed(2)}`
									)}
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
									{isLoadingRemaining ? (
										<Loader2 className="w-6 h-6 animate-spin" />
									) : (
										`RM${(remainingAmount ?? 0).toFixed(2)}`
									)}
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
									{new Date(receipt.created_at).toLocaleDateString()}
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
			{receipt && (
				<SendReceiptDialog
					isOpen={isSendReceiptDialogOpen}
					onOpenChange={setIsSendReceiptDialogOpen}
					receiptId={receipt.id}
					clientEmail={receipt.invoice?.quotation?.Client?.email || ""}
					onSuccess={() => {
						if (onRefresh) {
							onRefresh()
						}
					}}
				/>
			)}

			{/* Email History Dialog */}
			<ReceiptEmailHistoryDialog
				isOpen={isEmailHistoryDialogOpen}
				onOpenChange={setIsEmailHistoryDialogOpen}
				receiptId={receipt.id}
			/>
		</div>
	)
}


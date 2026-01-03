"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Search, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { createInvoice, searchQuotationsForInvoice } from "../action"
import { InvoiceFormData, invoiceTypeOptions } from "../types"
import { useSession } from "../../contexts/SessionProvider"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getQuotationById } from "../../quotations/action"

interface CreateInvoiceFormProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
	prefilledQuotationId?: number
}

export default function CreateInvoiceForm({
	isOpen,
	onOpenChange,
	onSuccess,
	prefilledQuotationId,
}: CreateInvoiceFormProps) {
	const { enhancedUser } = useSession()
	const [invoiceForm, setInvoiceForm] = useState<InvoiceFormData>({
		quotationId: prefilledQuotationId,
		type: "SO",
		amount: "",
	})
	const [isSaving, setIsSaving] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [searchResults, setSearchResults] = useState<any[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null)
	const [quotationGrandTotal, setQuotationGrandTotal] = useState<number>(0)
	const [amountWarning, setAmountWarning] = useState<string>("")

	// Load prefilled quotation if provided
	useEffect(() => {
		if (prefilledQuotationId && isOpen) {
			// Fetch quotation details
			handleQuotationSelect(prefilledQuotationId)
		}
	}, [prefilledQuotationId, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

	// Calculate quotation grand total when quotation is selected
	useEffect(() => {
		if (selectedQuotation) {
			// Calculate grand total including custom services and discount
			const regularServices = selectedQuotation.services?.filter((qs: any) => !qs.customServiceId) || []
			const servicesTotal = regularServices.reduce(
				(sum: number, serviceItem: any) => sum + (serviceItem.service?.basePrice || 0),
				0
			)
			const approvedCustomServicesTotal = (selectedQuotation.customServices || [])
				.filter((cs: any) => cs.status === "APPROVED")
				.reduce((sum: number, cs: any) => sum + (cs.price || 0), 0)
			const subtotal = servicesTotal + approvedCustomServicesTotal

			let discountAmount = 0
			if (selectedQuotation.discountValue && selectedQuotation.discountValue > 0) {
				discountAmount =
					selectedQuotation.discountType === "percentage"
						? (subtotal * selectedQuotation.discountValue) / 100
						: selectedQuotation.discountValue
			}

			const grandTotal = subtotal - discountAmount
			setQuotationGrandTotal(grandTotal)
		}
	}, [selectedQuotation])

	// Validate amount when it changes
	useEffect(() => {
		if (invoiceForm.amount && quotationGrandTotal > 0) {
			const amount = parseFloat(invoiceForm.amount)
			if (isNaN(amount) || amount <= 0) {
				setAmountWarning("Amount must be greater than 0")
			} else if (amount > quotationGrandTotal) {
				setAmountWarning(`Warning: Invoice amount (RM${amount.toFixed(2)}) exceeds quotation total (RM${quotationGrandTotal.toFixed(2)})`)
			} else {
				setAmountWarning("")
			}
		} else {
			setAmountWarning("")
		}
	}, [invoiceForm.amount, quotationGrandTotal])

	const handleSearch = useCallback(async () => {
		if (!searchQuery.trim()) {
			setSearchResults([])
			return
		}

		setIsSearching(true)
		try {
			const results = await searchQuotationsForInvoice(searchQuery)
			setSearchResults(results)
		} catch (error) {
			console.error("Error searching quotations:", error)
			toast({
				title: "Error",
				description: "Failed to search quotations. Please try again.",
				variant: "destructive",
			})
		} finally {
			setIsSearching(false)
		}
	}, [searchQuery])

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			if (searchQuery.trim()) {
				handleSearch()
			} else {
				setSearchResults([])
			}
		}, 300)

		return () => clearTimeout(timer)
	}, [searchQuery, handleSearch])

	const handleQuotationSelect = async (quotationId: number) => {
		// Find quotation in search results first
		const quotation = searchResults.find(q => q.id === quotationId)
		
		if (quotation) {
			// If found in search results, use it
			setSelectedQuotation(quotation)
			setInvoiceForm(prev => ({ ...prev, quotationId }))
			setSearchQuery("")
			setSearchResults([])
		} else {
			// If not in results (e.g., prefilled from quotation page), fetch it
			try {
				const fetchedQuotation = await getQuotationById(quotationId.toString())
				if (fetchedQuotation) {
					setSelectedQuotation(fetchedQuotation)
					setInvoiceForm(prev => ({ ...prev, quotationId }))
				} else {
					toast({
						title: "Error",
						description: "Quotation not found.",
						variant: "destructive",
					})
				}
			} catch (error) {
				console.error("Error fetching quotation:", error)
				toast({
					title: "Error",
					description: "Failed to fetch quotation details. Please try again.",
					variant: "destructive",
				})
			}
		}
	}

	const handleCreateInvoice = async () => {
		if (!invoiceForm.quotationId) {
			toast({
				title: "Validation Error",
				description: "Please select a quotation.",
				variant: "destructive",
			})
			return
		}

		if (!invoiceForm.amount || parseFloat(invoiceForm.amount) <= 0) {
			toast({
				title: "Validation Error",
				description: "Please enter a valid invoice amount.",
				variant: "destructive",
			})
			return
		}

		if (!enhancedUser?.id) {
			toast({
				title: "Error",
				description: "User not authenticated.",
				variant: "destructive",
			})
			return
		}

		setIsSaving(true)
		try {
			await createInvoice({
				quotationId: invoiceForm.quotationId,
				type: invoiceForm.type,
				amount: parseFloat(invoiceForm.amount),
				createdById: enhancedUser.id,
			})

			toast({
				title: "Success",
				description: "Invoice created successfully.",
			})

			// Reset form
			setInvoiceForm({
				quotationId: undefined,
				type: "SO",
				amount: "",
			})
			setSelectedQuotation(null)
			setSearchQuery("")
			setSearchResults([])
			setAmountWarning("")

			onSuccess()
			onOpenChange(false)
		} catch (error: any) {
			console.error("Error creating invoice:", error)
			toast({
				title: "Error",
				description: error.message || "Failed to create invoice. Please try again.",
				variant: "destructive",
			})
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Create New Invoice</DialogTitle>
					<DialogDescription>
						Create an invoice linked to a quotation. Search and select a quotation to reference.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					{/* Quotation Search */}
					<div className="space-y-2">
						<Label htmlFor="quotation-search">Search Quotation <span className="text-red-500">*</span></Label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								id="quotation-search"
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search by quotation number, description, or client name..."
								className="pl-10"
								disabled={!!selectedQuotation || isSaving}
							/>
							{isSearching && (
								<Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
							)}
						</div>

						{/* Search Results */}
						{searchResults.length > 0 && !selectedQuotation && (
							<div className="border rounded-lg max-h-60 overflow-y-auto">
								{searchResults.map((quotation) => (
									<Card
										key={quotation.id}
										className="cursor-pointer hover:bg-gray-50 border-0 border-b last:border-b-0 rounded-none"
										onClick={() => handleQuotationSelect(quotation.id)}
									>
										<CardContent className="p-3">
											<div className="flex justify-between items-start">
												<div>
													<p className="font-semibold">{quotation.name}</p>
													<p className="text-sm text-muted-foreground">{quotation.description}</p>
													{quotation.Client && (
														<p className="text-xs text-muted-foreground mt-1">
															Client: {quotation.Client.name} {quotation.Client.company && `(${quotation.Client.company})`}
														</p>
													)}
												</div>
												<Badge variant="outline">RM{quotation.totalPrice.toFixed(2)}</Badge>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}

						{/* Selected Quotation Display */}
						{selectedQuotation && (
							<Card className="bg-green-50 border-green-200">
								<CardContent className="p-3">
									<div className="flex justify-between items-start">
										<div>
											<div className="flex items-center gap-2 mb-1">
												<CheckCircle className="w-4 h-4 text-green-600" />
												<p className="font-semibold text-green-900">{selectedQuotation.name}</p>
											</div>
											<p className="text-sm text-green-700">{selectedQuotation.description}</p>
											{selectedQuotation.Client && (
												<p className="text-xs text-green-600 mt-1">
													Client: {selectedQuotation.Client.name} {selectedQuotation.Client.company && `(${selectedQuotation.Client.company})`}
												</p>
											)}
										</div>
										<div className="text-right">
											<p className="text-xs text-green-600">Quotation Total</p>
											<p className="font-bold text-green-900">RM{quotationGrandTotal.toFixed(2)}</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="mt-2 text-green-700 hover:text-green-900"
										onClick={() => {
											setSelectedQuotation(null)
											setInvoiceForm(prev => ({ ...prev, quotationId: undefined }))
										}}
									>
										Change Quotation
									</Button>
								</CardContent>
							</Card>
						)}
					</div>

					{/* Invoice Type */}
					<div className="space-y-2">
						<Label htmlFor="invoice-type">Invoice Type <span className="text-red-500">*</span></Label>
						<Select
							value={invoiceForm.type}
							onValueChange={(value: "SO" | "EPO" | "EO") =>
								setInvoiceForm(prev => ({ ...prev, type: value }))
							}
							disabled={isSaving}
						>
							<SelectTrigger id="invoice-type">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{invoiceTypeOptions.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Invoice Amount */}
					<div className="space-y-2">
						<Label htmlFor="invoice-amount">Invoice Amount (RM) <span className="text-red-500">*</span></Label>
						<Input
							id="invoice-amount"
							type="number"
							step="0.01"
							min="0"
							value={invoiceForm.amount}
							onChange={(e) =>
								setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))
							}
							placeholder="0.00"
							disabled={!selectedQuotation || isSaving}
						/>
						{amountWarning && (
							<div className={`flex items-center gap-2 p-2 rounded-md ${
								amountWarning.includes("Warning") 
									? "bg-yellow-50 border border-yellow-200 text-yellow-800"
									: "bg-red-50 border border-red-200 text-red-800"
							}`}>
								<AlertTriangle className="w-4 h-4" />
								<p className="text-sm">{amountWarning}</p>
							</div>
						)}
						{selectedQuotation && !amountWarning && invoiceForm.amount && (
							<div className="flex items-center gap-2 p-2 rounded-md bg-green-50 border border-green-200 text-green-800">
								<CheckCircle className="w-4 h-4" />
								<p className="text-sm">Amount is valid</p>
							</div>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							onOpenChange(false)
							setInvoiceForm({
								quotationId: undefined,
								type: "SO",
								amount: "",
							})
							setSelectedQuotation(null)
							setSearchQuery("")
							setSearchResults([])
							setAmountWarning("")
						}}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button
						onClick={handleCreateInvoice}
						disabled={isSaving || !invoiceForm.quotationId || !invoiceForm.amount || parseFloat(invoiceForm.amount) <= 0}
						className="gap-2"
					>
						{isSaving ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Creating...
							</>
						) : (
							"Create Invoice"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}


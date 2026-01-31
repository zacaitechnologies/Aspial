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
import { createInvoice, searchQuotationsForInvoice, invalidateInvoicesCache } from "../action"
import { InvoiceFormData, invoiceTypeOptions } from "../types"
import { useSession } from "../../contexts/SessionProvider"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getQuotationById, getAllUsers } from "../../quotations/action"
import { checkIsAdmin } from "../../actions/admin-actions"
import type { QuotationWithServices } from "../../quotations/types"

interface CreateInvoiceFormProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
	prefilledQuotationId?: number
	/** When opening from a quotation card, pass the quotation to avoid refetch and speed up popup */
	prefetchedQuotation?: QuotationWithServices | null
	/** Pass isAdmin from parent to skip redundant check (speeds up dialog open) */
	isAdminProp?: boolean
}

export default function CreateInvoiceForm({
	isOpen,
	onOpenChange,
	onSuccess,
	prefilledQuotationId,
	prefetchedQuotation,
	isAdminProp,
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
	const [isAdmin, setIsAdmin] = useState(false)
	const [users, setUsers] = useState<Array<{ id: string; supabase_id: string; firstName: string; lastName: string; email: string }>>([])
	const [selectedCreatedById, setSelectedCreatedById] = useState<string>("")

	// Use isAdminProp if provided (from parent) to skip redundant check
	useEffect(() => {
		if (!isOpen || !enhancedUser?.id) return
		// If isAdminProp is explicitly passed, use it and skip check
		if (isAdminProp !== undefined) {
			setIsAdmin(isAdminProp)
			if (isAdminProp) {
				// Still need to fetch users for admin
				getAllUsers().then(setUsers).catch(() => {})
			}
			return
		}
		// Otherwise, check admin status
		const checkAdminAndFetchUsers = async () => {
			try {
				const adminStatus = await checkIsAdmin(enhancedUser.id)
				setIsAdmin(adminStatus)
				if (adminStatus) {
					const allUsers = await getAllUsers()
					setUsers(allUsers)
				}
			} catch (error) {
				if (process.env.NODE_ENV === 'development') {
					console.error("Error checking admin status:", error)
				}
			}
		}
		checkAdminAndFetchUsers()
	}, [isOpen, enhancedUser?.id, isAdminProp])

	// Load prefilled quotation: use prefetched when available to avoid slow fetch
	useEffect(() => {
		if (!prefilledQuotationId || !isOpen) return
		if (prefetchedQuotation && prefetchedQuotation.id === prefilledQuotationId) {
			setSelectedQuotation(prefetchedQuotation)
			setInvoiceForm(prev => ({ ...prev, quotationId: prefilledQuotationId }))
			if (prefetchedQuotation.createdBy?.supabase_id) {
				setSelectedCreatedById(prefetchedQuotation.createdBy.supabase_id)
			}
			setSearchQuery("")
			setSearchResults([])
			return
		}
		handleQuotationSelect(prefilledQuotationId)
	}, [prefilledQuotationId, isOpen, prefetchedQuotation?.id]) // eslint-disable-line react-hooks/exhaustive-deps

	// Calculate quotation grand total when quotation is selected.
	// Use stored totalPrice as primary (source of truth on quotation); fall back to recalculated from line items
	// when totalPrice is missing/0 (recalculation can be 0 if services are missing or custom services not APPROVED).
	useEffect(() => {
		if (selectedQuotation) {
			const storedTotal = Number(selectedQuotation.totalPrice) || 0

			const regularServices = selectedQuotation.services?.filter((qs: QuotationWithServices['services'][0]) => !qs.customServiceId) || []
			const servicesTotal = regularServices.reduce(
				(sum: number, serviceItem: QuotationWithServices['services'][0]) => sum + (serviceItem.service?.basePrice || 0),
				0
			)
			const approvedCustomServicesTotal = (selectedQuotation.customServices || [])
				.filter((cs: NonNullable<QuotationWithServices['customServices']>[0]) => cs.status === "APPROVED")
				.reduce((sum: number, cs: NonNullable<QuotationWithServices['customServices']>[0]) => sum + (cs.price || 0), 0)
			const subtotal = servicesTotal + approvedCustomServicesTotal

			let discountAmount = 0
			if (selectedQuotation.discountValue && selectedQuotation.discountValue > 0) {
				discountAmount =
					selectedQuotation.discountType === "percentage"
						? (subtotal * selectedQuotation.discountValue) / 100
						: selectedQuotation.discountValue
			}

			const calculatedTotal = Math.max(0, subtotal - discountAmount)
			// Prefer stored total when it has a value so we don't show 0 when line-item recalculation fails
			const grandTotal = storedTotal > 0 ? storedTotal : calculatedTotal
			setQuotationGrandTotal(grandTotal)
			// Pre-fill invoice amount when quotation total is available
			if (grandTotal > 0) {
				setInvoiceForm(prev => ({ ...prev, amount: grandTotal.toFixed(2) }))
			}
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
			if (process.env.NODE_ENV === 'development') {
				console.error("Error searching quotations:", error)
			}
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
		// Always fetch full quotation data to ensure we have all fields needed for calculation
		// (services, customServices, discountValue, discountType, etc.)
		try {
			const fetchedQuotation = await getQuotationById(quotationId.toString())
			if (fetchedQuotation) {
				setSelectedQuotation(fetchedQuotation)
				setInvoiceForm(prev => ({ ...prev, quotationId }))
				// If admin, set default createdById to quotation creator
				if (isAdmin && fetchedQuotation.createdBy?.supabase_id) {
					setSelectedCreatedById(fetchedQuotation.createdBy.supabase_id)
				}
				setSearchQuery("")
				setSearchResults([])
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
				// Only pass createdById if admin selected someone (non-admin will be set to self server-side)
				createdById: isAdmin && selectedCreatedById ? selectedCreatedById : undefined,
			})

			// Invalidate cache on client side to ensure invoices page refreshes
			await invalidateInvoicesCache()

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
			setSelectedCreatedById("")
			setSearchQuery("")
			setSearchResults([])
			setAmountWarning("")

			onSuccess()
			onOpenChange(false)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error creating invoice:", error)
			}
			const errorMessage = error instanceof Error ? error.message : "Failed to create invoice. Please try again."
			toast({
				title: "Error",
				description: errorMessage,
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

					{/* Created By (Admin Only) */}
					{isAdmin && (
						<div className="space-y-2">
							<Label htmlFor="created-by">Created By (Advisor)</Label>
							<Select
								value={selectedCreatedById}
								onValueChange={setSelectedCreatedById}
								disabled={!selectedQuotation || isSaving}
							>
								<SelectTrigger id="created-by">
									<SelectValue placeholder="Select advisor" />
								</SelectTrigger>
								<SelectContent>
									{users.map((user) => (
										<SelectItem key={user.supabase_id} value={user.supabase_id}>
											{user.firstName} {user.lastName} ({user.email})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								Defaults to quotation creator. You can select a different advisor.
							</p>
						</div>
					)}
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


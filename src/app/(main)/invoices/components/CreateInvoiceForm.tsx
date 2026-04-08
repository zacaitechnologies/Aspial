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
import { MultiSelectAdvisors } from "@/components/ui/multi-select-advisors"
import { Search, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { createInvoice, searchQuotationsForInvoice, invalidateInvoicesCache } from "../action"
import { InvoiceFormData, invoiceTypeOptions } from "../types"
import { useSession } from "../../contexts/SessionProvider"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/format-number"
import { formatLocalDate } from "@/lib/date-utils"
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
		invoiceDate: formatLocalDate(new Date()),
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
	/** Advisor IDs: User.id (cuid) - defaults to quotation advisors */
	const [selectedAdvisorIds, setSelectedAdvisorIds] = useState<string[]>([])
	/** Current user's DB id (cuid) for non-admin self-inclusion logic */
	const [currentDbUserId, setCurrentDbUserId] = useState<string>("")

	// Use isAdminProp if provided (from parent) to skip redundant check
	// Always fetch users so all users see the advisor picker
	useEffect(() => {
		if (!isOpen || !enhancedUser?.id) return
		const init = async () => {
			try {
				// Determine admin status
				let adminStatus: boolean
				if (isAdminProp !== undefined) {
					adminStatus = isAdminProp
				} else {
					adminStatus = await checkIsAdmin(enhancedUser.id)
				}
				setIsAdmin(adminStatus)
				// Always fetch all users for the advisor multi-select
				const allUsers = await getAllUsers()
				setUsers(allUsers)
				// Find the current user's DB id (cuid) from users list
				const me = allUsers.find((u) => u.supabase_id === enhancedUser.id)
				if (me) {
					setCurrentDbUserId(me.id)
				}
			} catch (error) {
				if (process.env.NODE_ENV === 'development') {
					console.error("Error initializing form:", error)
				}
			}
		}
		init()
	}, [isOpen, enhancedUser?.id, isAdminProp])

	// Load prefilled quotation: always fetch full quotation (services + customServices with real prices)
	// so invoice total = all standard services + approved custom services. List/prefetched shape often
	// has service.basePrice = 0, which would show only custom service amount.
	// Keep dependency array length constant (3 items) to satisfy React's useEffect rules.
	useEffect(() => {
		if (!prefilledQuotationId || !isOpen) return
		handleQuotationSelect(prefilledQuotationId)
	}, [prefilledQuotationId, isOpen, prefetchedQuotation?.id]) // eslint-disable-line react-hooks/exhaustive-deps

	// Sync advisors whenever the referenced quotation changes (inherit from quotation's advisors)
	useEffect(() => {
		if (selectedQuotation) {
			let ids: string[] = []
			if (Array.isArray(selectedQuotation.advisors) && selectedQuotation.advisors.length > 0) {
				ids = selectedQuotation.advisors.map((a: any) => a.id).filter(Boolean)
			}
			// Non-admin: ensure self is included
			if (!isAdmin && currentDbUserId && !ids.includes(currentDbUserId)) {
				ids = [...ids, currentDbUserId]
			}
			setSelectedAdvisorIds(ids)
		} else {
			setSelectedAdvisorIds([])
		}
	}, [selectedQuotation?.id, selectedQuotation?.advisors, isAdmin, currentDbUserId])

	// When quotation is selected: use balance (quotation total minus all non-cancelled invoices)
	// for display, pre-fill and validation instead of quotation total.
	useEffect(() => {
		if (selectedQuotation) {
			const quotationTotal = Number(selectedQuotation.totalPrice) || 0
			const totalInvoiced = (selectedQuotation.invoices || []).reduce(
				(sum: number, inv: { amount: number }) => sum + inv.amount,
				0
			)
			const balance = Math.max(0, quotationTotal - totalInvoiced)
			setQuotationGrandTotal(balance)
			if (balance > 0) {
				setInvoiceForm(prev => ({ ...prev, amount: balance.toFixed(2) }))
			}
		}
	}, [selectedQuotation])

	// Validate amount when it changes (max = balance, not quotation total)
	useEffect(() => {
		if (invoiceForm.amount && quotationGrandTotal > 0) {
			const amount = parseFloat(invoiceForm.amount)
			if (isNaN(amount) || amount <= 0) {
				setAmountWarning("Amount must be greater than 0")
			} else if (amount > quotationGrandTotal) {
				setAmountWarning(`Warning: Invoice amount (RM${formatNumber(amount)}) exceeds remaining balance (RM${formatNumber(quotationGrandTotal)})`)
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
				// advisors are synced by useEffect when selectedQuotation changes
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
				// Pass advisor IDs; server-side will enforce non-admin self-inclusion
				advisorIds: selectedAdvisorIds.length > 0 ? selectedAdvisorIds : undefined,
				// Invoice date: only applied server-side when user is admin
				invoiceDate: invoiceForm.invoiceDate || undefined,
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
				invoiceDate: formatLocalDate(new Date()),
			})
			setSelectedQuotation(null)
			setSelectedAdvisorIds([])
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
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0">
				<DialogHeader className="shrink-0 px-6 pt-6 pb-2 pr-12">
					<DialogTitle>Create New Invoice</DialogTitle>
					<DialogDescription>
						Create an invoice linked to a quotation. Search and select a quotation to reference.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4 px-6 overflow-y-auto min-h-0 flex-1">
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
												<Badge variant="outline">
												Balance: RM{formatNumber("balance" in quotation ? quotation.balance : quotation.totalPrice)}
											</Badge>
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
											<p className="text-xs text-green-600">Balance</p>
											<p className="font-bold text-green-900">RM{formatNumber(quotationGrandTotal)}</p>
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
							<div className={`flex items-center gap-2 p-2 rounded-md ${amountWarning.includes("Warning") 
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

					{/* Invoice Date - editable only by admin */}
					<div className="space-y-2">
						<Label htmlFor="invoice-date">Invoice Date</Label>
						<Input
							id="invoice-date"
							type="date"
							value={invoiceForm.invoiceDate}
							onChange={(e) =>
								setInvoiceForm(prev => ({ ...prev, invoiceDate: e.target.value }))
							}
							disabled={!isAdmin || isSaving}
						/>
						{!isAdmin && (
							<p className="text-xs text-muted-foreground">Only admins can change the invoice date.</p>
						)}
					</div>

					{/* Advisors - All users see the picker; non-admin cannot remove self */}
					<div className="space-y-2">
						<Label htmlFor="advisors">Advisors</Label>
						<MultiSelectAdvisors
							users={users}
							selectedIds={selectedAdvisorIds}
							onChange={(ids) => {
								// Non-admin: ensure self is always included
								if (!isAdmin && currentDbUserId && !ids.includes(currentDbUserId)) {
									ids = [...ids, currentDbUserId]
								}
								setSelectedAdvisorIds(ids)
							}}
							currentUserId={currentDbUserId}
							isAdmin={isAdmin}
							disabled={!selectedQuotation || isSaving}
							placeholder="Select advisors"
						/>
						<p className="text-xs text-muted-foreground">
							Defaults to the quotation&apos;s advisors.{isAdmin ? " You can add or remove advisors." : " You cannot remove yourself."}
						</p>
					</div>
				</div>
				<DialogFooter className="shrink-0 px-6 pb-6 pt-2 border-t">
					<Button
						variant="outline"
						onClick={() => {
							onOpenChange(false)
							setInvoiceForm({
								quotationId: undefined,
								type: "SO",
								amount: "",
								invoiceDate: formatLocalDate(new Date()),
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


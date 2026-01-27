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
import { Search, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { createReceipt, searchInvoicesForReceipt, getInvoiceReceiptSummary } from "../action"
import { ReceiptFormData } from "../types"
import { useSession } from "../../contexts/SessionProvider"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getInvoiceById } from "../../invoices/action"
import { getAllUsers } from "../../quotations/action"
import { checkIsAdmin } from "../../actions/admin-actions"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"

interface CreateReceiptFormProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
	prefilledInvoiceId?: string
}

export default function CreateReceiptForm({
	isOpen,
	onOpenChange,
	onSuccess,
	prefilledInvoiceId,
}: CreateReceiptFormProps) {
	const { enhancedUser } = useSession()
	const [receiptForm, setReceiptForm] = useState<ReceiptFormData>({
		invoiceId: prefilledInvoiceId,
		amount: "",
	})
	const [isSaving, setIsSaving] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [searchResults, setSearchResults] = useState<any[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
	const [invoiceAmount, setInvoiceAmount] = useState<number>(0)
	const [totalReceipted, setTotalReceipted] = useState<number>(0)
	const [remaining, setRemaining] = useState<number>(0)
	const [amountWarning, setAmountWarning] = useState<string>("")
	const [isAdmin, setIsAdmin] = useState(false)
	const [users, setUsers] = useState<Array<{ id: string; supabase_id: string; firstName: string; lastName: string; email: string }>>([])
	const [selectedCreatedById, setSelectedCreatedById] = useState<string>("")

	// Check admin status and fetch users
	useEffect(() => {
		const checkAdminAndFetchUsers = async () => {
			if (enhancedUser?.id) {
				try {
					const adminStatus = await checkIsAdmin(enhancedUser.id)
					setIsAdmin(adminStatus)
					
					if (adminStatus) {
						const allUsers = await getAllUsers()
						setUsers(allUsers)
					}
				} catch (error) {
					console.error("Error checking admin status:", error)
				}
			}
		}
		checkAdminAndFetchUsers()
	}, [enhancedUser?.id])

	// Load prefilled invoice if provided
	useEffect(() => {
		if (prefilledInvoiceId && isOpen) {
			// Fetch invoice details
			handleInvoiceSelect(prefilledInvoiceId)
		}
	}, [prefilledInvoiceId, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

	// Load receipt summary when invoice is selected
	useEffect(() => {
		if (selectedInvoice?.id) {
			const loadSummary = async () => {
				try {
					const summary = await getInvoiceReceiptSummary(selectedInvoice.id)
					setTotalReceipted(summary.totalReceipted)
					setRemaining(summary.remaining)
					setInvoiceAmount(selectedInvoice.amount)
					
					// Set default amount to remaining if not already set
					if (!receiptForm.amount && summary.remaining > 0) {
						setReceiptForm(prev => ({ ...prev, amount: summary.remaining.toFixed(2) }))
					}
					
					// Auto-fill advisor with invoice's creator if not already set
					if (!selectedCreatedById) {
						if (selectedInvoice.createdBy?.supabase_id) {
							setSelectedCreatedById(selectedInvoice.createdBy.supabase_id)
						} else if (selectedInvoice.createdById) {
							setSelectedCreatedById(selectedInvoice.createdById)
						}
					}
				} catch (error) {
					console.error("Error loading receipt summary:", error)
				}
			}
			loadSummary()
		}
	}, [selectedInvoice?.id]) // eslint-disable-line react-hooks/exhaustive-deps

	// Validate amount when it changes
	useEffect(() => {
		if (receiptForm.amount && remaining >= 0) {
			const amount = parseFloat(receiptForm.amount)
			if (isNaN(amount) || amount <= 0) {
				setAmountWarning("Amount must be greater than 0")
			} else if (amount > remaining) {
				setAmountWarning(`Warning: Receipt amount (RM${amount.toFixed(2)}) exceeds remaining invoice amount (RM${remaining.toFixed(2)})`)
			} else {
				setAmountWarning("")
			}
		} else {
			setAmountWarning("")
		}
	}, [receiptForm.amount, remaining])

	const handleSearch = useCallback(async () => {
		if (!searchQuery.trim()) {
			setSearchResults([])
			return
		}

		setIsSearching(true)
		try {
			const results = await searchInvoicesForReceipt(searchQuery)
			setSearchResults(results)
		} catch (error) {
			console.error("Error searching invoices:", error)
			toast({
				title: "Error",
				description: "Failed to search invoices. Please try again.",
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

	const handleInvoiceSelect = async (invoiceId: string) => {
		// Find invoice in search results first
		const invoice = searchResults.find(i => i.id === invoiceId)
		
		if (invoice) {
			// If found in search results, use it
			setSelectedInvoice(invoice)
			setReceiptForm(prev => ({ ...prev, invoiceId }))
			// Auto-fill advisor with invoice's creator if available
			if (invoice.createdBy?.supabase_id) {
				setSelectedCreatedById(invoice.createdBy.supabase_id)
			} else if (invoice.createdById) {
				setSelectedCreatedById(invoice.createdById)
			}
			setSearchQuery("")
			setSearchResults([])
		} else {
			// If not in results (e.g., prefilled from invoice page), fetch it
			try {
				const fetchedInvoice = await getInvoiceById(invoiceId)
				if (fetchedInvoice) {
					setSelectedInvoice(fetchedInvoice)
					setReceiptForm(prev => ({ ...prev, invoiceId }))
					// Auto-fill advisor with invoice's creator if available
					if (fetchedInvoice.createdBy?.supabase_id) {
						setSelectedCreatedById(fetchedInvoice.createdBy.supabase_id)
					} else if (fetchedInvoice.createdById) {
						setSelectedCreatedById(fetchedInvoice.createdById)
					}
				} else {
					toast({
						title: "Error",
						description: "Invoice not found.",
						variant: "destructive",
					})
				}
			} catch (error) {
				console.error("Error fetching invoice:", error)
				toast({
					title: "Error",
					description: "Failed to fetch invoice details. Please try again.",
					variant: "destructive",
				})
			}
		}
	}

	const handleCreateReceipt = async () => {
		if (!receiptForm.invoiceId) {
			toast({
				title: "Validation Error",
				description: "Please select an invoice.",
				variant: "destructive",
			})
			return
		}

		if (!receiptForm.amount || parseFloat(receiptForm.amount) <= 0) {
			toast({
				title: "Validation Error",
				description: "Please enter a valid receipt amount.",
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
			const receipt = await createReceipt({
				invoiceId: receiptForm.invoiceId,
				amount: parseFloat(receiptForm.amount),
				// Only pass createdById if admin selected someone (non-admin will be set to self server-side)
				createdById: isAdmin && selectedCreatedById ? selectedCreatedById : undefined,
			})

			toast({
				title: "Success",
				description: "Receipt created successfully.",
			})

			// Reset form
			setReceiptForm({
				invoiceId: undefined,
				amount: "",
			})
			setSelectedInvoice(null)
			setSelectedCreatedById("")
			setSearchQuery("")
			setSearchResults([])
			setAmountWarning("")
			setTotalReceipted(0)
			setRemaining(0)

			// Call onSuccess callback (this will refresh the invoice page)
			onSuccess()
			onOpenChange(false)
		} catch (error: any) {
			console.error("Error creating receipt:", error)
			toast({
				title: "Error",
				description: error.message || "Failed to create receipt. Please try again.",
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
					<DialogTitle>Create New Receipt</DialogTitle>
					<DialogDescription>
						Create a receipt linked to an invoice. Search and select an invoice to reference.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					{/* Invoice Search */}
					<div className="space-y-2">
						<Label htmlFor="invoice-search">Search Invoice <span className="text-red-500">*</span></Label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								id="invoice-search"
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search by invoice number, quotation, or client name..."
								className="pl-10"
								disabled={!!selectedInvoice || isSaving}
							/>
							{isSearching && (
								<Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
							)}
						</div>

						{/* Search Results */}
						{searchResults.length > 0 && !selectedInvoice && (
							<div className="border rounded-lg max-h-60 overflow-y-auto">
								{searchResults.map((invoice) => (
									<Card
										key={invoice.id}
										className="cursor-pointer hover:bg-gray-50 border-0 border-b last:border-b-0 rounded-none"
										onClick={() => handleInvoiceSelect(invoice.id)}
									>
										<CardContent className="p-3">
											<div className="flex justify-between items-start">
												<div>
													<p className="font-semibold">{invoice.invoiceNumber}</p>
													<p className="text-sm text-muted-foreground">
														{invoice.quotation?.name || 'N/A'}
													</p>
													{invoice.quotation?.Client && (
														<p className="text-xs text-muted-foreground mt-1">
															Client: {invoice.quotation.Client.name} {invoice.quotation.Client.company && `(${invoice.quotation.Client.company})`}
														</p>
													)}
												</div>
												<Badge variant="outline">RM{invoice.amount.toFixed(2)}</Badge>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}

						{/* Selected Invoice Display */}
						{selectedInvoice && (
							<Card className="bg-green-50 border-green-200">
								<CardContent className="p-3">
									<div className="flex justify-between items-start">
										<div>
											<div className="flex items-center gap-2 mb-1">
												<CheckCircle className="w-4 h-4 text-green-600" />
												<p className="font-semibold text-green-900">{selectedInvoice.invoiceNumber || selectedInvoice.invoice?.invoiceNumber}</p>
											</div>
											{selectedInvoice.quotation && (
												<p className="text-sm text-green-700">{selectedInvoice.quotation.name || selectedInvoice.quotation?.name}</p>
											)}
											{selectedInvoice.quotation?.Client && (
												<p className="text-xs text-green-600 mt-1">
													Client: {selectedInvoice.quotation.Client.name} {selectedInvoice.quotation.Client.company && `(${selectedInvoice.quotation.Client.company})`}
												</p>
											)}
										</div>
										<div className="text-right">
											<p className="text-xs text-green-600">Invoice Amount</p>
											<p className="font-bold text-green-900">RM{invoiceAmount.toFixed(2)}</p>
											{totalReceipted > 0 && (
												<>
													<p className="text-xs text-green-600 mt-1">Already Receipted</p>
													<p className="text-sm text-green-700">RM{totalReceipted.toFixed(2)}</p>
												</>
											)}
											<p className="text-xs text-green-600 mt-1">Remaining</p>
											<p className="font-bold text-green-900">RM{remaining.toFixed(2)}</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="mt-2 text-green-700 hover:text-green-900"
										onClick={() => {
											setSelectedInvoice(null)
											setReceiptForm(prev => ({ ...prev, invoiceId: undefined }))
											setTotalReceipted(0)
											setRemaining(0)
										}}
									>
										Change Invoice
									</Button>
								</CardContent>
							</Card>
						)}
					</div>

					{/* Receipt Amount */}
					<div className="space-y-2">
						<Label htmlFor="receipt-amount">Receipt Amount (RM) <span className="text-red-500">*</span></Label>
						<Input
							id="receipt-amount"
							type="number"
							step="0.01"
							min="0"
							value={receiptForm.amount}
							onChange={(e) =>
								setReceiptForm(prev => ({ ...prev, amount: e.target.value }))
							}
							placeholder="0.00"
							disabled={!selectedInvoice || isSaving}
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
						{selectedInvoice && !amountWarning && receiptForm.amount && (
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
								disabled={!selectedInvoice || isSaving}
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
							setReceiptForm({
								invoiceId: undefined,
								amount: "",
							})
							setSelectedInvoice(null)
							setSelectedCreatedById("")
							setSearchQuery("")
							setSearchResults([])
							setAmountWarning("")
							setTotalReceipted(0)
							setRemaining(0)
						}}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button
						onClick={handleCreateReceipt}
						disabled={isSaving || !receiptForm.invoiceId || !receiptForm.amount || parseFloat(receiptForm.amount) <= 0}
						className="gap-2"
					>
						{isSaving ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Creating...
							</>
						) : (
							"Create Receipt"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}


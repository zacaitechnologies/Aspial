"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Loader2, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import {
	SortableServiceList,
	SortableServiceItem,
	DragHandle,
	useSortableList,
} from "@/components/ui/sortable-service-list"
import {
	createReceipt,
	searchInvoicesForReceipt,
	getInvoiceReceiptSummary,
	getClientAdvisorsForReceipt,
} from "../action"
import { ReceiptFormData, PaymentMethodType, PAYMENT_METHOD_LABELS } from "../types"
import { useSession } from "../../contexts/SessionProvider"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/format-number"
import { formatLocalDate } from "@/lib/date-utils"
import { getInvoiceById } from "../../invoices/action"
import { getAllUsers } from "../../quotations/action"
import { getAllServices } from "../../services/action"
import { createCustomerClient } from "../../clients/action"
import { checkIsAdmin } from "../../actions/admin-actions"
import ClientSelection from "../../quotations/components/ClientSelection"
import { QuotationServiceSearchItem } from "../../quotations/components/QuotationServiceSearchItem"
import type { Services } from "@prisma/client"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MultiSelectAdvisors } from "@/components/ui/multi-select-advisors"
import type { ReceiptServiceItem } from "@/lib/validation"

type SelectedService = {
	serviceId: string
	name: string
	baseDescription: string
	description: string
	price: number
	quantity: number
	expanded: boolean
}

type ReceiptMode = "invoice" | "standalone"

const EMPTY_NEW_CLIENT = {
	name: "",
	email: "",
	ic: "",
	phone: "",
	company: "",
	companyRegistrationNumber: "",
	address: "",
	notes: "",
	industry: "",
	yearlyRevenue: "",
	membershipType: "NON_MEMBER",
}

function parsePositiveReceiptAmount(raw: string): number | null {
	const amount = parseFloat(raw)
	if (!Number.isFinite(amount) || amount <= 0) return null
	return amount
}

interface CreateReceiptFormProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
	prefilledInvoiceId?: string
	/** When opening from an invoice card, pass the invoice to avoid refetch and speed up popup */
	prefetchedInvoice?: { id: string; amount: number; advisors?: Array<{ id: string }> } | null
	/** When set, skips an extra server round-trip to resolve admin status */
	isAdminProp?: boolean
}

export default function CreateReceiptForm({
	isOpen,
	onOpenChange,
	onSuccess,
	prefilledInvoiceId,
	prefetchedInvoice,
	isAdminProp,
}: CreateReceiptFormProps) {
	const { enhancedUser } = useSession()
	const [mode, setMode] = useState<ReceiptMode>(prefilledInvoiceId ? "invoice" : "invoice")
	const [receiptForm, setReceiptForm] = useState<ReceiptFormData>({
		invoiceId: prefilledInvoiceId,
		amount: "",
		receiptDate: formatLocalDate(new Date()),
	})
	const [isSaving, setIsSaving] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [searchResults, setSearchResults] = useState<any[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
	const [clientMode, setClientMode] = useState<"existing" | "new">("existing")
	const [selectedClientName, setSelectedClientName] = useState("")
	const [newClientData, setNewClientData] = useState(EMPTY_NEW_CLIENT)
	const [invoiceAmount, setInvoiceAmount] = useState<number>(0)
	const [totalReceipted, setTotalReceipted] = useState<number>(0)
	const [remaining, setRemaining] = useState<number>(0)
	const [amountWarning, setAmountWarning] = useState<string>("")
	const [users, setUsers] = useState<Array<{ id: string; supabase_id: string; firstName: string; lastName: string; email: string }>>([])
	const [isAdmin, setIsAdmin] = useState(false)
	const [selectedAdvisorIds, setSelectedAdvisorIds] = useState<string[]>([])
	const [currentDbUserId, setCurrentDbUserId] = useState<string>("")
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>("bank_transfer")
	const [services, setServices] = useState<Services[]>([])
	const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
	const handleServiceDragEnd = useSortableList(
		selectedServices,
		useCallback((next: SelectedService[]) => setSelectedServices(next), []),
		(s) => s.serviceId,
	)
	const [serviceSearchQuery, setServiceSearchQuery] = useState("")
	const [expandAllDescriptions, setExpandAllDescriptions] = useState(false)
	const [remarks, setRemarks] = useState("")

	// Load users, current user id, admin status, and services catalog
	useEffect(() => {
		if (!isOpen || !enhancedUser?.id) return
		const run = async () => {
			try {
				if (isAdminProp !== undefined) {
					setIsAdmin(isAdminProp)
				} else {
					setIsAdmin(await checkIsAdmin(enhancedUser.id))
				}
			} catch {
				setIsAdmin(false)
			}
		}
		void run()
		void getAllUsers()
			.then((all) => {
				setUsers(all)
				const me = all.find((u) => u.supabase_id === enhancedUser.id)
				if (me) setCurrentDbUserId(me.id)
			})
			.catch(() => {})
		void getAllServices()
			.then((svcs) => setServices(svcs))
			.catch(() => {})
	}, [isOpen, enhancedUser?.id, isAdminProp])

	// Load prefilled invoice: use prefetched when available to avoid slow fetch
	useEffect(() => {
		if (!prefilledInvoiceId || !isOpen) return
		setMode("invoice")
		if (prefetchedInvoice && String(prefetchedInvoice.id) === String(prefilledInvoiceId)) {
			setSelectedInvoice(prefetchedInvoice as any)
			setReceiptForm(prev => ({ ...prev, invoiceId: prefilledInvoiceId }))
			// Auto-load advisors from invoice (flat shape)
			const advisors = (prefetchedInvoice as any).advisors
			if (advisors && advisors.length > 0) {
				setSelectedAdvisorIds(advisors.map((a: any) => a.id).filter(Boolean))
			}
			setSearchQuery("")
			setSearchResults([])
			return
		}
		handleInvoiceSelect(prefilledInvoiceId)
	}, [prefilledInvoiceId, isOpen, prefetchedInvoice?.id]) // eslint-disable-line react-hooks/exhaustive-deps

	// Sync advisors when the selected invoice or client changes. Non-admins must include self.
	useEffect(() => {
		if (mode === "invoice") {
			const sourceAdvisors = selectedInvoice?.advisors
			let ids: string[] = []
			if (sourceAdvisors && sourceAdvisors.length > 0) {
				ids = sourceAdvisors.map((a: { id: string }) => a.id).filter(Boolean)
			}
			if (!isAdmin && currentDbUserId && !ids.includes(currentDbUserId)) {
				ids = [...ids, currentDbUserId]
			}
			setSelectedAdvisorIds(ids)
			return
		}

		if (mode === "standalone" && clientMode === "existing" && receiptForm.clientId) {
			void getClientAdvisorsForReceipt(receiptForm.clientId)
				.then((advisors) => {
					let ids = advisors.map((a) => a.id).filter(Boolean)
					if (!isAdmin && currentDbUserId && !ids.includes(currentDbUserId)) {
						ids = [...ids, currentDbUserId]
					}
					setSelectedAdvisorIds(ids)
				})
				.catch(() => {
					if (!isAdmin && currentDbUserId) {
						setSelectedAdvisorIds([currentDbUserId])
					}
				})
			return
		}

		if (mode === "standalone" && clientMode === "new" && !isAdmin && currentDbUserId) {
			setSelectedAdvisorIds([currentDbUserId])
		}
	}, [mode, clientMode, receiptForm.clientId, selectedInvoice?.id, selectedInvoice?.advisors, isAdmin, currentDbUserId])

	// Load receipt summary when invoice is selected
	useEffect(() => {
		if (mode !== "invoice" || !selectedInvoice?.id) return
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
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Error loading receipt summary:", error)
				}
			}
		}
		loadSummary()
	}, [mode, selectedInvoice?.id]) // eslint-disable-line react-hooks/exhaustive-deps

	// Validate amount in both invoice and standalone modes
	useEffect(() => {
		if (!receiptForm.amount) {
			setAmountWarning("")
			return
		}
		const amount = parsePositiveReceiptAmount(receiptForm.amount)
		if (amount === null) {
			setAmountWarning("Receipt amount must be greater than 0")
			return
		}
		if (mode === "invoice" && amount > remaining) {
			setAmountWarning(
				`Warning: Receipt amount (RM${formatNumber(amount)}) exceeds remaining invoice amount (RM${formatNumber(remaining)})`,
			)
			return
		}
		setAmountWarning("")
	}, [mode, receiptForm.amount, remaining])

	const handleSearch = useCallback(async () => {
		if (mode !== "invoice" || !searchQuery.trim()) {
			setSearchResults([])
			return
		}

		setIsSearching(true)
		try {
			const results = await searchInvoicesForReceipt(searchQuery)
			setSearchResults(results)
		} catch (error) {
			if (process.env.NODE_ENV === "development") {
				console.error("Error searching:", error)
			}
			toast({
				title: "Error",
				description: "Search failed. Please try again.",
				variant: "destructive",
			})
		} finally {
			setIsSearching(false)
		}
	}, [searchQuery, mode])

	// Debounce invoice search
	useEffect(() => {
		if (mode !== "invoice") return
		const timer = setTimeout(() => {
			if (searchQuery.trim()) {
				handleSearch()
			} else {
				setSearchResults([])
			}
		}, 300)

		return () => clearTimeout(timer)
	}, [searchQuery, handleSearch, mode])

	const handleInvoiceSelect = async (invoiceId: string) => {
		// Find invoice in search results first
		const invoice = searchResults.find(i => i.id === invoiceId)

		if (invoice) {
			setSelectedInvoice(invoice)
			setReceiptForm(prev => ({ ...prev, invoiceId, clientId: undefined }))
			if (invoice.advisors && invoice.advisors.length > 0) {
				setSelectedAdvisorIds(invoice.advisors.map((a: any) => a.id).filter(Boolean))
			}
			setSearchQuery("")
			setSearchResults([])
		} else {
			try {
				const fetchedInvoice = await getInvoiceById(invoiceId)
				if (fetchedInvoice) {
					setSelectedInvoice(fetchedInvoice)
					setReceiptForm(prev => ({ ...prev, invoiceId, clientId: undefined }))
					if (fetchedInvoice.advisors && fetchedInvoice.advisors.length > 0) {
						setSelectedAdvisorIds(fetchedInvoice.advisors.map((a: any) => a.id).filter(Boolean))
					}
				} else {
					toast({
						title: "Error",
						description: "Invoice not found.",
						variant: "destructive",
					})
				}
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Error fetching invoice:", error)
				}
				toast({
					title: "Error",
					description: "Failed to fetch invoice details. Please try again.",
					variant: "destructive",
				})
			}
		}
	}

	const handleModeChange = (next: string) => {
		const nextMode = next as ReceiptMode
		setMode(nextMode)
		setSelectedInvoice(null)
		setClientMode("existing")
		setSelectedClientName("")
		setNewClientData(EMPTY_NEW_CLIENT)
		setSearchQuery("")
		setSearchResults([])
		setTotalReceipted(0)
		setRemaining(0)
		setInvoiceAmount(0)
		setAmountWarning("")
		setSelectedServices([])
		setServiceSearchQuery("")
		setExpandAllDescriptions(false)
		setReceiptForm(prev => ({ ...prev, invoiceId: undefined, clientId: undefined, amount: "" }))
	}

	const handleAddService = (serviceId: string) => {
		const service = services.find((s) => s.id.toString() === serviceId)
		if (!service) return
		if (selectedServices.some((s) => s.serviceId === serviceId)) return
		setSelectedServices((prev) => [
			...prev,
			{
				serviceId,
				name: service.name,
				baseDescription: service.description ?? "",
				description: service.description ?? "",
				price: service.basePrice,
				quantity: 1,
				expanded: expandAllDescriptions,
			},
		])
	}

	const handleServiceDescriptionChange = (serviceId: string, description: string) => {
		setSelectedServices((prev) =>
			prev.map((s) => (s.serviceId === serviceId ? { ...s, description } : s)),
		)
	}

	const handleResetServiceDescription = (serviceId: string) => {
		setSelectedServices((prev) =>
			prev.map((s) =>
				s.serviceId === serviceId ? { ...s, description: s.baseDescription } : s,
			),
		)
	}

	const handleRemoveService = (serviceId: string) => {
		setSelectedServices((prev) => prev.filter((s) => s.serviceId !== serviceId))
	}

	const handleServicePriceChange = (serviceId: string, price: number) => {
		setSelectedServices((prev) =>
			prev.map((s) => (s.serviceId === serviceId ? { ...s, price } : s)),
		)
	}

	const handleServiceQuantityChange = (serviceId: string, quantity: number) => {
		setSelectedServices((prev) =>
			prev.map((s) => (s.serviceId === serviceId ? { ...s, quantity } : s)),
		)
	}

	const resetForm = () => {
		setReceiptForm({
			invoiceId: undefined,
			clientId: undefined,
			amount: "",
			receiptDate: formatLocalDate(new Date()),
		})
		setSelectedInvoice(null)
		setClientMode("existing")
		setSelectedClientName("")
		setNewClientData(EMPTY_NEW_CLIENT)
		setSelectedAdvisorIds([])
		setSelectedPaymentMethod("bank_transfer")
		setSearchQuery("")
		setSearchResults([])
		setAmountWarning("")
		setTotalReceipted(0)
		setRemaining(0)
		setMode("invoice")
		setSelectedServices([])
		setServiceSearchQuery("")
		setExpandAllDescriptions(false)
		setRemarks("")
	}

	const isInvoiceMode = mode === "invoice"
	const hasStandaloneClient =
		clientMode === "existing"
			? Boolean(receiptForm.clientId)
			: Boolean(newClientData.name && newClientData.email && newClientData.ic)
	const target = isInvoiceMode ? selectedInvoice : hasStandaloneClient ? true : null
	const parsedReceiptAmount = parsePositiveReceiptAmount(receiptForm.amount)
	const submitDisabled =
		isSaving ||
		!target ||
		parsedReceiptAmount === null ||
		(amountWarning.length > 0 && !amountWarning.includes("Warning")) ||
		selectedAdvisorIds.length === 0

	const handleCreateReceipt = async () => {
		if (isInvoiceMode && !receiptForm.invoiceId) {
			toast({ title: "Validation Error", description: "Please select an invoice.", variant: "destructive" })
			return
		}
		if (!isInvoiceMode) {
			if (clientMode === "existing" && !receiptForm.clientId) {
				toast({ title: "Validation Error", description: "Please select a client.", variant: "destructive" })
				return
			}
			if (clientMode === "new" && (!newClientData.name || !newClientData.email || !newClientData.ic)) {
				toast({
					title: "Validation Error",
					description: "Please fill in the required client information (name, email, and IC).",
					variant: "destructive",
				})
				return
			}
		}
		const amount = parsePositiveReceiptAmount(receiptForm.amount)
		if (amount === null) {
			toast({
				title: "Validation Error",
				description: "Receipt amount must be greater than 0",
				variant: "destructive",
			})
			return
		}
		if (!enhancedUser?.id) {
			toast({ title: "Error", description: "User not authenticated.", variant: "destructive" })
			return
		}
		if (selectedAdvisorIds.length === 0) {
			toast({ title: "Advisor required", description: "Please select at least one advisor before submitting.", variant: "destructive" })
			return
		}

		setIsSaving(true)
		try {
			let finalClientId = receiptForm.clientId

			if (!isInvoiceMode && clientMode === "new") {
				const newClient = await createCustomerClient({
					name: newClientData.name,
					email: newClientData.email,
					ic: newClientData.ic,
					phone: newClientData.phone,
					company: newClientData.company,
					companyRegistrationNumber: newClientData.companyRegistrationNumber,
					address: newClientData.address,
					notes: newClientData.notes,
					industry: newClientData.industry,
					yearlyRevenue: newClientData.yearlyRevenue
						? parseFloat(newClientData.yearlyRevenue)
						: undefined,
					membershipType: (newClientData.membershipType as "MEMBER" | "NON_MEMBER") || "NON_MEMBER",
				})
				finalClientId = newClient.id
			}

			const servicePayload: ReceiptServiceItem[] = !isInvoiceMode
				? selectedServices.map((s, idx) => ({
						serviceId: parseInt(s.serviceId, 10),
						descriptionOverride: s.description,
						price: s.price,
						quantity: s.quantity,
						sortOrder: idx,
					}))
				: []

			await createReceipt({
				invoiceId: isInvoiceMode ? receiptForm.invoiceId : undefined,
				clientId: !isInvoiceMode ? finalClientId : undefined,
				amount,
				advisorIds: selectedAdvisorIds,
				receiptDate: receiptForm.receiptDate || undefined,
				paymentMethod: selectedPaymentMethod,
				remarks: remarks.trim() || undefined,
				services: servicePayload.length > 0 ? servicePayload : undefined,
			})

			toast({ title: "Success", description: "Receipt created successfully." })
			resetForm()
			onSuccess()
			onOpenChange(false)
		} catch (error: unknown) {
			if (process.env.NODE_ENV === "development") {
				console.error("Error creating receipt:", error)
			}
			toast({
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to create receipt. Please try again.",
				variant: "destructive",
			})
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="w-[85vw]! max-w-[85vw]! sm:max-w-[85vw]! max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
				<DialogHeader className="shrink-0 px-6 pt-6 pb-2 pr-12">
					<DialogTitle>Create New Receipt</DialogTitle>
					<DialogDescription>
						Link the receipt to an invoice, or record a standalone cash sale against a client.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4 px-6 overflow-y-auto min-h-0 flex-1 custom-scrollbar">
					{/* Mode toggle */}
					<Tabs value={mode} onValueChange={handleModeChange} className="w-full">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="invoice" disabled={isSaving || !!prefilledInvoiceId}>
								Link to Invoice
							</TabsTrigger>
							<TabsTrigger value="standalone" disabled={isSaving || !!prefilledInvoiceId}>
								Standalone (Cash Sale)
							</TabsTrigger>
						</TabsList>

						<TabsContent value="invoice" className="space-y-2 mt-4">
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
								{isSearching && isInvoiceMode && (
									<Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
								)}
							</div>

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
													<Badge variant="outline">RM{formatNumber(invoice.amount)}</Badge>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							)}

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
												<p className="font-bold text-green-900">RM{formatNumber(invoiceAmount)}</p>
												{totalReceipted > 0 && (
													<>
														<p className="text-xs text-green-600 mt-1">Already Receipted</p>
														<p className="text-sm text-green-700">RM{formatNumber(totalReceipted)}</p>
													</>
												)}
												<p className="text-xs text-green-600 mt-1">Remaining</p>
												<p className="font-bold text-green-900">RM{formatNumber(remaining)}</p>
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
											disabled={!!prefilledInvoiceId}
										>
											Change Invoice
										</Button>
									</CardContent>
								</Card>
							)}
						</TabsContent>

						<TabsContent value="standalone" className="space-y-4 mt-4">
							<div className="grid gap-2">
								<Label>
									Client <span className="text-red-500">*</span>
								</Label>
								<ClientSelection
									selectedClientId={receiptForm.clientId}
									selectedClientName={selectedClientName}
									newClientData={newClientData}
									onClientSelect={(clientId, clientName) => {
										setReceiptForm((prev) => ({
											...prev,
											clientId,
											invoiceId: undefined,
										}))
										setSelectedClientName(clientName)
									}}
									onNewClientDataChange={(data) =>
										setNewClientData({
											name: data.name ?? "",
											email: data.email ?? "",
											ic: data.ic ?? "",
											phone: data.phone ?? "",
											company: data.company ?? "",
											companyRegistrationNumber: data.companyRegistrationNumber ?? "",
											address: data.address ?? "",
											notes: data.notes ?? "",
											industry: data.industry ?? "",
											yearlyRevenue: data.yearlyRevenue ?? "",
											membershipType: data.membershipType ?? "NON_MEMBER",
										})
									}
									onModeChange={setClientMode}
									mode={clientMode}
								/>
							</div>

							<div className="grid border-black border-2 rounded-2xl p-4 gap-4 mt-4">
								<div className="flex items-center justify-between">
									<div className="flex flex-col">
										<Label className="font-semibold">
											Services{" "}
											<span className="text-xs font-normal text-muted-foreground">
												(optional — informational line items)
											</span>
										</Label>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<Checkbox
											id="receipt-expand-all-desc"
											checked={expandAllDescriptions}
											onCheckedChange={(checked) => setExpandAllDescriptions(checked === true)}
											disabled={isSaving}
										/>
										<Label
											htmlFor="receipt-expand-all-desc"
											className="text-xs font-normal cursor-pointer whitespace-nowrap"
										>
											Show all descriptions
										</Label>
									</div>
								</div>
								<div className="flex gap-2">
									<Input
										placeholder="Filter services..."
										value={serviceSearchQuery}
										onChange={(e) => setServiceSearchQuery(e.target.value)}
										disabled={isSaving}
									/>
								</div>
								<div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2 bg-background">
									{(() => {
										const availableServices = services.filter(
											(service) =>
												!selectedServices.some((s) => s.serviceId === service.id.toString()) &&
												(!serviceSearchQuery.trim() ||
													service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
													(service.description ?? "")
														.toLowerCase()
														.includes(serviceSearchQuery.toLowerCase())),
										)
										if (availableServices.length === 0) {
											return (
												<p className="text-center py-4 text-muted-foreground text-sm">
													{services.length === 0
														? "Loading services..."
														: selectedServices.length === services.length
															? "All services have been added."
															: "No services match your filter."}
												</p>
											)
										}
										return availableServices.map((service) => (
											<QuotationServiceSearchItem
												key={service.id}
												service={service}
												defaultExpanded={expandAllDescriptions}
												onAdd={() => {
													handleAddService(service.id.toString())
													setServiceSearchQuery("")
												}}
											/>
										))
									})()}
								</div>
							{selectedServices.length > 0 && (
								<div className="space-y-2">
									<div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1">
										<span className="col-span-1" />
										<span className="col-span-1" />
										<span className="col-span-2">Service</span>
										<span className="col-span-3">Price (RM)</span>
										<span className="col-span-2">Qty</span>
										<span className="col-span-2 text-right">Total</span>
										<span className="col-span-1" />
									</div>
									<SortableServiceList
										ids={selectedServices.map((s) => s.serviceId)}
										onDragEnd={handleServiceDragEnd}
									>
										{selectedServices.map((s) => (
											<SortableServiceItem key={s.serviceId} id={s.serviceId}>
												{(dragHandleProps) => (
													<div className="border rounded-lg overflow-hidden">
														<div className="grid grid-cols-12 gap-2 items-center p-2">
															<div className="col-span-1 flex justify-center">
																<DragHandle {...dragHandleProps} />
															</div>
															<div className="col-span-1">
																<Button
																	type="button"
																	size="sm"
																	variant="ghost"
																	onClick={() => {
																		setSelectedServices((prev) =>
																			prev.map((svc) =>
																				svc.serviceId === s.serviceId
																					? { ...svc, expanded: !svc.expanded }
																					: svc,
																			),
																		)
																	}}
																	className="h-8 w-8 p-0"
																	aria-label={s.expanded ? "Hide description" : "Show description"}
																>
																	{s.expanded ? (
																		<ChevronDown className="w-4 h-4" />
																	) : (
																		<ChevronRight className="w-4 h-4" />
																	)}
																</Button>
															</div>
															<div className="col-span-2">
																<p className="font-medium text-sm truncate">{s.name}</p>
															</div>
															<div className="col-span-3">
																<Input
																	type="number"
																	min="0"
																	step="0.01"
																	value={s.price}
																	onChange={(e) =>
																		handleServicePriceChange(
																			s.serviceId,
																			parseFloat(e.target.value) || 0,
																		)
																	}
																	onWheel={(e) => e.currentTarget.blur()}
																	className="h-8 text-sm"
																	disabled={isSaving}
																/>
															</div>
															<div className="col-span-2">
																<Input
																	type="number"
																	min="1"
																	step="1"
																	value={s.quantity}
																	onChange={(e) =>
																		handleServiceQuantityChange(
																			s.serviceId,
																			parseInt(e.target.value, 10) || 1,
																		)
																	}
																	onWheel={(e) => e.currentTarget.blur()}
																	className="h-8 text-sm"
																	disabled={isSaving}
																/>
															</div>
															<div className="col-span-2 text-right text-sm font-medium">
																RM{formatNumber(s.price * s.quantity)}
															</div>
															<div className="col-span-1 flex justify-end">
																<Button
																	type="button"
																	size="sm"
																	variant="ghost"
																	onClick={() => handleRemoveService(s.serviceId)}
																	className="h-8 w-8 p-0 text-destructive"
																	disabled={isSaving}
																>
																	×
																</Button>
															</div>
														</div>
														{s.expanded && (
															<div className="border-t bg-muted/40 p-3 space-y-2">
																<div className="flex items-center justify-between gap-2">
																	<Label className="text-xs">
																		Description (this receipt only — won&apos;t change the catalog)
																	</Label>
																	<Button
																		type="button"
																		size="sm"
																		variant="link"
																		className="h-auto p-0 text-xs"
																		onClick={() => handleResetServiceDescription(s.serviceId)}
																	>
																		Reset to default
																	</Button>
																</div>
																<Textarea
																	value={s.description}
																	onChange={(e) =>
																		handleServiceDescriptionChange(s.serviceId, e.target.value)
																	}
																	rows={4}
																	className="text-sm"
																	disabled={isSaving}
																/>
															</div>
														)}
													</div>
												)}
											</SortableServiceItem>
										))}
									</SortableServiceList>
								</div>
							)}
								{selectedServices.length === 0 && (
									<div className="text-center py-4 text-muted-foreground text-sm">
										Add optional service line items from the list above
									</div>
								)}
							</div>
						</TabsContent>
				</Tabs>

					{/* Receipt Amount */}
					<div className="space-y-2">
						<Label htmlFor="receipt-amount">Receipt Amount (RM) <span className="text-red-500">*</span></Label>
						<Input
							id="receipt-amount"
							type="number"
							step="0.01"
							min="0.01"
							value={receiptForm.amount}
							onChange={(e) =>
								setReceiptForm(prev => ({ ...prev, amount: e.target.value }))
							}
							placeholder="0.00"
							disabled={!target || isSaving}
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
						{target && !amountWarning && parsedReceiptAmount !== null && (
							<div className="flex items-center gap-2 p-2 rounded-md bg-green-50 border border-green-200 text-green-800">
								<CheckCircle className="w-4 h-4" />
								<p className="text-sm">Amount is valid</p>
							</div>
						)}
					</div>

					{/* Payment Method */}
					<div className="space-y-2">
						<Label htmlFor="payment-method">Payment Method <span className="text-red-500">*</span></Label>
						<Select
							value={selectedPaymentMethod}
							onValueChange={(value) => setSelectedPaymentMethod(value as PaymentMethodType)}
							disabled={!target || isSaving}
						>
							<SelectTrigger id="payment-method">
								<SelectValue placeholder="Select payment method" />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethodType[]).map((method) => (
									<SelectItem key={method} value={method}>
										{PAYMENT_METHOD_LABELS[method]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Receipt document date (stored as receiptDate) */}
					<div className="space-y-2">
						<Label htmlFor="receipt-date">Receipt Date</Label>
						<Input
							id="receipt-date"
							type="date"
							value={receiptForm.receiptDate}
							onChange={(e) =>
								setReceiptForm(prev => ({ ...prev, receiptDate: e.target.value }))
							}
							disabled={!target || isSaving}
						/>
						<p className="text-xs text-muted-foreground">
							This is the date shown on the receipt document.
						</p>
					</div>

					{/* Advisors — non-admins cannot remove themselves; admins can change freely */}
					<div className="space-y-2">
						<Label>Advisors</Label>
						<MultiSelectAdvisors
							users={users}
							selectedIds={selectedAdvisorIds}
							onChange={(ids) => {
								if (!isAdmin && currentDbUserId && !ids.includes(currentDbUserId)) {
									setSelectedAdvisorIds([...ids, currentDbUserId])
									return
								}
								setSelectedAdvisorIds(ids)
							}}
							currentUserId={currentDbUserId}
							isAdmin={isAdmin}
							disabled={!target || isSaving}
							placeholder="Select advisors"
						/>
						<p className="text-xs text-muted-foreground">
							{isInvoiceMode ? "Defaults to invoice advisors." : "Defaults to client advisors."}
							{isAdmin
								? " You can add or remove advisors."
								: " You can add others, but you cannot remove yourself as an advisor."}
						</p>
					</div>

					{/* Internal remarks — not shown on the PDF */}
					<div className="space-y-2">
						<Label htmlFor="receipt-remarks">
							Remarks <span className="text-xs font-normal text-muted-foreground">(internal note, not on PDF)</span>
						</Label>
						<Textarea
							id="receipt-remarks"
							value={remarks}
							onChange={(e) => setRemarks(e.target.value)}
							placeholder="Add any internal notes about this receipt..."
							rows={3}
							maxLength={2000}
							disabled={!target || isSaving}
							className="resize-none"
						/>
					</div>
				</div>
				<DialogFooter className="shrink-0 px-6 pb-6 pt-2 border-t">
					<Button
						variant="outline"
						onClick={() => {
							onOpenChange(false)
							resetForm()
						}}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button
						onClick={handleCreateReceipt}
						disabled={submitDisabled}
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

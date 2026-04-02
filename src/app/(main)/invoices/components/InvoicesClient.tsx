"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, FileText, Filter, Search, Calendar } from "lucide-react"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import type { InvoiceListFilters } from "@/lib/validation"
import { getInvoicesPaginatedFresh, invalidateInvoicesCache } from "../action"
import CreateInvoiceForm from "./CreateInvoiceForm"
import InvoiceCard from "./InvoiceCard"
import { InvoiceWithQuotation, invoiceTypeOptions } from "../types"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { ProjectPagination } from "../../projects/components/ProjectPagination"
import { toast } from "@/components/ui/use-toast"

interface InvoicesClientProps {
	initialData: {
		data: InvoiceWithQuotation[]
		total: number
		page: number
		pageSize: number
		totalPages: number
	}
	userId: string
	isAdmin: boolean
	initialAdvisors: { id: string; firstName: string; lastName: string }[]
}

export default function InvoicesClient({ initialData, userId, isAdmin, initialAdvisors }: InvoicesClientProps) {
	const [isMounted, setIsMounted] = useState(false)
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [typeFilter, setTypeFilter] = useState<string>("all")
	const [advisorFilter, setAdvisorFilter] = useState<string>("all")
	const [monthYearFilter, setMonthYearFilter] = useState<string>("all")
	const [searchInput, setSearchInput] = useState("")
	const [searchQuery, setSearchQuery] = useState("")

	const monthYearOptions = useMemo(() => {
		const options: { value: string; label: string }[] = [{ value: "all", label: "All months" }]
		const now = new Date()
		for (let i = 0; i < 36; i++) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
			const y = d.getFullYear()
			const m = d.getMonth() + 1
			const value = `${y}-${String(m).padStart(2, "0")}`
			const label = d.toLocaleString("en-GB", { month: "long", year: "numeric" })
			options.push({ value, label })
		}
		return options
	}, [])

	const buildListFilters = useCallback((): InvoiceListFilters => {
		return {
			typeFilter: typeFilter !== "all" ? typeFilter : undefined,
			searchQuery: searchQuery || undefined,
			advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
			monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
		}
	}, [typeFilter, searchQuery, advisorFilter, monthYearFilter])

	// State from initial data - use initial data directly, no copying to state unless it changes
	const [invoices, setInvoices] = useState<InvoiceWithQuotation[]>(initialData.data)
	const [loading, setLoading] = useState(false)
	const [page, setPage] = useState(initialData.page)
	const [pageSize, setPageSizeState] = useState(initialData.pageSize)
	const [total, setTotal] = useState(initialData.total)
	const [totalPages, setTotalPages] = useState(initialData.totalPages)

	// Prevent hydration errors from Radix UI dynamic IDs
	useEffect(() => {
		setIsMounted(true)
	}, [])

	// Debounce search: update searchQuery 300ms after user stops typing
	useEffect(() => {
		const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
		return () => clearTimeout(t)
	}, [searchInput])

	// Fetch fresh data - called directly from handlers, not useEffect
	const fetchInvoices = useCallback(async () => {
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(page, pageSize, buildListFilters())
			setInvoices(result.data as InvoiceWithQuotation[])
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error fetching invoices:", error)
			}
		} finally {
			setLoading(false)
		}
	}, [page, pageSize, buildListFilters])

	const handleSuccess = useCallback(async () => {
		await invalidateInvoicesCache()
		await fetchInvoices()
	}, [fetchInvoices])

	// Handle filter changes directly via callbacks - fetch immediately
	const handleTypeFilterChange = useCallback(async (value: string) => {
		setTypeFilter(value)
		setPage(1)
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(1, pageSize, {
				typeFilter: value !== "all" ? value : undefined,
				searchQuery: searchQuery || undefined,
				advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
				monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
			})
			setInvoices(result.data as InvoiceWithQuotation[])
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error fetching invoices:", error)
			}
		} finally {
			setLoading(false)
		}
	}, [pageSize, searchQuery, advisorFilter, monthYearFilter])

	const handleAdvisorFilterChange = useCallback(async (value: string) => {
		setAdvisorFilter(value)
		setPage(1)
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(1, pageSize, {
				typeFilter: typeFilter !== "all" ? typeFilter : undefined,
				searchQuery: searchQuery || undefined,
				advisorFilter: value !== "all" ? value : undefined,
				monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
			})
			setInvoices(result.data as InvoiceWithQuotation[])
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error fetching invoices:", error)
			}
		} finally {
			setLoading(false)
		}
	}, [pageSize, typeFilter, searchQuery, monthYearFilter])

	const handleMonthYearFilterChange = useCallback(async (value: string) => {
		setMonthYearFilter(value)
		setPage(1)
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(1, pageSize, {
				typeFilter: typeFilter !== "all" ? typeFilter : undefined,
				searchQuery: searchQuery || undefined,
				advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
				monthYear: value !== "all" ? value : undefined,
			})
			setInvoices(result.data as InvoiceWithQuotation[])
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			if (process.env.NODE_ENV === "development") {
				console.error("Error fetching invoices:", error)
			}
		} finally {
			setLoading(false)
		}
	}, [pageSize, typeFilter, searchQuery, advisorFilter])

	// Handle page changes - fetch directly
	const goToPage = useCallback(async (newPage: number) => {
		setPage(newPage)
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(newPage, pageSize, {
				typeFilter: typeFilter !== "all" ? typeFilter : undefined,
				searchQuery: searchQuery || undefined,
				advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
				monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
			})
			setInvoices(result.data as InvoiceWithQuotation[])
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error fetching invoices:", error)
			}
		} finally {
			setLoading(false)
		}
	}, [pageSize, typeFilter, searchQuery, advisorFilter, monthYearFilter])

	const setPageSize = useCallback(async (size: number) => {
		setPageSizeState(size)
		setPage(1)
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(1, size, {
				typeFilter: typeFilter !== "all" ? typeFilter : undefined,
				searchQuery: searchQuery || undefined,
				advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
				monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
			})
			setInvoices(result.data as InvoiceWithQuotation[])
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error fetching invoices:", error)
			}
		} finally {
			setLoading(false)
		}
	}, [typeFilter, searchQuery, advisorFilter, monthYearFilter])

	// When search query changes, reset to page 1 and refetch (skip initial mount to avoid overwriting server data)
	const prevSearchQueryRef = useRef<string | undefined>(undefined)
	useEffect(() => {
		if (!isMounted) return
		if (prevSearchQueryRef.current === undefined) {
			prevSearchQueryRef.current = searchQuery
			return
		}
		if (prevSearchQueryRef.current === searchQuery) return
		prevSearchQueryRef.current = searchQuery
		setPage(1)
		setLoading(true)
		getInvoicesPaginatedFresh(1, pageSize, {
			typeFilter: typeFilter !== "all" ? typeFilter : undefined,
			searchQuery: searchQuery || undefined,
			advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
			monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
		})
			.then((result) => {
				setInvoices(result.data as InvoiceWithQuotation[])
				setTotal(result.total)
				setTotalPages(result.totalPages)
			})
			.catch((err) => {
				if (process.env.NODE_ENV === "development") {
					console.error("Error fetching invoices:", err)
				}
			})
			.finally(() => setLoading(false))
	}, [searchQuery, isMounted]) // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<>
			<div className="container mx-auto p-6">
				<div className="flex justify-between items-center mb-6">
					<div>
						<h1 className="text-3xl font-bold">Invoices Management</h1>
						<p className="text-muted-foreground">
							Create and manage invoices linked to quotations.
						</p>
					</div>

					<Button onClick={() => setIsCreateOpen(true)} className="text-white" style={{ backgroundColor: "#202F21" }}>
						<Plus className="w-5 h-5 mr-2" />
						Create Invoice
					</Button>
				</div>

			{/* Filter Section: full-width search, then filters on one row */}
			{isMounted && (
				<div className="mb-6 flex flex-col gap-3">
					<div className="relative w-full">
						<Search className="absolute left-3 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<Input
							type="search"
							placeholder="Search invoices, client..."
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="w-full pl-9 bg-white border-2"
							style={{ borderColor: "#BDC4A5" }}
							aria-label="Search invoices"
						/>
					</div>
					<div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
						<Filter className="w-4 h-4 shrink-0 text-muted-foreground" />
						<span className="shrink-0 text-sm font-medium">Filters</span>
						<Select value={typeFilter} onValueChange={handleTypeFilterChange}>
							<SelectTrigger className="h-9 w-[min(12rem,100%)] shrink-0 bg-white border-2 sm:w-48" style={{ borderColor: "#BDC4A5" }}>
								<SelectValue placeholder="All types" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								{invoiceTypeOptions.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{initialAdvisors.length > 0 && (
							<Select value={advisorFilter} onValueChange={handleAdvisorFilterChange}>
								<SelectTrigger className="h-9 w-[min(12rem,100%)] shrink-0 bg-white border-2 sm:w-48" style={{ borderColor: "#BDC4A5" }}>
									<SelectValue placeholder="All Advisors" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Advisors</SelectItem>
									{initialAdvisors.map((advisor) => (
										<SelectItem key={advisor.id} value={advisor.id}>
											{advisor.firstName} {advisor.lastName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						<div className="flex shrink-0 items-center gap-1.5">
							<Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
							<Select value={monthYearFilter} onValueChange={handleMonthYearFilterChange}>
								<SelectTrigger className="h-9 w-[min(12.5rem,85vw)] bg-white border-2 sm:w-[200px]" style={{ borderColor: "#BDC4A5" }}>
									<SelectValue placeholder="All months" />
								</SelectTrigger>
								<SelectContent className="max-h-72">
									{monthYearOptions.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{(typeFilter !== "all" || advisorFilter !== "all" || monthYearFilter !== "all") && (
							<Button
								variant="outline"
								size="sm"
								onClick={async () => {
									setTypeFilter("all")
									setAdvisorFilter("all")
									setMonthYearFilter("all")
									setPage(1)
									setLoading(true)
									try {
										const result = await getInvoicesPaginatedFresh(1, pageSize, {
											searchQuery: searchQuery || undefined,
										})
										setInvoices(result.data as InvoiceWithQuotation[])
										setTotal(result.total)
										setTotalPages(result.totalPages)
									} catch (error) {
										if (process.env.NODE_ENV === "development") {
											console.error("Error fetching invoices:", error)
										}
									} finally {
										setLoading(false)
									}
								}}
								className="shrink-0 bg-white border-2"
								style={{ borderColor: "#BDC4A5" }}
							>
								Clear Filters
							</Button>
						)}
						<span className="ml-auto shrink-0 pl-2 text-sm text-muted-foreground whitespace-nowrap">
							Showing {invoices.length} of {total} invoices
						</span>
					</div>
				</div>
			)}

				{/* Invoices List - Keep previous list visible during loading */}
				<div className="relative">
					<div className="space-y-2">
						{invoices.map((invoice) => (
							<InvoiceCard
								key={invoice.id}
								invoice={invoice}
								onRefresh={handleSuccess}
								isAdmin={isAdmin}
								userId={userId}
							/>
						))}
					</div>

					{/* Lightweight loading indicator - only show when loading and we have data */}
					{loading && invoices.length > 0 && (
						<div className="flex items-center justify-center py-4">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<div className="h-4 w-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
								<span>Loading...</span>
							</div>
						</div>
					)}

					{/* Full loading state - only when no data yet */}
					{loading && invoices.length === 0 && (
						<div className="flex flex-col items-center justify-center py-20 text-primary">
							<div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
							<p className="text-lg font-medium">Loading invoices…</p>
						</div>
					)}
				</div>

				{!loading && invoices.length === 0 && total === 0 && typeFilter === "all" && advisorFilter === "all" && monthYearFilter === "all" && !searchQuery && (
					<div className="text-center py-12">
						<FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground">No invoices available.</p>
					</div>
				)}

				{!loading && invoices.length === 0 && (typeFilter !== "all" || advisorFilter !== "all" || monthYearFilter !== "all" || searchQuery) && (
					<div className="text-center py-12">
						<FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground">
							{searchQuery ? "No invoices match your search." : "No invoices match the selected filter."}
						</p>
						<Button
							variant="outline"
							className="mt-4 bg-white border-2"
							style={{ borderColor: "#BDC4A5" }}
							onClick={async () => {
								setTypeFilter("all")
								setAdvisorFilter("all")
								setMonthYearFilter("all")
								if (searchQuery) {
									setSearchInput("")
									setSearchQuery("")
								}
								setPage(1)
								setLoading(true)
								try {
									const result = await getInvoicesPaginatedFresh(1, pageSize, {})
									setInvoices(result.data as InvoiceWithQuotation[])
									setTotal(result.total)
									setTotalPages(result.totalPages)
								} catch (error) {
									if (process.env.NODE_ENV === "development") {
										console.error("Error fetching invoices:", error)
									}
								} finally {
									setLoading(false)
								}
							}}
						>
							Clear Filters
						</Button>
					</div>
				)}

				{/* Pagination */}
				<ProjectPagination
					currentPage={page}
					totalPages={totalPages}
					pageSize={pageSize}
					total={total}
					onPageChange={goToPage}
					onPageSizeChange={setPageSize}
				/>

				{/* Create Invoice Form */}
				<CreateInvoiceForm isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={handleSuccess} isAdminProp={isAdmin} />
			</div>
		</>
	)
}


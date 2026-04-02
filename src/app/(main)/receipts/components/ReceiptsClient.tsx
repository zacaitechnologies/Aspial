"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, FileText, Filter, Search, Calendar, CreditCard } from "lucide-react"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import type { ReceiptListFilters } from "@/lib/validation"
import { getReceiptsPaginatedFresh, invalidateReceiptsCache } from "../action"
import CreateReceiptForm from "./CreateReceiptForm"
import ReceiptCard from "./ReceiptCard"
import { ReceiptWithInvoice, PAYMENT_METHOD_LABELS, type PaymentMethodType } from "../types"
import { ProjectPagination } from "../../projects/components/ProjectPagination"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"

const PAYMENT_METHOD_VALUES = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethodType[]

interface ReceiptsClientProps {
	initialData: {
		data: ReceiptWithInvoice[]
		total: number
		page: number
		pageSize: number
		totalPages: number
	}
	userId?: string
	isAdmin: boolean
	initialAdvisors: { id: string; firstName: string; lastName: string }[]
}

export default function ReceiptsClient({
	initialData,
	userId,
	isAdmin,
	initialAdvisors,
}: ReceiptsClientProps) {
	const [isMounted, setIsMounted] = useState(false)
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [advisorFilter, setAdvisorFilter] = useState<string>("all")
	const [monthYearFilter, setMonthYearFilter] = useState<string>("all")
	const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
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

	const buildListFilters = useCallback((): ReceiptListFilters => {
		return {
			searchQuery: searchQuery || undefined,
			advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
			monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
			paymentMethod: paymentMethodFilter !== "all" ? paymentMethodFilter : undefined,
		}
	}, [searchQuery, advisorFilter, monthYearFilter, paymentMethodFilter])

	const [receipts, setReceipts] = useState<ReceiptWithInvoice[]>(initialData.data)
	const [loading, setLoading] = useState(false)
	const [page, setPage] = useState(initialData.page)
	const [pageSize, setPageSizeState] = useState(initialData.pageSize)
	const [total, setTotal] = useState(initialData.total)
	const [totalPages, setTotalPages] = useState(initialData.totalPages)

	useEffect(() => {
		setIsMounted(true)
	}, [])

	useEffect(() => {
		const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
		return () => clearTimeout(t)
	}, [searchInput])

	const fetchReceipts = useCallback(async () => {
		setLoading(true)
		try {
			const result = await getReceiptsPaginatedFresh(page, pageSize, buildListFilters())
			setReceipts(result.data as ReceiptWithInvoice[])
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			if (process.env.NODE_ENV === "development") {
				console.error("Error fetching receipts:", error)
			}
		} finally {
			setLoading(false)
		}
	}, [page, pageSize, buildListFilters])

	const handleAdvisorFilterChange = useCallback(
		async (value: string) => {
			setAdvisorFilter(value)
			setPage(1)
			setLoading(true)
			try {
				const result = await getReceiptsPaginatedFresh(1, pageSize, {
					searchQuery: searchQuery || undefined,
					advisorFilter: value !== "all" ? value : undefined,
					monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
					paymentMethod: paymentMethodFilter !== "all" ? paymentMethodFilter : undefined,
				})
				setReceipts(result.data as ReceiptWithInvoice[])
				setTotal(result.total)
				setTotalPages(result.totalPages)
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Error fetching receipts:", error)
				}
			} finally {
				setLoading(false)
			}
		},
		[pageSize, searchQuery, monthYearFilter, paymentMethodFilter]
	)

	const handleMonthYearFilterChange = useCallback(
		async (value: string) => {
			setMonthYearFilter(value)
			setPage(1)
			setLoading(true)
			try {
				const result = await getReceiptsPaginatedFresh(1, pageSize, {
					searchQuery: searchQuery || undefined,
					advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
					monthYear: value !== "all" ? value : undefined,
					paymentMethod: paymentMethodFilter !== "all" ? paymentMethodFilter : undefined,
				})
				setReceipts(result.data as ReceiptWithInvoice[])
				setTotal(result.total)
				setTotalPages(result.totalPages)
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Error fetching receipts:", error)
				}
			} finally {
				setLoading(false)
			}
		},
		[pageSize, searchQuery, advisorFilter, paymentMethodFilter]
	)

	const handlePaymentMethodFilterChange = useCallback(
		async (value: string) => {
			setPaymentMethodFilter(value)
			setPage(1)
			setLoading(true)
			try {
				const result = await getReceiptsPaginatedFresh(1, pageSize, {
					searchQuery: searchQuery || undefined,
					advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
					monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
					paymentMethod: value !== "all" ? value : undefined,
				})
				setReceipts(result.data as ReceiptWithInvoice[])
				setTotal(result.total)
				setTotalPages(result.totalPages)
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Error fetching receipts:", error)
				}
			} finally {
				setLoading(false)
			}
		},
		[pageSize, searchQuery, advisorFilter, monthYearFilter]
	)

	const goToPage = useCallback(
		async (newPage: number) => {
			setPage(newPage)
			setLoading(true)
			try {
				const result = await getReceiptsPaginatedFresh(newPage, pageSize, {
					searchQuery: searchQuery || undefined,
					advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
					monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
					paymentMethod: paymentMethodFilter !== "all" ? paymentMethodFilter : undefined,
				})
				setReceipts(result.data as ReceiptWithInvoice[])
				setTotal(result.total)
				setTotalPages(result.totalPages)
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Error fetching receipts:", error)
				}
			} finally {
				setLoading(false)
			}
		},
		[pageSize, searchQuery, advisorFilter, monthYearFilter, paymentMethodFilter]
	)

	const setPageSize = useCallback(
		async (size: number) => {
			setPageSizeState(size)
			setPage(1)
			setLoading(true)
			try {
				const result = await getReceiptsPaginatedFresh(1, size, {
					searchQuery: searchQuery || undefined,
					advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
					monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
					paymentMethod: paymentMethodFilter !== "all" ? paymentMethodFilter : undefined,
				})
				setReceipts(result.data as ReceiptWithInvoice[])
				setTotal(result.total)
				setTotalPages(result.totalPages)
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Error fetching receipts:", error)
				}
			} finally {
				setLoading(false)
			}
		},
		[searchQuery, advisorFilter, monthYearFilter, paymentMethodFilter]
	)

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
		getReceiptsPaginatedFresh(1, pageSize, {
			searchQuery: searchQuery || undefined,
			advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
			monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
			paymentMethod: paymentMethodFilter !== "all" ? paymentMethodFilter : undefined,
		})
			.then((result) => {
				setReceipts(result.data as ReceiptWithInvoice[])
				setTotal(result.total)
				setTotalPages(result.totalPages)
			})
			.catch((err) => {
				if (process.env.NODE_ENV === "development") {
					console.error("Error fetching receipts:", err)
				}
			})
			.finally(() => setLoading(false))
	}, [searchQuery, isMounted]) // eslint-disable-line react-hooks/exhaustive-deps

	const handleSuccess = useCallback(async () => {
		await invalidateReceiptsCache()
		await fetchReceipts()
	}, [fetchReceipts])

	const hasActiveFilters =
		advisorFilter !== "all" || monthYearFilter !== "all" || paymentMethodFilter !== "all"

	return (
		<>
			<div className="container mx-auto p-6">
				<div className="mb-6 flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold">Receipts Management</h1>
						<p className="text-muted-foreground">
							Create and manage payment receipts linked to invoices.
						</p>
					</div>

					<Button onClick={() => setIsCreateOpen(true)} className="text-white" style={{ backgroundColor: "#202F21" }}>
						<Plus className="mr-2 h-5 w-5" />
						Create Receipt
					</Button>
				</div>

				{isMounted && (
					<div className="mb-6 flex flex-col gap-3">
						<div className="relative w-full">
							<Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Search receipts, invoice, client..."
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								className="w-full border-2 bg-white pl-9"
								style={{ borderColor: "#BDC4A5" }}
								aria-label="Search receipts"
							/>
						</div>
						<div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
							<Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
							<span className="shrink-0 text-sm font-medium">Filters</span>
							{initialAdvisors.length > 0 && (
								<Select value={advisorFilter} onValueChange={handleAdvisorFilterChange}>
									<SelectTrigger
										className="h-9 w-[min(12rem,100%)] shrink-0 border-2 bg-white sm:w-48"
										style={{ borderColor: "#BDC4A5" }}
									>
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
									<SelectTrigger
										className="h-9 w-[min(12.5rem,85vw)] border-2 bg-white sm:w-[200px]"
										style={{ borderColor: "#BDC4A5" }}
									>
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
							<div className="flex shrink-0 items-center gap-1.5">
								<CreditCard className="h-4 w-4 text-muted-foreground" aria-hidden />
								<Select value={paymentMethodFilter} onValueChange={handlePaymentMethodFilterChange}>
									<SelectTrigger
										className="h-9 w-[min(12rem,85vw)] border-2 bg-white sm:w-44"
										style={{ borderColor: "#BDC4A5" }}
									>
										<SelectValue placeholder="All methods" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All methods</SelectItem>
										{PAYMENT_METHOD_VALUES.map((pm) => (
											<SelectItem key={pm} value={pm}>
												{PAYMENT_METHOD_LABELS[pm]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{hasActiveFilters && (
								<Button
									variant="outline"
									size="sm"
									onClick={async () => {
										setAdvisorFilter("all")
										setMonthYearFilter("all")
										setPaymentMethodFilter("all")
										setPage(1)
										setLoading(true)
										try {
											const result = await getReceiptsPaginatedFresh(1, pageSize, {
												searchQuery: searchQuery || undefined,
											})
											setReceipts(result.data as ReceiptWithInvoice[])
											setTotal(result.total)
											setTotalPages(result.totalPages)
										} catch (error) {
											if (process.env.NODE_ENV === "development") {
												console.error("Error fetching receipts:", error)
											}
										} finally {
											setLoading(false)
										}
									}}
									className="shrink-0 border-2 bg-white"
									style={{ borderColor: "#BDC4A5" }}
								>
									Clear Filters
								</Button>
							)}
							<span className="ml-auto shrink-0 pl-2 text-sm whitespace-nowrap text-muted-foreground">
								Showing {receipts.length} of {total} receipts
							</span>
						</div>
					</div>
				)}

				<div className="relative">
					<div className="space-y-2">
						{receipts.map((receipt) => (
							<ReceiptCard
								key={receipt.id}
								receipt={receipt}
								onRefresh={handleSuccess}
								isAdmin={isAdmin}
								userId={userId || ""}
							/>
						))}
					</div>

					{loading && receipts.length > 0 && (
						<div className="flex items-center justify-center py-4">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
								<span>Loading...</span>
							</div>
						</div>
					)}

					{loading && receipts.length === 0 && (
						<div className="flex flex-col items-center justify-center py-20 text-primary">
							<div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
							<p className="text-lg font-medium">Loading receipts…</p>
						</div>
					)}
				</div>

				{!loading && receipts.length === 0 && total === 0 && !hasActiveFilters && !searchQuery && (
					<div className="py-12 text-center">
						<FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<p className="text-muted-foreground">No receipts available.</p>
					</div>
				)}

				{!loading && receipts.length === 0 && hasActiveFilters && (
					<div className="py-12 text-center">
						<FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<p className="text-muted-foreground">No receipts match the selected filter.</p>
						<Button
							variant="outline"
							className="mt-4 border-2 bg-white"
							style={{ borderColor: "#BDC4A5" }}
							onClick={async () => {
								setAdvisorFilter("all")
								setMonthYearFilter("all")
								setPaymentMethodFilter("all")
								setPage(1)
								setLoading(true)
								try {
									const result = await getReceiptsPaginatedFresh(1, pageSize, {
										searchQuery: searchQuery || undefined,
									})
									setReceipts(result.data as ReceiptWithInvoice[])
									setTotal(result.total)
									setTotalPages(result.totalPages)
								} finally {
									setLoading(false)
								}
							}}
						>
							Clear Filters
						</Button>
					</div>
				)}

				{!loading && receipts.length === 0 && !hasActiveFilters && searchQuery && (
					<div className="py-12 text-center">
						<FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<p className="text-muted-foreground">No receipts match your search.</p>
						<Button
							variant="outline"
							className="mt-4 border-2 bg-white"
							style={{ borderColor: "#BDC4A5" }}
							onClick={() => {
								setSearchInput("")
								setSearchQuery("")
							}}
						>
							Clear Search
						</Button>
					</div>
				)}

				<ProjectPagination
					currentPage={page}
					totalPages={totalPages}
					pageSize={pageSize}
					total={total}
					onPageChange={goToPage}
					onPageSizeChange={setPageSize}
				/>

				<CreateReceiptForm isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={handleSuccess} isAdminProp={isAdmin} />
			</div>
		</>
	)
}

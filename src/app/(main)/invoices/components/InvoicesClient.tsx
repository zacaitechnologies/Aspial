"use client"

import { Button } from "@/components/ui/button"
import { Plus, FileText, Filter } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
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
}

export default function InvoicesClient({ initialData, userId, isAdmin }: InvoicesClientProps) {
	const [isMounted, setIsMounted] = useState(false)
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [typeFilter, setTypeFilter] = useState<string>("all")

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

	// Fetch fresh data - called directly from handlers, not useEffect
	const fetchInvoices = useCallback(async () => {
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(page, pageSize, {
				typeFilter: typeFilter !== "all" ? typeFilter : undefined,
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
	}, [page, pageSize, typeFilter])

	const handleSuccess = useCallback(async () => {
		await invalidateInvoicesCache()
		await fetchInvoices()
	}, [fetchInvoices])

	// Handle filter changes directly via callbacks - fetch immediately
	const handleTypeFilterChange = useCallback(async (value: string) => {
		setTypeFilter(value)
		setPage(1) // Reset to first page when filter changes
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(1, pageSize, {
				typeFilter: value !== "all" ? value : undefined,
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
	}, [pageSize])

	// Handle page changes - fetch directly
	const goToPage = useCallback(async (newPage: number) => {
		setPage(newPage)
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(newPage, pageSize, {
				typeFilter: typeFilter !== "all" ? typeFilter : undefined,
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
	}, [pageSize, typeFilter])

	const setPageSize = useCallback(async (size: number) => {
		setPageSizeState(size)
		setPage(1)
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(1, size, {
				typeFilter: typeFilter !== "all" ? typeFilter : undefined,
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
	}, [typeFilter])

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

			{/* Filter Section */}
			{isMounted && (
				<div className="mb-6 flex items-center gap-3">
					<Filter className="w-4 h-4 text-gray-500" />
					<span className="text-sm font-medium">Filter by type:</span>
					<Select value={typeFilter} onValueChange={handleTypeFilterChange}>
						<SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
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
					{typeFilter !== "all" && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => handleTypeFilterChange("all")}
							className="bg-white border-2"
							style={{ borderColor: "#BDC4A5" }}
						>
							Clear Filter
						</Button>
					)}
					<span className="text-sm text-muted-foreground ml-auto">
						Showing {invoices.length} of {total} invoices
					</span>
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

				{!loading && invoices.length === 0 && total === 0 && typeFilter === "all" && (
					<div className="text-center py-12">
						<FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground">No invoices available.</p>
					</div>
				)}

				{!loading && invoices.length === 0 && typeFilter !== "all" && (
					<div className="text-center py-12">
						<FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground">No invoices match the selected filter.</p>
						<Button
							variant="outline"
							className="mt-4 bg-white border-2"
							style={{ borderColor: "#BDC4A5" }}
							onClick={() => handleTypeFilterChange("all")}
						>
							Clear Filter
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
				<CreateInvoiceForm isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={handleSuccess} />
			</div>
		</>
	)
}


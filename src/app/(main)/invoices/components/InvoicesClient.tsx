"use client"

import { Button } from "@/components/ui/button"
import { Plus, FileText, Filter } from "lucide-react"
import { useState, useCallback, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { getInvoicesPaginatedFresh, invalidateInvoicesCache } from "../action"
import CreateInvoiceForm from "./CreateInvoiceForm"
import InvoiceCard from "./InvoiceCard"
import { InvoiceWithQuotation, invoiceTypeOptions } from "../types"
import { useSession } from "../../contexts/SessionProvider"
import { checkHasFullAccess } from "../../actions/admin-actions"
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
	userId?: string
}

export default function InvoicesClient({ initialData, userId }: InvoicesClientProps) {
	const { enhancedUser } = useSession()
	const pathname = usePathname()
	const prevPathnameRef = useRef<string | null>(null)
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [typeFilter, setTypeFilter] = useState<string>("all")
	const [isInitialLoad, setIsInitialLoad] = useState(true)

	// State from initial data
	const [invoices, setInvoices] = useState<InvoiceWithQuotation[]>(initialData.data)
	const [loading, setLoading] = useState(false)
	const [page, setPage] = useState(initialData.page)
	const [pageSize, setPageSizeState] = useState(initialData.pageSize)
	const [total, setTotal] = useState(initialData.total)
	const [totalPages, setTotalPages] = useState(initialData.totalPages)
	const [isAdmin, setIsAdmin] = useState(false)

	// Fetch admin/brand-advisor status once on mount
	useEffect(() => {
		const fetchAdminStatus = async () => {
			if (enhancedUser?.id) {
				try {
					const hasFullAccess = await checkHasFullAccess(enhancedUser.id)
					setIsAdmin(hasFullAccess)
				} catch (error) {
					console.error("Error checking admin status:", error)
				}
			}
		}
		fetchAdminStatus()
	}, [enhancedUser?.id])

	// Fetch fresh data when filters change
	const fetchInvoices = useCallback(async () => {
		setLoading(true)
		try {
			const result = await getInvoicesPaginatedFresh(page, pageSize, {
				typeFilter: typeFilter !== "all" ? typeFilter : undefined,
			})
			setInvoices(result.data)
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			console.error("Error fetching invoices:", error)
		} finally {
			setLoading(false)
		}
	}, [page, pageSize, typeFilter])

	// Refetch when filters/pagination change (but skip initial load since we have server data)
	useEffect(() => {
		if (isInitialLoad) {
			setIsInitialLoad(false)
			return
		}
		fetchInvoices()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, pageSize, typeFilter])

	const handleSuccess = useCallback(async () => {
		await invalidateInvoicesCache()
		fetchInvoices()
	}, [fetchInvoices])

	// Refresh data when navigating back to list page from detail page
	useEffect(() => {
		// Check if we're coming back from a detail page (pathname changed from /invoices/[id] to /invoices)
		if (prevPathnameRef.current && prevPathnameRef.current.startsWith('/invoices/') && pathname === '/invoices' && !isInitialLoad) {
			// We navigated back from a detail page - refresh the list
			invalidateInvoicesCache().then(() => {
				fetchInvoices()
			})
		}
		prevPathnameRef.current = pathname
	}, [pathname, fetchInvoices, isInitialLoad])

	// Refresh data when page becomes visible again (e.g., switching tabs)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible' && !isInitialLoad) {
				// Invalidate cache and refresh when page becomes visible
				invalidateInvoicesCache().then(() => {
					fetchInvoices()
				})
			}
		}

		const handleFocus = () => {
			if (!isInitialLoad) {
				// Refresh when window regains focus
				invalidateInvoicesCache().then(() => {
					fetchInvoices()
				})
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)
		window.addEventListener('focus', handleFocus)

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			window.removeEventListener('focus', handleFocus)
		}
	}, [fetchInvoices, isInitialLoad])

	const goToPage = useCallback((newPage: number) => {
		setPage(newPage)
	}, [])

	const setPageSize = useCallback((size: number) => {
		setPageSizeState(size)
		setPage(1)
	}, [])

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
				<div className="mb-6 flex items-center gap-3">
					<Filter className="w-4 h-4 text-gray-500" />
					<span className="text-sm font-medium">Filter by type:</span>
					<Select value={typeFilter} onValueChange={setTypeFilter}>
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
							onClick={() => setTypeFilter("all")}
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

				{/* Invoices List - Keep previous list visible during loading */}
				<div className="relative">
					<div className="space-y-2">
						{invoices.map((invoice) => (
							<InvoiceCard
								key={invoice.id}
								invoice={invoice}
								onRefresh={handleSuccess}
								isAdmin={isAdmin}
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
							onClick={() => setTypeFilter("all")}
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


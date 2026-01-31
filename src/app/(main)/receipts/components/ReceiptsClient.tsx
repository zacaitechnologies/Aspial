"use client"

import { Button } from "@/components/ui/button"
import { Plus, FileText } from "lucide-react"
import { useState, useCallback } from "react"
import { getReceiptsPaginatedFresh, invalidateReceiptsCache } from "../action"
import CreateReceiptForm from "./CreateReceiptForm"
import ReceiptCard from "./ReceiptCard"
import { ReceiptWithInvoice } from "../types"
import { ProjectPagination } from "../../projects/components/ProjectPagination"

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
}

export default function ReceiptsClient({ initialData, userId, isAdmin }: ReceiptsClientProps) {
	const [isCreateOpen, setIsCreateOpen] = useState(false)

	// State from initial data - use initial data directly, no copying to state unless it changes
	const [receipts, setReceipts] = useState<ReceiptWithInvoice[]>(initialData.data)
	const [loading, setLoading] = useState(false)
	const [page, setPage] = useState(initialData.page)
	const [pageSize, setPageSizeState] = useState(initialData.pageSize)
	const [total, setTotal] = useState(initialData.total)
	const [totalPages, setTotalPages] = useState(initialData.totalPages)

	// Fetch fresh data - called directly from handlers, not useEffect
	const fetchReceipts = useCallback(async () => {
		setLoading(true)
		try {
			const result = await getReceiptsPaginatedFresh(page, pageSize, {})
			setReceipts(result.data as ReceiptWithInvoice[])
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error fetching receipts:", error)
			}
		} finally {
			setLoading(false)
		}
	}, [page, pageSize])

	const handleSuccess = useCallback(async () => {
		await invalidateReceiptsCache()
		await fetchReceipts()
	}, [fetchReceipts])

	// Handle page changes - fetch directly
	const goToPage = useCallback(async (newPage: number) => {
		setPage(newPage)
		setLoading(true)
		try {
			const result = await getReceiptsPaginatedFresh(newPage, pageSize, {})
			setReceipts(result.data as ReceiptWithInvoice[])
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error fetching receipts:", error)
			}
		} finally {
			setLoading(false)
		}
	}, [pageSize])

	const setPageSize = useCallback(async (size: number) => {
		setPageSizeState(size)
		setPage(1)
		setLoading(true)
		try {
			const result = await getReceiptsPaginatedFresh(1, size, {})
			setReceipts(result.data as ReceiptWithInvoice[])
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error fetching receipts:", error)
			}
		} finally {
			setLoading(false)
		}
	}, [])

	return (
		<>
			<div className="container mx-auto p-6">
				<div className="flex justify-between items-center mb-6">
					<div>
						<h1 className="text-3xl font-bold">Receipts Management</h1>
						<p className="text-muted-foreground">
							Create and manage payment receipts linked to invoices.
						</p>
					</div>

					<Button onClick={() => setIsCreateOpen(true)} className="text-white" style={{ backgroundColor: "#202F21" }}>
						<Plus className="w-5 h-5 mr-2" />
						Create Receipt
					</Button>
				</div>

				<span className="text-sm text-muted-foreground mb-6 block">
					Showing {receipts.length} of {total} receipts
				</span>

				{/* Receipts List - Keep previous list visible during loading */}
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

					{/* Lightweight loading indicator - only show when loading and we have data */}
					{loading && receipts.length > 0 && (
						<div className="flex items-center justify-center py-4">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<div className="h-4 w-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
								<span>Loading...</span>
							</div>
						</div>
					)}

					{/* Full loading state - only when no data yet */}
					{loading && receipts.length === 0 && (
						<div className="flex flex-col items-center justify-center py-20 text-primary">
							<div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
							<p className="text-lg font-medium">Loading receipts…</p>
						</div>
					)}
				</div>

				{!loading && receipts.length === 0 && total === 0 && (
					<div className="text-center py-12">
						<FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground">No receipts available.</p>
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

				{/* Create Receipt Form */}
				<CreateReceiptForm isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={handleSuccess} isAdminProp={isAdmin} />
			</div>
		</>
	)
}


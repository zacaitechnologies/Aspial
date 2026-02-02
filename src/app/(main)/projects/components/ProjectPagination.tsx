'use client'

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

interface ProjectPaginationProps {
	currentPage: number
	totalPages: number
	pageSize: number
	total: number
	onPageChange: (page: number) => void
	onPageSizeChange: (size: number) => void
	/** Label for the entity (e.g. "clients", "items", "quotations"). Default "items". */
	itemLabel?: string
}

export function ProjectPagination({
	currentPage,
	totalPages,
	pageSize,
	total,
	onPageChange,
	onPageSizeChange,
	itemLabel = "items",
}: ProjectPaginationProps) {
	const generatePageNumbers = () => {
		const pages: (number | 'ellipsis')[] = []
		const maxVisible = 5

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i)
			}
		} else {
			if (currentPage <= 3) {
				for (let i = 1; i <= 4; i++) {
					pages.push(i)
				}
				pages.push('ellipsis')
				pages.push(totalPages)
			} else if (currentPage >= totalPages - 2) {
				pages.push(1)
				pages.push('ellipsis')
				for (let i = totalPages - 3; i <= totalPages; i++) {
					pages.push(i)
				}
			} else {
				pages.push(1)
				pages.push('ellipsis')
				for (let i = currentPage - 1; i <= currentPage + 1; i++) {
					pages.push(i)
				}
				pages.push('ellipsis')
				pages.push(totalPages)
			}
		}

		return pages
	}

	// Hide only when there are no items; show "Showing X to Y of Z" and per-page selector even for a single page
	if (total === 0) {
		return null
	}

	const startItem = (currentPage - 1) * pageSize + 1
	const endItem = Math.min(currentPage * pageSize, total)

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-6 px-2">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
				<p className="text-sm text-muted-foreground">
					Showing <span className="font-medium text-foreground">{startItem}</span> to{' '}
					<span className="font-medium text-foreground">{endItem}</span> of{' '}
					<span className="font-medium text-foreground">{total}</span> {itemLabel}
				</p>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">Per page:</span>
					<Select
						value={pageSize.toString()}
						onValueChange={(value) => onPageSizeChange(parseInt(value))}
					>
						<SelectTrigger className="w-[70px] h-8">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="5">5</SelectItem>
							<SelectItem value="10">10</SelectItem>
							<SelectItem value="12">12</SelectItem>
							<SelectItem value="20">20</SelectItem>
							<SelectItem value="50">50</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<Pagination>
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious
							href="#"
							onClick={(e) => {
								e.preventDefault()
								if (currentPage > 1) onPageChange(currentPage - 1)
							}}
							className={
								currentPage === 1
									? 'pointer-events-none opacity-50'
									: 'cursor-pointer'
							}
						/>
					</PaginationItem>

					{generatePageNumbers().map((page, index) =>
						page === 'ellipsis' ? (
							<PaginationItem key={`ellipsis-${index}`}>
								<PaginationEllipsis />
							</PaginationItem>
						) : (
							<PaginationItem key={page}>
								<PaginationLink
									href="#"
									onClick={(e) => {
										e.preventDefault()
										onPageChange(page)
									}}
									isActive={currentPage === page}
									className="cursor-pointer"
								>
									{page}
								</PaginationLink>
							</PaginationItem>
						)
					)}

					<PaginationItem>
						<PaginationNext
							href="#"
							onClick={(e) => {
								e.preventDefault()
								if (currentPage < totalPages) onPageChange(currentPage + 1)
							}}
							className={
								currentPage === totalPages
									? 'pointer-events-none opacity-50'
									: 'cursor-pointer'
							}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	)
}



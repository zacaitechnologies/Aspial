"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"
import type { Services } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format-number"

interface QuotationServiceSearchItemProps {
	service: Services
	onAdd: () => void
	defaultExpanded?: boolean
}

export function QuotationServiceSearchItem({
	service,
	onAdd,
	defaultExpanded,
}: QuotationServiceSearchItemProps) {
	const [open, setOpen] = useState(defaultExpanded ?? false)

	useEffect(() => {
		setOpen(defaultExpanded ?? false)
	}, [defaultExpanded])

	return (
		<div className="border rounded p-2 hover:bg-muted/50">
			<div className="flex items-center justify-between">
				<div
					className="flex-1 min-w-0 cursor-pointer"
					onClick={() => setOpen((v) => !v)}
				>
					<p className="font-medium text-sm">{service.name}</p>
					<p className="text-sm font-medium text-foreground tabular-nums">
						RM{formatNumber(service.basePrice)}
					</p>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={() => setOpen((v) => !v)}
						className="h-7 w-7 p-0"
						aria-label={open ? "Hide description" : "Show description"}
					>
						{open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
					</Button>
					<Button type="button" size="sm" variant="ghost" onClick={onAdd} className="h-7 w-7 p-0">
						<Plus className="w-4 h-4" />
					</Button>
				</div>
			</div>
			{open && service.description && (
				<p className="text-sm text-foreground mt-1 whitespace-pre-line">{service.description}</p>
			)}
		</div>
	)
}

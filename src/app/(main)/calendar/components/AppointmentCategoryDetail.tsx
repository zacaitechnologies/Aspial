import { Tag } from "lucide-react"
import type { CalendarBooking } from "../actions"
import { formatAppointmentCategoryLabel } from "../utils/calendar-utils"
import { cn } from "@/lib/utils"

interface AppointmentCategoryDetailProps {
	booking: CalendarBooking
	className?: string
	/** When true, renders inline label prefix (tooltip / list style). */
	showLabel?: boolean
}

export function AppointmentCategoryDetail({
	booking,
	className,
	showLabel = true,
}: AppointmentCategoryDetailProps) {
	const categoryLabel = formatAppointmentCategoryLabel(booking)
	if (!categoryLabel) return null

	return (
		<div className={cn("flex items-center gap-1.5 text-xs", className)}>
			<Tag className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
			{showLabel ? (
				<>
					<span className="text-muted-foreground">Category:</span>
					<span>{categoryLabel}</span>
				</>
			) : (
				<span>{categoryLabel}</span>
			)}
		</div>
	)
}

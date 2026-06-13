import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CalendarBooking } from "../actions"

interface AppointmentCancellationDetailProps {
	booking: CalendarBooking
	/** Inline rows for tooltips; panel for the details dialog. */
	variant?: "inline" | "panel"
	className?: string
}

const cancelledBadgeClass =
	"border-dashed border-muted-foreground/50 bg-muted font-semibold text-foreground"

export function AppointmentCancellationDetail({
	booking,
	variant = "inline",
	className,
}: AppointmentCancellationDetailProps) {
	const isCancelled = booking.type === "appointment" && booking.status === "cancelled"
	if (!isCancelled) return null

	const reason = booking.cancellationReason?.trim() || "No reason provided"

	if (variant === "panel") {
		return (
			<div
				className={cn(
					"rounded-md border border-dashed border-border bg-muted/50 px-3 py-2 text-sm",
					className
				)}
			>
				<Badge variant="outline" className={cn("mb-1.5", cancelledBadgeClass)}>
					Cancelled
				</Badge>
				<p className="min-w-0 break-words">
					<span className="text-muted-foreground">Reason: </span>
					{reason}
				</p>
			</div>
		)
	}

	return (
		<div className={cn("space-y-1", className)}>
			<Badge variant="outline" className={cancelledBadgeClass}>
				Cancelled
			</Badge>
			<p className="text-muted-foreground line-clamp-3 break-words">
				<span className="font-medium">Reason: </span>
				{reason}
			</p>
		</div>
	)
}

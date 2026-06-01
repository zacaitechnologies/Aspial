"use client"

import { CalendarView } from "../utils/calendar-utils"
import {
	calToolbarControlActiveClass,
	calToolbarControlClass,
} from "../utils/calendar-toolbar-styles"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ViewSwitcherProps {
	currentView: CalendarView
	onViewChange: (view: CalendarView) => void
}

const VIEWS: Array<{ value: CalendarView; label: string; shortLabel: string }> = [
	{ value: "month", label: "Month", shortLabel: "M" },
	{ value: "week", label: "Week", shortLabel: "W" },
	{ value: "day", label: "Day", shortLabel: "D" },
]

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
	return (
		<div className="inline-flex shrink-0 items-center gap-2">
			{VIEWS.map(({ value, label, shortLabel }) => {
				const active = currentView === value
				return (
					<Button
						key={value}
						variant="outline"
						size="sm"
						onClick={() => onViewChange(value)}
						className={cn(
							"min-w-8 px-2.5 text-xs font-semibold sm:px-3 sm:text-sm",
							active ? calToolbarControlActiveClass : calToolbarControlClass
						)}
						aria-label={label}
						title={label}
					>
						{shortLabel}
					</Button>
				)
			})}
		</div>
	)
}

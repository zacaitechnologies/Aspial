"use client"

import { CalendarView } from "../utils/calendar-utils"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarDays, CalendarClock, LucideIcon } from "lucide-react"

interface ViewSwitcherProps {
	currentView: CalendarView
	onViewChange: (view: CalendarView) => void
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
	const views: Array<{ value: CalendarView; label: string; icon: LucideIcon }> = [
		{ value: 'month', label: 'Month', icon: Calendar },
		{ value: 'week', label: 'Week', icon: CalendarDays },
		{ value: 'day', label: 'Day', icon: CalendarClock }
	]

	return (
		<div className="inline-flex rounded-lg border border-border bg-muted p-1">
			{views.map(({ value, label, icon: Icon }) => {
				const active = currentView === value
				return (
					<Button
						key={value}
						variant={active ? "default" : "ghost"}
						size="sm"
						onClick={() => onViewChange(value)}
						className={`flex items-center gap-2 h-8 ${
							active
								? "bg-primary text-primary-foreground hover:bg-primary/90"
								: "text-foreground hover:bg-muted-foreground/10"
						}`}
					>
						<Icon className="w-4 h-4" />
						{label}
					</Button>
				)
			})}
		</div>
	)
}

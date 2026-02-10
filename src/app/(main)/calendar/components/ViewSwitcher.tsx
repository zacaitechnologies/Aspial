"use client"

import { CalendarView } from "../utils/calendar-utils"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarDays, CalendarClock } from "lucide-react"

interface ViewSwitcherProps {
	currentView: CalendarView
	onViewChange: (view: CalendarView) => void
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
	const views: Array<{ value: CalendarView; label: string; icon: any }> = [
		{ value: 'month', label: 'Month', icon: Calendar },
		{ value: 'week', label: 'Week', icon: CalendarDays },
		{ value: 'day', label: 'Day', icon: CalendarClock }
	]

	return (
		<div className="inline-flex rounded-lg border border-(--color-border) bg-(--color-muted) p-1">
			{views.map(({ value, label, icon: Icon }) => (
				<Button
					key={value}
					variant={currentView === value ? "default" : "ghost"}
					size="sm"
					onClick={() => onViewChange(value)}
					className={`flex items-center gap-2 ${
						currentView === value
							? "bg-(--color-primary) text-white hover:bg-(--color-primary)/90"
							: "hover:bg-(--color-muted-foreground)/10"
					}`}
				>
					<Icon className="w-4 h-4" />
					{label}
				</Button>
			))}
		</div>
	)
}

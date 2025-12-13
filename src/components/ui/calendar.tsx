"use client"

import * as React from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

export interface CalendarProps {
	selected?: Date
	onSelect?: (date: Date | undefined) => void
	className?: string
	mode?: "single"
	initialFocus?: boolean
}

function Calendar({
	selected,
	onSelect,
	className = "",
	mode = "single",
	initialFocus = false,
}: CalendarProps) {
	return (
		<div className={className}>
			<DatePicker
				selected={selected}
				onChange={(date) => onSelect?.(date || undefined)}
				inline
				showMonthDropdown
				showYearDropdown
				dropdownMode="select"
				yearDropdownItemNumber={20}
				className="w-full"
			/>
		</div>
	)
}
Calendar.displayName = "Calendar"

export { Calendar }

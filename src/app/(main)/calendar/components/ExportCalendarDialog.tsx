'use client'

import { useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { CalendarBooking } from '../actions'
import { exportCalendarToExcel } from '../utils/export-calendar'
import { Download } from 'lucide-react'

interface ExportCalendarDialogProps {
	isOpen: boolean
	onClose: () => void
	bookings: CalendarBooking[]
}

export function ExportCalendarDialog({
	isOpen,
	onClose,
	bookings,
}: ExportCalendarDialogProps) {
	const [exportType, setExportType] = useState<'month' | 'year'>('month')
	const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
	const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())

	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	]

	// Generate year options (current year and 5 years back)
	const currentYear = new Date().getFullYear()
	const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

	const handleExport = () => {
		let startDate: Date
		let endDate: Date

		if (exportType === 'year') {
			startDate = new Date(selectedYear, 0, 1)
			endDate = new Date(selectedYear, 11, 31, 23, 59, 59)
		} else {
			startDate = new Date(selectedYear, selectedMonth, 1)
			endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59)
		}

		exportCalendarToExcel({
			bookings,
			startDate,
			endDate,
			exportType,
		})

		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Export Calendar to Excel</DialogTitle>
					<DialogDescription>
						Select the time period you want to export. The exported file will
						include all bookings within the selected period.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Export Type</label>
						<Select value={exportType} onValueChange={(value: 'month' | 'year') => setExportType(value)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="month">Month</SelectItem>
								<SelectItem value="year">Year</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">Year</label>
						<Select
							value={String(selectedYear)}
							onValueChange={(value) => setSelectedYear(parseInt(value))}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{yearOptions.map((year) => (
									<SelectItem key={year} value={String(year)}>
										{year}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{exportType === 'month' && (
						<div className="space-y-2">
							<label className="text-sm font-medium">Month</label>
							<Select
								value={String(selectedMonth)}
								onValueChange={(value) => setSelectedMonth(parseInt(value))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{monthNames.map((month, index) => (
										<SelectItem key={index} value={String(index)}>
											{month}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleExport}>
						<Download className="w-4 h-4 mr-2" />
						Export
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}


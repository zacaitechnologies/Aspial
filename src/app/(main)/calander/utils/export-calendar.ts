import * as XLSX from '@e965/xlsx'
import { parseLocalDateString, formatDateStringDirect } from '@/lib/date-utils'
import { CalendarBooking } from '../actions'
import { APPOINTMENT_TYPES } from '../constants'

interface ExportOptions {
	bookings: CalendarBooking[]
	startDate: Date
	endDate: Date
	exportType: 'month' | 'year'
}

export function exportCalendarToExcel(options: ExportOptions): void {
	const { bookings, startDate, endDate, exportType } = options

	// Filter bookings within the date range (parse YYYY-MM-DD as local)
	const filteredBookings = bookings.filter((booking) => {
		const bookingDate = parseLocalDateString(booking.date)
		bookingDate.setHours(0, 0, 0, 0)
		const start = new Date(startDate)
		start.setHours(0, 0, 0, 0)
		const end = new Date(endDate)
		end.setHours(23, 59, 59, 999)
		return bookingDate >= start && bookingDate <= end
	})

	// Create workbook
	const workbook = XLSX.utils.book_new()

	// Group bookings by month
	const bookingsByMonth = new Map<string, CalendarBooking[]>()
	
	filteredBookings.forEach((booking) => {
		const bookingDate = parseLocalDateString(booking.date)
		const monthKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`
		
		if (!bookingsByMonth.has(monthKey)) {
			bookingsByMonth.set(monthKey, [])
		}
		bookingsByMonth.get(monthKey)!.push(booking)
	})

	// Sort months
	const sortedMonths = Array.from(bookingsByMonth.keys()).sort()

	// Create a sheet for each month
	sortedMonths.forEach((monthKey) => {
		const monthBookings = bookingsByMonth.get(monthKey)!
		
		// Sort by date and time
		const sortedBookings = monthBookings.sort((a, b) => {
			const dateCompare = a.date.localeCompare(b.date)
			if (dateCompare !== 0) return dateCompare
			return a.startTime.localeCompare(b.startTime)
		})

		// Prepare data for Excel
		const excelData = sortedBookings.map((booking) => {
			const bookingDate = parseLocalDateString(booking.date)
			const appointmentTypeLabel = APPOINTMENT_TYPES[booking.appointmentType]?.label || 'Others'
			
			return {
				'Date': formatDateStringDirect(booking.date),
				'Day': formatDateStringDirect(booking.date, { includeWeekday: true }).split(",")[0],
				'Appointment Type': appointmentTypeLabel,
				'Title': booking.title,
				'Description': booking.description || '',
				'Start Time': booking.startTime,
				'End Time': booking.endTime,
				'Location': booking.location,
				'Attendees': booking.attendees,
				'Project Name': booking.projectName || '',
				'Client Name': booking.clientName || '',
				'Created By': booking.creatorName || '',
				'Assigned To': booking.assigneeName || '',
				'Task Start Date': booking.taskStartDate 
					? formatDateStringDirect(booking.taskStartDate)
					: '',
				'Task Due Date': booking.taskDueDate
					? formatDateStringDirect(booking.taskDueDate)
					: '',
			}
		})

		// Convert data to worksheet
		const worksheet = XLSX.utils.json_to_sheet(excelData)

		// Set column widths
		worksheet['!cols'] = [
			{ wch: 12 }, // Date
			{ wch: 8 },  // Day
			{ wch: 18 }, // Appointment Type
			{ wch: 30 }, // Title
			{ wch: 40 }, // Description
			{ wch: 12 }, // Start Time
			{ wch: 12 }, // End Time
			{ wch: 20 }, // Location
			{ wch: 10 }, // Attendees
			{ wch: 25 }, // Project Name
			{ wch: 25 }, // Client Name
			{ wch: 20 }, // Created By
			{ wch: 20 }, // Assigned To
			{ wch: 15 }, // Task Start Date
			{ wch: 15 }, // Task Due Date
		]

		// Generate sheet name (e.g., "January 2025")
		const [year, month] = monthKey.split('-')
		const monthIndex = parseInt(month) - 1
		const monthNames = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		]
		const sheetName = `${monthNames[monthIndex]} ${year}`

		// Append worksheet to workbook
		XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
	})

	// Generate filename
	let filename: string
	if (exportType === 'year') {
		filename = `Calendar_Export_${startDate.getFullYear()}.xlsx`
	} else {
		const monthName = startDate.toLocaleDateString('en-US', { month: 'long' })
		filename = `Calendar_Export_${monthName}_${startDate.getFullYear()}.xlsx`
	}

	// Write file
	XLSX.writeFile(workbook, filename)
}


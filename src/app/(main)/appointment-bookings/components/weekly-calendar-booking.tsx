"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { format, addDays, startOfWeek, addHours, startOfDay, isBefore, isSameDay, endOfWeek } from "date-fns"
import { cn } from "@/lib/utils"
import { useSession } from "@/app/(main)/contexts/SessionProvider"
import { createAppointmentBooking, getUserProjects, getAppointmentBookings } from "@/app/(main)/appointment-bookings/actions"

interface Appointment {
	id: number
	name: string
	location: string | null
	brand: string | null
	description: string | null
	appointmentType: string
	isAvailable: boolean
}

interface WeeklyCalendarBookingProps {
	appointment: Appointment
	initialDate: Date
	onClose: () => void
	onSuccess: () => void
}

interface BookingSlot {
	id: number
	startDate: Date
	endDate: Date
	bookedBy: string
}

export function WeeklyCalendarBooking({ appointment, initialDate, onClose, onSuccess }: WeeklyCalendarBookingProps) {
	const { enhancedUser } = useSession()
	const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(initialDate, { weekStartsOn: 1 }))
	const [selectedSlots, setSelectedSlots] = useState<{ start: Date; end: Date }[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [purpose, setPurpose] = useState("")
	const [attendees, setAttendees] = useState("")
	const [projects, setProjects] = useState<any[]>([])
	const [selectedProject, setSelectedProject] = useState<string>("none")
	const [isLoadingProjects, setIsLoadingProjects] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [existingBookings, setExistingBookings] = useState<BookingSlot[]>([])
	const [isLoadingBookings, setIsLoadingBookings] = useState(false)
	const [calendarOpen, setCalendarOpen] = useState(false)

	useEffect(() => {
		const fetchProjects = async () => {
			if (enhancedUser?.id) {
				setIsLoadingProjects(true)
				const userProjects = await getUserProjects(enhancedUser.id)
				setProjects(userProjects as any[])
				setIsLoadingProjects(false)
			} else {
				setIsLoadingProjects(false)
			}
		}
		fetchProjects()
	}, [enhancedUser?.id])

	// Fetch bookings when week changes
	useEffect(() => {
		const fetchBookings = async () => {
			if (appointment.id) {
				setIsLoadingBookings(true)
				const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
				const bookings = await getAppointmentBookings(
					appointment.id,
					currentWeekStart,
					weekEnd
				)
				setExistingBookings(bookings.map(b => ({
					...b,
					startDate: new Date(b.startDate),
					endDate: new Date(b.endDate),
				})))
				setIsLoadingBookings(false)
			}
		}
		fetchBookings()
	}, [appointment.id, currentWeekStart])

	const userName = enhancedUser.profile 
		? `${enhancedUser.profile.firstName || ''} ${enhancedUser.profile.lastName || ''}`.trim() 
		: enhancedUser.email || 'Unknown User'

	const generateWeekDays = () => {
		const days = []
		for (let i = 0; i < 7; i++) {
			days.push(addDays(currentWeekStart, i))
		}
		return days
	}

	const generateTimeSlots = () => {
		const slots = []
		// Generate slots from 8 AM to 10 PM (14 hours)
		for (let i = 0; i < 14; i++) {
			slots.push(8 + i)
		}
		return slots
	}

	const weekDays = generateWeekDays()
	const timeSlots = generateTimeSlots()

	const isSlotSelected = (day: Date, hour: number) => {
		const slotStart = addHours(startOfDay(day), hour)
		return selectedSlots.some(slot => slot.start.getTime() === slotStart.getTime())
	}

	const isSlotPast = (day: Date, hour: number) => {
		const slotStart = addHours(startOfDay(day), hour)
		return isBefore(slotStart, new Date())
	}

	const isSlotBooked = (day: Date, hour: number) => {
		const slotStart = addHours(startOfDay(day), hour)
		const slotEnd = addHours(slotStart, 1)
		
		return existingBookings.some(booking => {
			const bookingStart = new Date(booking.startDate)
			const bookingEnd = new Date(booking.endDate)
			// Check if slot overlaps with booking
			return slotStart < bookingEnd && slotEnd > bookingStart
		})
	}

	const getSlotBookingOwner = (day: Date, hour: number): string | null => {
		const slotStart = addHours(startOfDay(day), hour)
		const slotEnd = addHours(slotStart, 1)
		
		const booking = existingBookings.find(booking => {
			const bookingStart = new Date(booking.startDate)
			const bookingEnd = new Date(booking.endDate)
			// Check if slot overlaps with booking
			return slotStart < bookingEnd && slotEnd > bookingStart
		})
		
		return booking ? booking.bookedBy : null
	}

	const isSlotBookedByUser = (day: Date, hour: number) => {
		const owner = getSlotBookingOwner(day, hour)
		return owner === userName
	}

	const toggleSlot = (day: Date, hour: number) => {
		const slotStart = addHours(startOfDay(day), hour)
		const slotEnd = addHours(slotStart, 1)

		if (isSlotPast(day, hour) || isSlotBooked(day, hour)) return

		setSelectedSlots(prev => {
			const exists = prev.some(slot => slot.start.getTime() === slotStart.getTime())
			if (exists) {
				return prev.filter(slot => slot.start.getTime() !== slotStart.getTime())
			} else {
				return [...prev, { start: slotStart, end: slotEnd }]
			}
		})
	}

	const groupConsecutiveSlots = (slots: { start: Date; end: Date }[]) => {
		if (slots.length === 0) return []
		
		const sortedSlots = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime())
		const groups: { start: Date; end: Date }[][] = []
		let currentGroup: { start: Date; end: Date }[] = [sortedSlots[0]]
		
		for (let i = 1; i < sortedSlots.length; i++) {
			const currentSlot = sortedSlots[i]
			const lastSlotInGroup = currentGroup[currentGroup.length - 1]
			
			if (currentSlot.start.getTime() === lastSlotInGroup.end.getTime()) {
				currentGroup.push(currentSlot)
			} else {
				groups.push([...currentGroup])
				currentGroup = [currentSlot]
			}
		}
		
		groups.push(currentGroup)
		return groups
	}

	const handleSubmit = async () => {
		if (selectedSlots.length === 0) return

		setIsSubmitting(true)
		setError(null)

		try {
			const slotGroups = groupConsecutiveSlots(selectedSlots)

			for (const group of slotGroups) {
				const formData = new FormData()

				formData.append("bookedBy", userName)
				formData.append("startDate", group[0].start.toISOString())
				formData.append("endDate", group[group.length - 1].end.toISOString())
				formData.append("purpose", purpose)
				formData.append("appointmentType", appointment.appointmentType)
				formData.append("appointmentId", appointment.id.toString())

				if (selectedProject && selectedProject !== "none") {
					formData.append("projectId", selectedProject)
				}
				if (attendees) {
					formData.append("attendees", attendees)
				}

				const result = await createAppointmentBooking(formData)

				if (!result.success) {
					setError(result.error || "Failed to create appointment")
					setIsSubmitting(false)
					return
				}
			}

			onSuccess()
		} catch (error) {
			console.error("Failed to create appointments:", error)
			setError("An unexpected error occurred. Please try again.")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="space-y-4">
			{error && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-md">
					<p className="text-sm text-red-800">{error}</p>
				</div>
			)}

			{/* Week Navigation */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
				>
					<ChevronLeft className="w-4 h-4" />
					Previous Week
				</Button>
				
				<div className="flex items-center gap-2">
					<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className="justify-start text-left font-normal min-w-[240px]"
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								{format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={currentWeekStart}
								onSelect={(date) => {
									if (date) {
										setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }))
										setCalendarOpen(false)
									}
								}}
								initialFocus
							/>
						</PopoverContent>
					</Popover>
					
					<Button
						variant="outline"
						size="sm"
						onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
					>
						Today
					</Button>
				</div>
				
				<Button
					variant="outline"
					size="sm"
					onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
				>
					Next Week
					<ChevronRight className="w-4 h-4" />
				</Button>
			</div>

			{/* Legend */}
			<div className="flex items-center gap-4 text-xs bg-gray-50 p-3 rounded-md border flex-wrap">
				{isLoadingBookings && (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="w-3 h-3 animate-spin" />
						<span>Loading bookings...</span>
					</div>
				)}
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-primary rounded"></div>
					<span>Selected</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-green-500 rounded"></div>
					<span>Your Booking</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-red-500 rounded"></div>
					<span>Booked by Others</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded opacity-60"></div>
					<span>Past</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-white border-2 border-gray-400 rounded"></div>
					<span>Available</span>
				</div>
			</div>

			{/* Weekly Calendar Grid */}
			<div className="border rounded-lg overflow-x-auto">
				<div className="min-w-full">
					{/* Header - Days of Week */}
					<div className="grid grid-cols-8 border-b">
						<div className="p-3 text-sm font-medium text-center border-r">Time</div>
						{weekDays.map((day, idx) => (
							<div
								key={idx}
								className={cn(
									"p-3 text-sm font-medium text-center border-r last:border-r-0",
									isSameDay(day, new Date()) && "bg-primary/10"
								)}
							>
								<div>{format(day, "EEE")}</div>
								<div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
							</div>
						))}
					</div>

					{/* Time Slots */}
					{timeSlots.map((hour) => (
						<div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
							<div className="p-3 text-xs text-center border-r font-medium bg-gray-50">
								{`${hour}:00`}
							</div>
							{weekDays.map((day, idx) => {
								const isSelected = isSlotSelected(day, hour)
								const isPast = isSlotPast(day, hour)
								const isBooked = isSlotBooked(day, hour)
								const isBookedByUser = isSlotBookedByUser(day, hour)

								return (
									<button
										key={idx}
										type="button"
										disabled={isPast || (isBooked && !isBookedByUser)}
										onClick={() => toggleSlot(day, hour)}
										className={cn(
											"p-3 text-xs border-r last:border-r-0 transition-colors min-h-[40px]",
											isSelected && "bg-primary text-white hover:bg-primary/90",
											!isSelected && !isPast && !isBooked && "hover:bg-muted bg-white border-2 border-gray-200",
											isPast && "opacity-60 cursor-not-allowed bg-gray-300 border border-gray-400",
											isBookedByUser && "bg-green-500 text-white cursor-not-allowed",
											isBooked && !isBookedByUser && "bg-red-500 cursor-not-allowed opacity-80"
										)}
										title={
											isBookedByUser 
												? `Booked by you (${getSlotBookingOwner(day, hour)})`
												: isBooked 
													? `Booked by ${getSlotBookingOwner(day, hour)}`
													: isPast
														? "Past time slot"
														: "Available"
										}
									>
										{isSelected && "✓"}
									</button>
								)
							})}
						</div>
					))}
				</div>
			</div>

			{/* Booking Details Form */}
			{selectedSlots.length > 0 && (
				<div className="space-y-4 border-t pt-4">
					<div className="text-sm font-medium">
						{selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} selected
					</div>

					<div className="space-y-2">
						<Label htmlFor="project">Project (Optional)</Label>
						{isLoadingProjects ? (
							<div className="text-sm text-muted-foreground">Loading projects...</div>
						) : projects.length > 0 ? (
							<Select value={selectedProject} onValueChange={setSelectedProject}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a project (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									{projects.map((project: any) => (
										<SelectItem key={project.id} value={project.id.toString()}>
											{project.name}{project.clientName ? ` (${project.clientName})` : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<div className="text-sm text-muted-foreground">No projects available</div>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="attendees">Number of Attendees (Optional)</Label>
						<Input
							id="attendees"
							type="number"
							value={attendees}
							onChange={(e) => setAttendees(e.target.value)}
							min="1"
							placeholder="Number of attendees"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="purpose">Purpose</Label>
						<Textarea
							id="purpose"
							value={purpose}
							onChange={(e) => setPurpose(e.target.value)}
							placeholder="What is this appointment for?"
							rows={3}
						/>
					</div>

					<div className="flex gap-2">
						<Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Creating...
								</>
							) : (
								`Book Appointment`
							)}
						</Button>
						<Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
							Cancel
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}

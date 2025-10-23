"use server"

import { prisma } from "@/lib/prisma"
import { getAllUserTasks } from "../projects/task-actions"

interface EquipmentBooking {
	id: number
	equipmentId: number
	equipment: {
		name: string
		type: string
	}
	bookedBy: string
	startDate: Date
	endDate: Date
	purpose: string | null
	status: string
}

interface StudioBooking {
	id: number
	studioId: number
	studio: {
		name: string
		location: string
	}
	bookedBy: string
	startDate: Date
	endDate: Date
	purpose: string | null
	attendees: number
	status: string
}

export interface CalendarBooking {
	id: string
	title: string
	description: string
	date: string
	startTime: string
	endTime: string
	type: "equipment" | "studio" | "task"
	location: string
	attendees: number
	color: string
	originalData: any
}

const bookingTypes = {
	equipment: { color: "bg-[var(--color-primary)]", label: "Equipment" },
	studio: { color: "bg-[var(--color-accent)]", label: "Studio" },
	task: { color: "bg-yellow-500", label: "Task" },
}

// Check if user is admin
async function checkIsAdmin(userId: string): Promise<boolean> {
	try {
		const userWithRoles = await prisma.user.findUnique({
			where: { supabase_id: userId },
			include: {
				userRoles: {
					include: {
						role: true
					}
				}
			}
		})

		if (!userWithRoles) {
			return false
		}

		return userWithRoles.userRoles.some(
			(userRole) => userRole.role.slug === 'admin'
		)
	} catch (error) {
		console.error('Error checking admin status:', error)
		return false
	}
}

// Fetch all bookings with permission filtering
export async function fetchAllBookings(
	userId: string,
	userName: string
): Promise<CalendarBooking[]> {
	try {
		if (!userId || !userName) {
			console.error('User ID and name are required')
			return []
		}

		// Check if user is admin
		const isAdmin = await checkIsAdmin(userId)
		console.log('User is admin:', isAdmin)

		// Fetch equipment bookings
		const equipmentBookings = await prisma.booking.findMany({
			where: {
				status: 'active'
			},
			include: {
				equipment: {
					select: {
						name: true,
						type: true
					}
				}
			}
		}) as unknown as EquipmentBooking[]

		// Fetch studio bookings
		const studioBookings = await prisma.studioBooking.findMany({
			where: {
				status: 'active'
			},
			include: {
				studio: {
					select: {
						name: true,
						location: true
					}
				}
			}
		}) as unknown as StudioBooking[]

		const calendarBookings: CalendarBooking[] = []

		// Transform equipment bookings - Filter for staff users
		equipmentBookings.forEach((booking) => {
			// If user is staff (not admin), only show their own bookings
			if (!isAdmin && booking.bookedBy !== userName) {
				return
			}

			const startDate = new Date(booking.startDate)
			const endDate = new Date(booking.endDate)

			calendarBookings.push({
				id: `equipment-${booking.id}`,
				title: `${booking.equipment.name} - ${booking.bookedBy}`,
				description: booking.purpose || `Equipment booking by ${booking.bookedBy}`,
				date: startDate.toISOString().split('T')[0],
				startTime: startDate.toTimeString().slice(0, 5),
				endTime: endDate.toTimeString().slice(0, 5),
				type: "equipment",
				location: `${booking.equipment.type} Equipment`,
				attendees: 1,
				color: bookingTypes.equipment.color,
				originalData: {
					...booking,
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString()
				}
			})
		})

		// Transform studio bookings - Filter for staff users
		studioBookings.forEach((booking) => {
			// If user is staff (not admin), only show their own bookings
			if (!isAdmin && booking.bookedBy !== userName) {
				return
			}

			const startDate = new Date(booking.startDate)
			const endDate = new Date(booking.endDate)

			calendarBookings.push({
				id: `studio-${booking.id}`,
				title: `${booking.studio.name} - ${booking.bookedBy}`,
				description: booking.purpose || `Studio booking by ${booking.bookedBy}`,
				date: startDate.toISOString().split('T')[0],
				startTime: startDate.toTimeString().slice(0, 5),
				endTime: endDate.toTimeString().slice(0, 5),
				type: "studio",
				location: booking.studio.location,
				attendees: booking.attendees,
				color: bookingTypes.studio.color,
				originalData: {
					...booking,
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString()
				}
			})
		})

		// Fetch and transform tasks - already filtered by user permissions in getAllUserTasks
		try {
			console.log('Fetching tasks for user:', userId)
			const tasks = await getAllUserTasks(userId)
			console.log('Fetched tasks:', tasks.length)

			tasks.forEach((task) => {
				if (task.dueDate) {
					const dueDate = new Date(task.dueDate)
					const today = new Date()
					today.setHours(0, 0, 0, 0)
					const isOverdue = dueDate < today

					const taskTitle = isOverdue
						? `OVERDUE: ${task.title} - ${task.project?.name || 'Unknown Project'}`
						: `DUE: ${task.title} - ${task.project?.name || 'Unknown Project'}`

					calendarBookings.push({
						id: `task-${task.id}`,
						title: taskTitle,
						description: task.description || `Task due on ${dueDate.toLocaleDateString()}`,
						date: dueDate.toISOString().split('T')[0],
						startTime: "00:00",
						endTime: "23:59",
						type: "task",
						location: task.project?.name || 'Unknown Project',
						attendees: 1,
						color: isOverdue ? "bg-red-600" : bookingTypes.task.color,
						originalData: { ...task, isOverdue, dueDate: dueDate.toISOString() }
					})
				}
			})
			console.log('Total calendar bookings after tasks:', calendarBookings.length)
		} catch (error) {
			console.error('Error fetching tasks:', error)
		}

		return calendarBookings
	} catch (error) {
		console.error('Error fetching bookings:', error)
		return []
	}
}


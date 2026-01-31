"use server"

import { unstable_noStore } from "next/cache"
import { prisma } from "@/lib/prisma"
import { formatLocalDate, formatLocalDateTime } from "@/lib/date-utils"
import { getAllUserTasks } from "../projects/task-actions"
import { APPOINTMENT_TYPES, type AppointmentType } from "./constants"

interface AppointmentBooking {
	id: number
	appointmentId: number | null
	appointment: {
		name: string
		location: string | null
		brand: string | null
	} | null
	bookedBy: string
	startDate: Date
	endDate: Date
	purpose: string | null
	attendees: number | null
	status: string
	appointmentType: string
}

export interface CalendarBooking {
	id: string
	title: string
	description: string
	date: string
	startTime: string
	endTime: string
	type: "appointment" | "task"
	appointmentType: AppointmentType
	location: string
	attendees: number
	color: string
	originalData: any
	projectId?: number | null
	projectName?: string | null
	clientName?: string | null
	creatorName?: string | null
	assigneeName?: string | null
	taskStartDate?: string | null
	taskDueDate?: string | null
	isUserBooking?: boolean
	isTeamBooking?: boolean
	assigneeId?: string | null
	creatorId?: string
}

const bookingTypes = {
	appointment: { color: "bg-blue-500", label: "Appointment" },
	task: { color: "bg-yellow-500", label: "Task" },
}

// Check if user is admin
export async function checkIsAdmin(userId: string): Promise<boolean> {
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

// Get user's project IDs
async function getUserProjectIds(userId: string): Promise<number[]> {
	try {
		// Get projects where user is the creator
		const createdProjects = await prisma.project.findMany({
			where: {
				createdBy: userId,
			},
			select: {
				id: true,
			},
		})

		// Get projects where user has permissions
		const permittedProjects = await prisma.project.findMany({
			where: {
				permissions: {
					some: {
						userId: userId,
					},
				},
			},
			select: {
				id: true,
			},
		})

		// Combine and deduplicate
		const allProjects = [...createdProjects, ...permittedProjects]
		const uniqueProjectIds = Array.from(
			new Set(allProjects.map(p => p.id))
		)

		return uniqueProjectIds
	} catch (error) {
		console.error('Error fetching user project IDs:', error)
		return []
	}
}

// Get user's projects with details
export async function getUserProjects(userId: string): Promise<{ id: number; name: string }[]> {
	try {
		// Get projects where user is the creator
		const createdProjects = await prisma.project.findMany({
			where: {
				createdBy: userId,
			},
			select: {
				id: true,
				name: true,
			},
		})

		// Get projects where user has permissions
		const permittedProjects = await prisma.project.findMany({
			where: {
				permissions: {
					some: {
						userId: userId,
					},
				},
			},
			select: {
				id: true,
				name: true,
			},
		})

		// Combine and deduplicate by ID
		const projectMap = new Map<number, string>()
		createdProjects.forEach(p => projectMap.set(p.id, p.name))
		permittedProjects.forEach(p => projectMap.set(p.id, p.name))

		return Array.from(projectMap, ([id, name]) => ({ id, name }))
	} catch (error) {
		console.error('Error fetching user projects:', error)
		return []
	}
}

// Fetch all bookings with permission filtering
export async function fetchAllBookings(
	userId: string,
	userName: string
): Promise<CalendarBooking[]> {
	// Prevent caching to ensure real-time appointment booking data
	unstable_noStore()
	
	try {
		if (!userId || !userName) {
			console.error('User ID and name are required')
			return []
		}

		// Check if user is admin
		const isAdmin = await checkIsAdmin(userId)
		console.log('User is admin:', isAdmin)

		// Get user's project IDs
		const userProjectIds = await getUserProjectIds(userId)
		console.log('User project IDs:', userProjectIds)

		const calendarBookings: CalendarBooking[] = []

		// Fetch unified appointment bookings with project info
		const appointmentBookings = await prisma.appointmentBooking.findMany({
			where: {
				status: 'active'
			},
			include: {
				appointment: {
					select: {
						name: true,
						location: true,
						brand: true
					}
				},
				project: {
					select: {
						id: true,
						name: true,
						clientName: true
					}
				}
			}
		})

		// Transform unified appointment bookings - Filter for staff users
		appointmentBookings.forEach((booking) => {
			const bookingWithProject = booking as any
			// If user is staff (not admin), only show:
			// 1. Their own bookings, OR
			// 2. Bookings for projects they're part of
			if (!isAdmin) {
				const isUserBooking = booking.bookedBy === userName
				const isProjectBooking = bookingWithProject.project && 
					userProjectIds.includes(bookingWithProject.project.id)
				
				if (!isUserBooking && !isProjectBooking) {
					return
				}
			}

			const startDate = new Date(booking.startDate)
			const endDate = new Date(booking.endDate)
			const isUserBooking = booking.bookedBy === userName
			const isProjectBooking = bookingWithProject.project && 
				userProjectIds.includes(bookingWithProject.project.id)

			// Map appointmentType from database to our constant keys
			const appointmentType = (booking.appointmentType as AppointmentType) || 'OTHERS'
			const appointmentConfig = APPOINTMENT_TYPES[appointmentType] || APPOINTMENT_TYPES.OTHERS

			// Determine the title and location based on what's attached
			let title = `Appointment - ${booking.bookedBy}`
			let location = 'Unspecified'
			
			if (booking.appointment) {
				title = `${booking.appointment.name} - ${booking.bookedBy}`
				location = booking.appointment.location || booking.appointment.brand || 'Appointment'
			}

			// Format date preserving local timezone (avoid UTC conversion)
			const dateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`

			calendarBookings.push({
				id: `appointment-${booking.id}`,
				title: title,
				description: booking.purpose || `Appointment by ${booking.bookedBy}`,
				date: dateStr,
				startTime: startDate.toTimeString().slice(0, 5),
				endTime: endDate.toTimeString().slice(0, 5),
				type: "appointment",
				appointmentType: appointmentType,
				location: location,
				attendees: booking.attendees || 1,
				color: appointmentConfig.color,
				projectId: bookingWithProject.project?.id,
				projectName: bookingWithProject.project?.name || null,
				clientName: bookingWithProject.project?.clientName || null,
				creatorName: booking.bookedBy || null,
				assigneeName: null,
				taskStartDate: null,
				taskDueDate: null,
				isUserBooking: isUserBooking,
				isTeamBooking: isProjectBooking && !isUserBooking,
				originalData: {
					...booking,
					startDate: formatLocalDateTime(startDate),
					endDate: formatLocalDateTime(endDate)
				}
			})
		})

		// Fetch and transform tasks - already filtered by user permissions in getAllUserTasks
		try {
			console.log('Fetching tasks for user:', userId)
			const tasks = await getAllUserTasks(userId)
			console.log('Fetched tasks:', tasks.length)

			// Batch fetch client names for all projects
			const projectIds = Array.from(new Set(tasks.map(t => t.project?.id).filter((id): id is number => id !== undefined)))
			const projectsWithClients = await prisma.project.findMany({
				where: { id: { in: projectIds } },
				select: { id: true, clientName: true }
			})
			const clientNameMap = new Map(projectsWithClients.map(p => [p.id, p.clientName]))

			tasks.forEach((task) => {
				if (task.dueDate) {
					const dueDate = new Date(task.dueDate)
					dueDate.setHours(23, 59, 59, 999) // Set to end of day
					const startDate = task.startDate ? new Date(task.startDate) : new Date(task.dueDate)
					startDate.setHours(0, 0, 0, 0) // Set to start of day
					
					const today = new Date()
					today.setHours(0, 0, 0, 0)
					const isOverdue = dueDate < today

					// Determine if this is the user's task
					const isUserTask = task.assigneeId === userId
					const isCreatorTask = task.creatorId === userId
					
					// Get creator and assignee names
					const creatorName = task.creator
						? `${task.creator.firstName || ''} ${task.creator.lastName || ''}`.trim() || task.creator.email
						: null
					const assigneeName = task.assignee
						? `${task.assignee.firstName || ''} ${task.assignee.lastName || ''}`.trim() || task.assignee.email
						: null

					// Get client name from project
					const clientName = task.project?.id ? (clientNameMap.get(task.project.id) || null) : null
					
					// Format dates preserving local timezone (avoid UTC conversion)
					const startDateString = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
					const dueDateString = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`
					const taskStartDateFormatted = startDateString
					const taskDueDateFormatted = dueDateString
					
					// Create calendar booking for start date
					const startTaskTitle = isOverdue
						? `OVERDUE: ${task.title} - ${task.project?.name || 'Unknown Project'} (START)`
						: `START: ${task.title} - ${task.project?.name || 'Unknown Project'}`
					
					calendarBookings.push({
						id: `task-${task.id}-start`,
						title: startTaskTitle,
						description: task.description || `Task starts on ${startDate.toLocaleDateString()}`,
						date: startDateString,
						startTime: "00:00",
						endTime: "23:59",
						type: "task",
						appointmentType: 'OTHERS', // Tasks map to OTHERS appointment type
						location: task.project?.name || 'Unknown Project',
						attendees: 1,
						color: isOverdue ? "bg-destructive" : APPOINTMENT_TYPES.OTHERS.color,
						projectId: task.project?.id,
						projectName: task.project?.name || null,
						clientName: clientName,
						creatorName: creatorName,
						assigneeName: assigneeName,
						taskStartDate: taskStartDateFormatted,
						taskDueDate: taskDueDateFormatted,
						isUserBooking: isUserTask || isCreatorTask,
						isTeamBooking: !isUserTask && !isCreatorTask,
						assigneeId: task.assigneeId || null,
						creatorId: task.creatorId,
						originalData: { ...task, isOverdue, dueDate: formatLocalDate(dueDate) }
					})
					
					// Create calendar booking for due date (only if different from start date)
					if (dueDateString !== startDateString) {
						const dueTaskTitle = isOverdue
							? `OVERDUE: ${task.title} - ${task.project?.name || 'Unknown Project'} (DUE)`
							: `DUE: ${task.title} - ${task.project?.name || 'Unknown Project'}`
						
						calendarBookings.push({
							id: `task-${task.id}-due`,
							title: dueTaskTitle,
							description: task.description || `Task due on ${dueDate.toLocaleDateString()}`,
							date: dueDateString,
							startTime: "00:00",
							endTime: "23:59",
							type: "task",
							appointmentType: 'OTHERS', // Tasks map to OTHERS appointment type
							location: task.project?.name || 'Unknown Project',
							attendees: 1,
							color: isOverdue ? "bg-destructive" : APPOINTMENT_TYPES.OTHERS.color,
							projectId: task.project?.id,
							projectName: task.project?.name || null,
							clientName: clientName,
							creatorName: creatorName,
							assigneeName: assigneeName,
							taskStartDate: taskStartDateFormatted,
							taskDueDate: taskDueDateFormatted,
							isUserBooking: isUserTask || isCreatorTask,
							isTeamBooking: !isUserTask && !isCreatorTask,
							assigneeId: task.assigneeId || null,
							creatorId: task.creatorId,
							originalData: { ...task, isOverdue, dueDate: formatLocalDate(dueDate) }
						})
					}
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


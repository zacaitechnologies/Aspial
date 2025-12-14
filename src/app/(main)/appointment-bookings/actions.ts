"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

// Project Actions
export async function getUserProjects(userId: string) {
	try {
		// Get projects where user is the creator
		const createdProjects = await prisma.project.findMany({
			where: {
				createdBy: userId,
			},
			select: {
				id: true,
				name: true,
				clientName: true,
				status: true,
			},
			orderBy: {
				created_at: 'desc',
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
				clientName: true,
				status: true,
			},
			orderBy: {
				created_at: 'desc',
			},
		})

		// Combine and deduplicate
		const allProjects = [...createdProjects, ...permittedProjects]
		const uniqueProjects = Array.from(
			new Map(allProjects.map(p => [p.id, p])).values()
		)

		// Filter out cancelled projects
		return uniqueProjects.filter(p => p.status !== 'cancelled')
	} catch (error) {
		console.error('Error fetching user projects:', error)
		return []
	}
}
// Appointment Actions
export async function createAppointment(formData: FormData) {
  const name = formData.get("name") as string
  const location = formData.get("location") as string
  const brand = formData.get("brand") as string
  const description = formData.get("description") as string
  const appointmentType = (formData.get("appointmentType") as string) || 'OTHERS'

  try {
    await prisma.appointment.create({
      data: {
        name,
        location: location || null,
        brand: brand || null,
        description: description || null,
        appointmentType: appointmentType as any,
      },
    })
    revalidatePath("/appointment-bookings")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to create appointment" }
  }
}

export async function updateAppointment(id: number, formData: FormData) {
  const name = formData.get("name") as string
  const location = formData.get("location") as string
  const brand = formData.get("brand") as string
  const description = formData.get("description") as string
  const isAvailable = formData.get("isAvailable") === "on"
  const appointmentType = (formData.get("appointmentType") as string) || 'OTHERS'

  try {
    await prisma.appointment.update({
      where: { id },
      data: {
        name,
        location: location || null,
        brand: brand || null,
        description: description || null,
        isAvailable,
        appointmentType: appointmentType as any,
      },
    })
    revalidatePath("/appointment-bookings")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to update appointment" }
  }
}

export async function deleteAppointment(id: number) {
  try {
    await prisma.appointment.delete({
      where: { id },
    })
    revalidatePath("/appointment-bookings")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to delete appointment" }
  }
}

// Unified Appointment Booking Actions
export async function createAppointmentBooking(formData: FormData) {
	const bookedBy = formData.get("bookedBy") as string
	const startDate = new Date(formData.get("startDate") as string)
	const endDate = new Date(formData.get("endDate") as string)
	const purpose = formData.get("purpose") as string
	const appointmentType = (formData.get("appointmentType") as string) || 'OTHERS'
	const projectIdStr = formData.get("projectId") as string
	const projectId = projectIdStr && projectIdStr !== '' ? Number.parseInt(projectIdStr) : null
	const appointmentIdStr = formData.get("appointmentId") as string
	const appointmentId = appointmentIdStr && appointmentIdStr !== '' ? Number.parseInt(appointmentIdStr) : null
	const attendeesStr = formData.get("attendees") as string
	const attendees = attendeesStr && attendeesStr !== '' ? Number.parseInt(attendeesStr) : null

	try {
		// Check for overlapping bookings if appointment is specified
		if (appointmentId) {
			const overlappingBookings = await prisma.appointmentBooking.findMany({
			where: {
					appointmentId,
				status: 'active',
				AND: [
						{ startDate: { lt: endDate } },
						{ endDate: { gt: startDate } },
				],
			},
			include: {
					appointment: {
						select: { name: true },
				},
			},
		})

		if (overlappingBookings.length > 0) {
			const booking = overlappingBookings[0]
			const bookingStart = new Date(booking.startDate).toLocaleString()
			const bookingEnd = new Date(booking.endDate).toLocaleString()
			return {
				success: false,
					error: `This appointment is already booked from ${bookingStart} to ${bookingEnd} by ${booking.bookedBy}`,
				}
			}
		}

		await prisma.appointmentBooking.create({
			data: {
				bookedBy,
				startDate,
				endDate,
				purpose: purpose || null,
				appointmentType: appointmentType as any,
				projectId,
				appointmentId,
				attendees,
			},
		})

		revalidatePath("/appointment-bookings")
		return { success: true }
	} catch (error) {
		console.error(error)
		return { success: false, error: "Failed to create appointment booking" }
	}
}

export async function cancelAppointmentBooking(id: number) {
  try {
    await prisma.appointmentBooking.update({
      where: { id },
      data: { status: "cancelled" },
		})

    revalidatePath("/appointment-bookings")
		return { success: true }
	} catch (error) {
		console.error(error)
    return { success: false, error: "Failed to cancel appointment booking" }
	}
}
  
export async function getAllAppointments() {
  try {
		return await prisma.appointmentBooking.findMany({
			where: {
				status: 'active'
			},
			include: {
				appointment: {
					select: {
						id: true,
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
			},
			orderBy: {
				startDate: 'desc'
			}
		})
  } catch (error) {
		console.error('Error fetching appointments:', error)
		return []
  }
}

export async function getAppointmentBookings(appointmentId: number, startDate: Date, endDate: Date) {
	try {
		return await prisma.appointmentBooking.findMany({
			where: {
				appointmentId,
				status: 'active',
				AND: [
					{ startDate: { lte: endDate } },
					{ endDate: { gte: startDate } },
				],
			},
			select: {
				id: true,
				startDate: true,
				endDate: true,
				bookedBy: true,
			},
			orderBy: {
				startDate: 'asc',
			},
		})
	} catch (error) {
		console.error('Error fetching appointment bookings:', error)
		return []
	}
}
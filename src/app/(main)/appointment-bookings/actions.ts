"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"

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
				Client: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
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
				Client: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
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
		const notifyClient = formData.get("notifyClient") === "true"
		const clientEmail = formData.get("clientEmail") as string
		const reminderOffsetsStr = formData.get("reminderOffsets") as string | null
		const reminderOffsets = reminderOffsetsStr ? JSON.parse(reminderOffsetsStr) as number[] : []

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

		const booking = await prisma.appointmentBooking.create({
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
			include: {
				appointment: {
					select: {
						name: true,
						location: true,
					},
				},
				project: {
					select: {
						Client: {
							select: {
								name: true,
							},
						},
					},
				},
			},
		})

		// Send email if requested
		let emailSent = false
		let emailError: string | null = null
		
		if (notifyClient && clientEmail) {
			try {
				const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
				const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

				if (!supabaseUrl || !supabaseAnonKey) {
					emailError = "Email service configuration missing"
				} else {
					// Get client name from project or use a default
					const clientName = booking.project?.Client?.name || "Valued Client"

					const response = await fetch(`${supabaseUrl}/functions/v1/send-appointment-confirmation`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${supabaseAnonKey}`,
						},
						body: JSON.stringify({
							appointmentName: booking.appointment?.name || "Appointment",
							appointmentLocation: booking.appointment?.location || null,
							clientName,
							clientEmail,
							startDate: startDate.toISOString(),
							endDate: endDate.toISOString(),
							purpose: purpose || null,
							bookedBy,
						}),
					})

					if (!response.ok) {
						const errorData = await response.json()
						emailError = errorData.error || "Failed to send email"
						console.error("Failed to send appointment confirmation email:", errorData)
					} else {
						emailSent = true
						
						// Save email history
						try {
							const user = await getCachedUser()
							if (user) {
								await prisma.appointmentBookingEmail.create({
									data: {
										appointmentBookingId: booking.id,
										recipientEmail: clientEmail,
										sentById: user.id,
										isAutomated: false, // Manual confirmation email
									},
								})
							}
						} catch (historyError) {
							console.error("Error saving email history:", historyError)
							// Don't fail the booking if history save fails
						}
					}
				}
			} catch (error: any) {
				emailError = error.message || "Failed to send email"
				console.error("Error sending appointment confirmation email:", error)
			}
		}

		// Create reminders if provided and project exists
		if (reminderOffsets.length > 0 && projectId) {
			try {
				// Parse reminder data (can be array of numbers or array of objects with email)
				const reminderData = reminderOffsets.map((item: any) => {
					if (typeof item === 'number') {
						return { offsetMinutes: item, recipientEmail: clientEmail || "" }
					}
					return item // Already has offsetMinutes and recipientEmail
				})
				await createOrUpdateReminders(booking.id, startDate, reminderData)
			} catch (reminderError) {
				console.error("Error creating reminders:", reminderError)
				// Don't fail the booking if reminder creation fails
			}
		}

		revalidatePath("/appointment-bookings")
		return { 
			success: true,
			emailSent,
			emailError,
		}
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

/**
 * Validate reminder offsets (1-24 hours or 48 hours before start)
 */
function validateReminderOffsets(offsets: number[]): { valid: boolean; error?: string } {
	const allowedOffsets = new Set([
		...Array.from({ length: 24 }, (_, i) => (i + 1) * 60), // 1-24 hours in minutes
		2880, // 48 hours (2 days)
	])

	for (const offset of offsets) {
		if (!allowedOffsets.has(offset)) {
			return {
				valid: false,
				error: `Invalid reminder offset: ${offset} minutes. Allowed: 1-24 hours (60-1440 minutes) or 48 hours (2880 minutes)`,
			}
		}
	}

	return { valid: true }
}

/**
 * Create or update reminders for a booking
 */
async function createOrUpdateReminders(
	appointmentBookingId: number,
	startDate: Date,
	reminders: Array<{ offsetMinutes: number; recipientEmail: string }>
) {
	// Validate offsets
	const offsetMinutes = reminders.map(r => r.offsetMinutes)
	const validation = validateReminderOffsets(offsetMinutes)
	if (!validation.valid) {
		throw new Error(validation.error)
	}

	// Check for duplicates within the provided reminders
	const uniqueOffsets = new Set(offsetMinutes)
	if (uniqueOffsets.size !== offsetMinutes.length) {
		const duplicates = offsetMinutes.filter((offset, index) => offsetMinutes.indexOf(offset) !== index)
		const hours = duplicates[0] / 60
		const reminderText = hours === 48 ? "2 days" : hours === 1 ? "1 hour" : `${hours} hours`
		throw new Error(`Duplicate reminder times detected. You cannot add multiple reminders for ${reminderText} before.`)
	}

	// Get booking to get project client email if needed
	const booking = await prisma.appointmentBooking.findUnique({
		where: { id: appointmentBookingId },
		include: {
			project: {
				include: {
					Client: {
						select: {
							email: true,
						},
					},
				},
			},
		},
	})

	const defaultEmail = booking?.project?.Client?.email || ""

	// Calculate remindAt for each offset
	const remindersToCreate = reminders.map((reminder) => {
		const remindAt = new Date(startDate.getTime() - reminder.offsetMinutes * 60 * 1000)
		return {
			appointmentBookingId,
			offsetMinutes: reminder.offsetMinutes,
			recipientEmail: reminder.recipientEmail || defaultEmail,
			remindAt,
			status: "PENDING" as const,
		}
	})

	// Use upsert to handle existing reminders
	for (const reminder of remindersToCreate) {
		await prisma.appointmentBookingReminder.upsert({
			where: {
				appointmentBookingId_offsetMinutes: {
					appointmentBookingId: reminder.appointmentBookingId,
					offsetMinutes: reminder.offsetMinutes,
				},
			},
			update: {
				remindAt: reminder.remindAt,
				recipientEmail: reminder.recipientEmail,
				status: "PENDING", // Reset to pending if updating
			},
			create: reminder,
		})
	}

	// Delete reminders that are no longer in the list
	const existingReminders = await prisma.appointmentBookingReminder.findMany({
		where: { appointmentBookingId },
		select: { offsetMinutes: true },
	})

	const offsetsToKeep = new Set(offsetMinutes)
	const remindersToDelete = existingReminders
		.filter((r) => !offsetsToKeep.has(r.offsetMinutes))
		.map((r) => r.offsetMinutes)

	if (remindersToDelete.length > 0) {
		await prisma.appointmentBookingReminder.deleteMany({
			where: {
				appointmentBookingId,
				offsetMinutes: { in: remindersToDelete },
			},
		})
	}
}

/**
 * Get reminders for a booking
 */
export async function getRemindersForBooking(appointmentBookingId: number) {
	try {
		const reminders = await prisma.appointmentBookingReminder.findMany({
			where: { appointmentBookingId },
			orderBy: { offsetMinutes: "asc" },
		})

		return reminders.map((r) => ({
			id: r.id,
			offsetMinutes: r.offsetMinutes,
			recipientEmail: r.recipientEmail,
			remindAt: r.remindAt,
			status: r.status,
			sentAt: r.sentAt,
			attemptCount: r.attemptCount,
			lastError: r.lastError,
		}))
	} catch (error) {
		console.error("Error fetching reminders:", error)
		return []
	}
}

/**
 * Add new reminders for a booking (add-only, doesn't delete existing)
 */
export async function updateBookingReminders(
	appointmentBookingId: number,
	reminders: Array<{ offsetMinutes: number; recipientEmail: string }>
) {
	try {
		// Get booking to access startDate and project client email
		const booking = await prisma.appointmentBooking.findUnique({
			where: { id: appointmentBookingId },
			include: {
				project: {
					include: {
						Client: {
							select: {
								email: true,
							},
						},
					},
				},
			},
		})

		if (!booking) {
			return { success: false, error: "Appointment booking not found" }
		}

		// Check for duplicates with existing reminders
		const existingReminders = await prisma.appointmentBookingReminder.findMany({
			where: { appointmentBookingId },
			select: { offsetMinutes: true },
		})
		const existingOffsets = new Set(existingReminders.map(r => r.offsetMinutes))
		
		// Filter out reminders that already exist
		const newReminders = reminders.filter(r => !existingOffsets.has(r.offsetMinutes))
		
		if (newReminders.length === 0) {
			return { success: false, error: "All selected reminders already exist" }
		}

		// Validate offsets
		const offsetMinutes = newReminders.map(r => r.offsetMinutes)
		const validation = validateReminderOffsets(offsetMinutes)
		if (!validation.valid) {
			return { success: false, error: validation.error }
		}

		// Check for duplicates within new reminders
		const uniqueOffsets = new Set(offsetMinutes)
		if (uniqueOffsets.size !== offsetMinutes.length) {
			const duplicates = offsetMinutes.filter((offset, index) => offsetMinutes.indexOf(offset) !== index)
			const hours = duplicates[0] / 60
			const reminderText = hours === 48 ? "2 days" : hours === 1 ? "1 hour" : `${hours} hours`
			return { success: false, error: `Duplicate reminder times detected. You cannot add multiple reminders for ${reminderText} before.` }
		}

		const defaultEmail = booking.project?.Client?.email || ""
		const startDate = new Date(booking.startDate)

		// Create only the new reminders (don't delete existing ones)
		for (const reminder of newReminders) {
			const remindAt = new Date(startDate.getTime() - reminder.offsetMinutes * 60 * 1000)
			await prisma.appointmentBookingReminder.create({
				data: {
					appointmentBookingId,
					offsetMinutes: reminder.offsetMinutes,
					recipientEmail: reminder.recipientEmail || defaultEmail,
					remindAt,
					status: "PENDING",
				},
			})
		}

		revalidatePath("/appointment-bookings")
		return { success: true }
	} catch (error: any) {
		console.error("Error updating reminders:", error)
		return { success: false, error: error.message || "Failed to update reminders" }
	}
}

/**
 * Delete a specific reminder
 */
export async function deleteReminder(reminderId: number) {
	try {
		await prisma.appointmentBookingReminder.delete({
			where: { id: reminderId },
		})
		revalidatePath("/appointment-bookings")
		return { success: true }
	} catch (error: any) {
		console.error("Error deleting reminder:", error)
		return { success: false, error: error.message || "Failed to delete reminder" }
	}
}

/**
 * Update a specific reminder's email
 */
export async function updateReminderEmail(
	reminderId: number,
	recipientEmail: string
) {
	try {
		// Validate email
		if (!recipientEmail || !/\S+@\S+\.\S+/.test(recipientEmail)) {
			return { success: false, error: "Invalid email address" }
		}

		await prisma.appointmentBookingReminder.update({
			where: { id: reminderId },
			data: { recipientEmail },
		})
		revalidatePath("/appointment-bookings")
		return { success: true }
	} catch (error: any) {
		console.error("Error updating reminder email:", error)
		return { success: false, error: error.message || "Failed to update reminder email" }
	}
}

/**
 * Get email history for an appointment booking
 */
export async function getAppointmentBookingEmailHistory(
	appointmentBookingId: number
): Promise<
	Array<{
		id: number
		recipientEmail: string
		sentAt: Date
		sentBy: {
			firstName: string
			lastName: string
			email: string
		} | null
		isAutomated: boolean
	}>
> {
	try {
		const emails = await prisma.appointmentBookingEmail.findMany({
			where: {
				appointmentBookingId,
			},
			select: {
				id: true,
				recipientEmail: true,
				sentAt: true,
				isAutomated: true,
				sentBy: {
					select: {
						firstName: true,
						lastName: true,
						email: true,
					},
				},
			},
			orderBy: {
				sentAt: "desc",
			},
		})

		return emails.map((email) => ({
			id: email.id,
			recipientEmail: email.recipientEmail,
			sentAt: email.sentAt,
			sentBy: email.sentBy,
			isAutomated: email.isAutomated,
		}))
	} catch (error) {
		console.error("Error fetching appointment booking email history:", error)
		return []
	}
}

/**
 * Get appointment booking with full details including client information
 */
export async function getAppointmentBookingWithDetails(
	appointmentBookingId: number
) {
	try {
		const booking = await prisma.appointmentBooking.findUnique({
			where: { id: appointmentBookingId },
			include: {
				appointment: {
					select: {
						id: true,
						name: true,
						location: true,
					},
				},
				project: {
					select: {
						id: true,
						name: true,
						clientName: true,
						Client: {
							select: {
								id: true,
								name: true,
								email: true,
								company: true,
							},
						},
					},
				},
			},
		})

		return booking
	} catch (error) {
		console.error("Error fetching appointment booking details:", error)
		return null
	}
}

/**
 * Send appointment reminder email manually
 */
export async function sendAppointmentReminder(
	appointmentBookingId: number,
	clientEmail: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const user = await getCachedUser()
		if (!user) {
			return { success: false, error: "User must be authenticated to send reminder" }
		}

		// Get booking with full details
		const booking = await getAppointmentBookingWithDetails(appointmentBookingId)

		if (!booking) {
			return { success: false, error: "Appointment booking not found" }
		}

		if (!booking.project) {
			return { success: false, error: "No project associated with this appointment" }
		}

		if (!booking.project.Client) {
			return { success: false, error: "No client associated with this project" }
		}

		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

		if (!supabaseUrl || !supabaseAnonKey) {
			return { success: false, error: "Email service configuration missing" }
		}

		const clientName = booking.project.Client.name || booking.project.clientName || "Valued Client"

		// Send email via Supabase Edge Function
		const response = await fetch(`${supabaseUrl}/functions/v1/send-appointment-confirmation`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${supabaseAnonKey}`,
			},
			body: JSON.stringify({
				appointmentName: booking.appointment?.name || "Appointment",
				appointmentLocation: booking.appointment?.location || null,
				clientName,
				clientEmail,
				startDate: booking.startDate.toISOString(),
				endDate: booking.endDate.toISOString(),
				purpose: booking.purpose || null,
				bookedBy: booking.bookedBy,
			}),
		})

		if (!response.ok) {
			const errorData = await response.json()
			return { success: false, error: errorData.error || "Failed to send email" }
		}

		// Save email history
		await prisma.appointmentBookingEmail.create({
			data: {
				appointmentBookingId: booking.id,
				recipientEmail: clientEmail,
				sentById: user.id,
				isAutomated: false, // Manual reminder
			},
		})

		return { success: true }
	} catch (error: any) {
		console.error("Error sending appointment reminder:", error)
		return { success: false, error: error.message || "Failed to send reminder email" }
	}
}
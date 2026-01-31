"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import type { AppointmentType } from "@/app/(main)/calander/constants"
import { formatLocalDateTime, formatLocalDateTimeDisplay } from "@/lib/date-utils"

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
						phone: true,
						company: true,
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
						phone: true,
						company: true,
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

// Get all user emails for a project (creator + users with permissions)
export async function getProjectUsersEmails(projectId: number): Promise<string[]> {
	try {
		// Get project with creator
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			select: {
				createdBy: true,
				createdByUser: {
					select: {
						email: true,
					},
				},
			},
		})

		if (!project) {
			return []
		}

		// Get all users with permissions on this project
		const permissions = await prisma.projectPermission.findMany({
			where: { projectId },
			select: {
				userId: true,
				user: {
					select: {
						email: true,
					},
				},
			},
		})

		// Collect unique emails
		const emails = new Set<string>()

		// Add creator email
		if (project.createdByUser?.email) {
			emails.add(project.createdByUser.email)
		}

		// Add emails from users with permissions
		permissions.forEach((permission) => {
			if (permission.user?.email) {
				emails.add(permission.user.email)
			}
		})

		return Array.from(emails)
	} catch (error) {
		console.error('Error fetching project users emails:', error)
		return []
	}
}

// Appointment Actions
export async function createAppointment(formData: FormData) {
  const name = formData.get("name") as string
  const location = formData.get("location") as string
  const brand = formData.get("brand") as string
  const description = formData.get("description") as string
  const appointmentType = ((formData.get("appointmentType") as string) || 'OTHERS') as AppointmentType

  try {
    await prisma.appointment.create({
      data: {
        name,
        location: location || null,
        brand: brand || null,
        description: description || null,
        appointmentType: appointmentType,
      },
    })
    revalidatePath("/appointment-bookings")
    revalidateTag("appointment-bookings", { expire: 0 })
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
  const appointmentType = ((formData.get("appointmentType") as string) || 'OTHERS') as AppointmentType

  try {
    await prisma.appointment.update({
      where: { id },
      data: {
        name,
        location: location || null,
        brand: brand || null,
        description: description || null,
        isAvailable,
        appointmentType: appointmentType,
      },
    })
    revalidatePath("/appointment-bookings")
    revalidateTag("appointment-bookings", { expire: 0 })
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
    revalidateTag("appointment-bookings", { expire: 0 })
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to delete appointment" }
  }
}

// Unified Appointment Booking Actions
export async function createAppointmentBooking(formData: FormData) {
	const bookedBy = formData.get("bookedBy") as string
	// Parse dates as local time (no timezone conversion)
	// Input format: YYYY-MM-DDTHH:mm:ss (without Z, so interpreted as local)
	const startDateStr = formData.get("startDate") as string
	const endDateStr = formData.get("endDate") as string
	const startDate = new Date(startDateStr)
	const endDate = new Date(endDateStr)
	const purpose = formData.get("purpose") as string
	const appointmentType = ((formData.get("appointmentType") as string) || 'OTHERS') as AppointmentType
	const projectIdStr = formData.get("projectId") as string
	const projectId = projectIdStr && projectIdStr !== '' ? Number.parseInt(projectIdStr) : null
	const appointmentIdStr = formData.get("appointmentId") as string
	const appointmentId = appointmentIdStr && appointmentIdStr !== '' ? Number.parseInt(appointmentIdStr) : null
	const attendeesStr = formData.get("attendees") as string
	const attendees = attendeesStr && attendeesStr !== '' ? Number.parseInt(attendeesStr) : null
	
	// New fields
	const bookingName = formData.get("bookingName") as string | null
	const companyName = formData.get("companyName") as string | null
	const contactNumber = formData.get("contactNumber") as string | null
	const remarks = formData.get("remarks") as string | null
	
	// Multiple emails (always required now)
	const clientEmailsStr = formData.get("clientEmails") as string
	const clientEmails: string[] = clientEmailsStr ? JSON.parse(clientEmailsStr) as string[] : []
	
	const reminderOffsetsStr = formData.get("reminderOffsets") as string | null
	const reminderOffsets = reminderOffsetsStr ? JSON.parse(reminderOffsetsStr) as number[] : []

	try {
		// Validation: If no project, require bookingName, companyName, contactNumber
		if (!projectId) {
			if (!bookingName || !bookingName.trim()) {
				return { success: false, error: "Booking name is required when no project is selected" }
			}
			if (!companyName || !companyName.trim()) {
				return { success: false, error: "Company name is required when no project is selected" }
			}
			if (!contactNumber || !contactNumber.trim()) {
				return { success: false, error: "Contact number is required when no project is selected" }
			}
		}

		// Validation: Email is always required
		if (!clientEmails || clientEmails.length === 0 || !clientEmails.some(email => email.trim())) {
			return { success: false, error: "At least one email address is required" }
		}

		// Validate all emails are valid format and remove duplicates (case-insensitive)
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		const emailSet = new Set<string>()
		const validEmails = clientEmails.filter(email => {
			const trimmed = email.trim()
			if (!trimmed) return false
			if (!emailRegex.test(trimmed)) return false
			// Check for duplicates (case-insensitive)
			const normalized = trimmed.toLowerCase()
			if (emailSet.has(normalized)) return false
			emailSet.add(normalized)
			return true
		})
		if (validEmails.length === 0) {
			return { success: false, error: "At least one valid email address is required" }
		}

		// Fetch project with Client if project is selected
		let projectClient: { name: string; email: string; company: string | null; phone: string | null } | null = null
		if (projectId) {
			const project = await prisma.project.findUnique({
				where: { id: projectId },
				select: {
					Client: {
						select: {
							name: true,
							email: true,
							company: true,
							phone: true,
						},
					},
				},
			})

			if (project?.Client) {
				projectClient = {
					name: project.Client.name,
					email: project.Client.email,
					company: project.Client.company,
					phone: project.Client.phone,
				}

				// Overwrite fields with project client info if project is selected
				// (This happens even if fields were already filled - per user requirement)
			}
		}

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
			const bookingStartStr = formatLocalDateTimeDisplay(new Date(booking.startDate))
			const bookingEndStr = formatLocalDateTimeDisplay(new Date(booking.endDate))
			return {
				success: false,
					error: `This appointment is already booked from ${bookingStartStr} to ${bookingEndStr} by ${booking.bookedBy}`,
				}
			}
		}

		// Determine final field values: use project client info if project selected, otherwise use form values
		const finalBookingName = projectId && projectClient ? projectClient.name : (bookingName?.trim() || null)
		const finalCompanyName = projectId && projectClient ? (projectClient.company || projectClient.name) : (companyName?.trim() || null)
		const finalContactNumber = projectId && projectClient ? (projectClient.phone || null) : (contactNumber?.trim() || null)

		const booking = await prisma.appointmentBooking.create({
			data: {
				bookedBy,
				startDate,
				endDate,
				purpose: purpose || null,
				appointmentType: appointmentType,
				projectId,
				appointmentId,
				attendees,
				bookingName: finalBookingName,
				companyName: finalCompanyName,
				contactNumber: finalContactNumber,
				remarks: remarks?.trim() || null,
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
								email: true,
							},
						},
					},
				},
			},
		})

		// Use the emails from the form directly (they already include project users)
		// The form adds project users when a project is selected, so we don't need to add them again
		const allEmails: string[] = [...validEmails]

		// Send emails to all recipients (separate email to each)
		let emailSentCount = 0
		let emailFailedCount = 0
		let emailError: string | null = null
		
		if (allEmails.length > 0) {
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
			const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

			if (!supabaseUrl || !supabaseAnonKey) {
				emailError = "Email service configuration missing"
			} else {
				// Get client name from project or booking name
				const clientName = booking.project?.Client?.name || finalBookingName || "Valued Client"

				// Send separate email to each recipient
				for (const recipientEmail of allEmails) {
					try {
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
								clientEmail: recipientEmail,
								startDate: formatLocalDateTime(startDate),
								endDate: formatLocalDateTime(endDate),
								purpose: purpose || null,
								bookedBy,
							}),
						})

						if (!response.ok) {
							const errorData = await response.json()
							emailError = errorData.error || "Failed to send email"
							console.error(`Failed to send appointment confirmation email to ${recipientEmail}:`, errorData)
							emailFailedCount++
						} else {
							emailSentCount++
							
							// Save email history for each recipient
							try {
								const user = await getCachedUser()
								if (user) {
									await prisma.appointmentBookingEmail.create({
										data: {
											appointmentBookingId: booking.id,
											recipientEmail: recipientEmail,
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
					} catch (error: unknown) {
						emailError = error instanceof Error ? error.message : "Failed to send email"
						console.error(`Error sending appointment confirmation email to ${recipientEmail}:`, error)
						emailFailedCount++
					}
				}
			}
		}

		// Create reminders if provided and project exists
		if (reminderOffsets.length > 0 && projectId) {
			try {
				// Parse reminder data (can be array of numbers or array of objects with emails)
				const reminderData = reminderOffsets.map((item: number | { offsetMinutes: number; recipientEmails: string[] }) => {
					if (typeof item === 'number') {
						// Use all emails as default if no emails specified
						return { offsetMinutes: item, recipientEmails: allEmails.length > 0 ? allEmails : [] }
					}
					return item // Already has offsetMinutes and recipientEmails
				})
				await createOrUpdateReminders(booking.id, startDate, reminderData)
			} catch (reminderError) {
				console.error("Error creating reminders:", reminderError)
				// Don't fail the booking if reminder creation fails
			}
		}

		revalidatePath("/appointment-bookings")
    revalidateTag("appointment-bookings", { expire: 0 })
		return { 
			success: true,
			emailSent: emailSentCount > 0,
			emailSentCount,
			emailFailedCount,
			uniqueRecipientCount: allEmails.length,
			emailError: emailFailedCount > 0 ? emailError : null,
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
    revalidateTag("appointment-bookings", { expire: 0 })
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
	reminders: Array<{ offsetMinutes: number; recipientEmails: string[] }>
) {
	// Validate offsets
	const offsetMinutes = reminders.map(r => r.offsetMinutes)
	const validation = validateReminderOffsets(offsetMinutes)
	if (!validation.valid) {
		throw new Error(validation.error)
	}

	// Check for duplicates within the provided reminders (same offset time)
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

	// Delete all existing reminders for this booking first (we'll recreate them)
	await prisma.appointmentBookingReminder.deleteMany({
		where: { appointmentBookingId },
	})

	// Create reminder records - one per email per offset (just like email confirmations)
	for (const reminder of reminders) {
		const remindAt = new Date(startDate.getTime() - reminder.offsetMinutes * 60 * 1000)
		const emails = reminder.recipientEmails.filter(e => e.trim())
		
		// If no emails provided, use default
		const emailsToUse = emails.length > 0 ? emails : [defaultEmail].filter(Boolean)
		
		// Create one reminder row per email address
		for (const email of emailsToUse) {
			await prisma.appointmentBookingReminder.create({
				data: {
					appointmentBookingId,
					offsetMinutes: reminder.offsetMinutes,
					recipientEmail: email,
					remindAt,
					status: "PENDING" as const,
				},
			})
		}
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

		// Group reminders by offsetMinutes and collect all emails
		const grouped = reminders.reduce((acc, r) => {
			const key = r.offsetMinutes
			if (!acc[key]) {
				acc[key] = {
					offsetMinutes: r.offsetMinutes,
					remindAt: r.remindAt,
					status: r.status,
					sentAt: r.sentAt,
					attemptCount: r.attemptCount,
					lastError: r.lastError,
					ids: [] as number[],
					recipientEmails: [] as string[],
				}
			}
			acc[key].ids.push(r.id)
			acc[key].recipientEmails.push(r.recipientEmail)
			// Use the most recent status if there are multiple
			if (r.sentAt && (!acc[key].sentAt || r.sentAt > acc[key].sentAt!)) {
				acc[key].sentAt = r.sentAt
			}
			return acc
		}, {} as Record<number, {
			offsetMinutes: number
			remindAt: Date
			status: string
			sentAt: Date | null
			attemptCount: number
			lastError: string | null
			ids: number[]
			recipientEmails: string[]
		}>)

		// Convert grouped object to array, using first id for backward compatibility
		return Object.values(grouped).map((group) => ({
			id: group.ids[0], // Use first id for backward compatibility
			offsetMinutes: group.offsetMinutes,
			recipientEmail: group.recipientEmails[0] || "", // Keep for backward compatibility
			recipientEmails: group.recipientEmails,
			remindAt: group.remindAt,
			status: group.status,
			sentAt: group.sentAt,
			attemptCount: group.attemptCount,
			lastError: group.lastError,
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
	reminders: Array<{ offsetMinutes: number; recipientEmails: string[] }>
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
		// Create one reminder row per email address
		for (const reminder of newReminders) {
			const remindAt = new Date(startDate.getTime() - reminder.offsetMinutes * 60 * 1000)
			const emails = reminder.recipientEmails.filter(e => e.trim())
			const emailsToUse = emails.length > 0 ? emails : [defaultEmail].filter(Boolean)
			
			for (const email of emailsToUse) {
				await prisma.appointmentBookingReminder.create({
					data: {
						appointmentBookingId,
						offsetMinutes: reminder.offsetMinutes,
						recipientEmail: email,
						remindAt,
						status: "PENDING",
					},
				})
			}
		}

		revalidatePath("/appointment-bookings")
    revalidateTag("appointment-bookings", { expire: 0 })
		return { success: true }
	} catch (error: unknown) {
		console.error("Error updating reminders:", error)
		return { success: false, error: error instanceof Error ? error.message : "Failed to update reminders" }
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
    revalidateTag("appointment-bookings", { expire: 0 })
		return { success: true }
	} catch (error: unknown) {
		console.error("Error deleting reminder:", error)
		return { success: false, error: error instanceof Error ? error.message : "Failed to delete reminder" }
	}
}

/**
 * Update a specific reminder's emails
 * This updates all reminders with the same offsetMinutes for the same booking
 */
export async function updateReminderEmail(
	reminderId: number,
	recipientEmails: string[]
) {
	try {
		// Validate emails
		const validEmails = recipientEmails.filter(e => {
			const trimmed = e.trim()
			return trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
		})
		
		if (validEmails.length === 0) {
			return { success: false, error: "At least one valid email address is required" }
		}

		// Get the reminder to find booking and offset
		const reminder = await prisma.appointmentBookingReminder.findUnique({
			where: { id: reminderId },
		})

		if (!reminder) {
			return { success: false, error: "Reminder not found" }
		}

		// Delete all reminders with the same offsetMinutes for this booking
		await prisma.appointmentBookingReminder.deleteMany({
			where: {
				appointmentBookingId: reminder.appointmentBookingId,
				offsetMinutes: reminder.offsetMinutes,
			},
		})

		// Get booking to calculate remindAt
		const booking = await prisma.appointmentBooking.findUnique({
			where: { id: reminder.appointmentBookingId },
		})

		if (!booking) {
			return { success: false, error: "Booking not found" }
		}

		const remindAt = new Date(booking.startDate.getTime() - reminder.offsetMinutes * 60 * 1000)

		// Create new reminders for each email
		for (const email of validEmails) {
			await prisma.appointmentBookingReminder.create({
				data: {
					appointmentBookingId: reminder.appointmentBookingId,
					offsetMinutes: reminder.offsetMinutes,
					recipientEmail: email,
					remindAt,
					status: "PENDING",
				},
			})
		}

		revalidatePath("/appointment-bookings")
    revalidateTag("appointment-bookings", { expire: 0 })
		return { success: true }
	} catch (error: unknown) {
		console.error("Error updating reminder emails:", error)
		return { success: false, error: error instanceof Error ? error.message : "Failed to update reminder emails" }
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
								phone: true,
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
				startDate: formatLocalDateTime(booking.startDate),
				endDate: formatLocalDateTime(booking.endDate),
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
	} catch (error: unknown) {
		console.error("Error sending appointment reminder:", error)
		return { success: false, error: error instanceof Error ? error.message : "Failed to send reminder email" }
	}
}
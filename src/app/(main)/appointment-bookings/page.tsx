export const dynamic = "force-dynamic"
export const revalidate = 0

import { Suspense } from "react"
import { BookingDashboardWrapper } from "./booking-dashboard-wrapper"
import { prisma } from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore } from "next/cache"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"

// Internal functions - not cached, used by cached versions
async function _getAppointmentsInternal() {
	return await prisma.appointment.findMany({
		select: {
			id: true,
			name: true,
			location: true,
			brand: true,
			description: true,
			appointmentType: true,
			isAvailable: true,
			createdAt: true,
			updatedAt: true,
			bookings: {
				where: {
					status: "active"
				},
				include: {
					project: {
						select: {
							id: true,
							name: true,
							clientName: true,
						}
					}
				}
			}
		},
		orderBy: {
			createdAt: "desc",
		},
	})
}

async function _getUserProjectIdsInternal(userId: string) {
	// Execute both queries in parallel for better performance
	const [createdProjects, permittedProjects] = await Promise.all([
		prisma.project.findMany({
			where: {
				createdBy: userId,
			},
			select: {
				id: true,
			},
		}),
		prisma.project.findMany({
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
	])

	// Combine and deduplicate
	const allProjects = [...createdProjects, ...permittedProjects]
	const uniqueProjectIds = Array.from(
		new Set(allProjects.map(p => p.id))
	)

	return uniqueProjectIds
}

async function _getBookingsInternal() {
	return await prisma.appointmentBooking.findMany({
		where: {
			status: "active"
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
				}
			},
			reminders: {
				where: {
					status: {
						in: ['PENDING', 'SENDING']
					}
				},
				select: {
					id: true,
					offsetMinutes: true,
					remindAt: true,
					status: true,
				},
				orderBy: {
					offsetMinutes: 'asc'
				}
			}
		},
		orderBy: {
			createdAt: "desc",
		},
	})
}

// Cached versions
async function getAppointments() {
	// Disable server-side caching for real-time data
	unstable_noStore()
	return await _getAppointmentsInternal()
}

async function getBookings() {
	// Disable server-side caching for real-time data
	unstable_noStore()
	return await _getBookingsInternal()
}

// Cannot cache this - it uses cookies/auth which is dynamic
async function getUserWithRole() {
	try {
		const user = await getCachedUser()

		if (!user) {
			return redirect("/login")
		}

		const dbUser = await prisma.user.findUnique({
			where: { supabase_id: user.id },
			include: {
				userRoles: {
					include: {
						role: true
					}
				}
			}
		})

		if (!dbUser) {
			return redirect("/login")
		}

		const isAdmin = dbUser.userRoles.some(userRole => userRole.role.slug === "admin")

		return {
			user: dbUser,
			isAdmin,
			userId: user.id
		}
	} catch (error: unknown) {
		// Handle redirect errors - must re-throw them
		if (isRedirectError(error)) throw error;
		console.error("Error in getUserWithRole:", error)
		throw new Error("Failed to get user with role")
	}
}

async function getUserProjectIds(userId: string) {
	try {
		// Disable server-side caching for real-time data
		unstable_noStore()
		return await _getUserProjectIdsInternal(userId)
	} catch (error) {
		console.error('Error fetching user project IDs:', error)
		return []
	}
}

export default async function AdminPage() {
	// Fetch all data in parallel including userProjectIds
	const [appointments, bookings, userData] = await Promise.all([
		getAppointments(), 
		getBookings(),
		getUserWithRole()
	])

	// Fetch userProjectIds in parallel with other operations
	const userProjectIds = await getUserProjectIds(userData.userId)

	// Safety checks: ensure arrays are always defined and handle null/undefined
	const safeAppointments = (appointments && Array.isArray(appointments)) ? appointments : []
	const safeBookings = (bookings && Array.isArray(bookings)) ? bookings.map(booking => {
		// Type assertion: Prisma includes reminders in the query, but TypeScript doesn't infer it
		const bookingWithReminders = booking as typeof booking & { reminders?: Array<{ id: number; offsetMinutes: number; remindAt: Date; status: string }> }
		const reminders = 'reminders' in bookingWithReminders && bookingWithReminders.reminders && Array.isArray(bookingWithReminders.reminders) 
			? bookingWithReminders.reminders 
			: []
		return {
			...booking,
			reminders
		}
	}) : []
	const safeUserProjectIds = (userProjectIds && Array.isArray(userProjectIds)) ? userProjectIds : []

	return (
		<div className="container mx-auto p-6">
			<Suspense fallback={<div>Loading...</div>}>
				<BookingDashboardWrapper 
					appointments={safeAppointments}
					bookings={safeBookings}
					isAdmin={userData.isAdmin}
					userProjectIds={safeUserProjectIds}
				/>
			</Suspense>
		</div>
	)
}

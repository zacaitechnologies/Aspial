export const dynamic = "force-dynamic"
export const revalidate = 0

import { Suspense } from "react"
import { BookingDashboardWrapper } from "./booking-dashboard-wrapper"
import { prisma } from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore } from "next/cache"
import { redirect } from "next/navigation"

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
	} catch (error: any) {
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
	const [appointments, bookings, userData] = await Promise.all([
		getAppointments(), 
		getBookings(),
		getUserWithRole()
	])

	const userProjectIds = await getUserProjectIds(userData.userId)

	return (
		<div className="container mx-auto p-6">
			<Suspense fallback={<div>Loading...</div>}>
				<BookingDashboardWrapper 
					appointments={appointments}
					bookings={bookings}
					isAdmin={userData.isAdmin}
					userProjectIds={userProjectIds}
				/>
			</Suspense>
		</div>
	)
}

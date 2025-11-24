export const dynamic = "force-dynamic"
export const revalidate = 0

import { Suspense } from "react"
import { BookingDashboard } from "./equipment-dashboard"
import { prisma } from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_cache } from "next/cache"
import { redirect } from "next/navigation"

// Internal functions - not cached, used by cached versions
async function _getStudiosInternal() {
	return await prisma.studio.findMany({
		include: {
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

async function _getEquipmentInternal() {
	return await prisma.equipment.findMany({
		include: {
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

// Cached versions
async function getStudios() {
	return await unstable_cache(
		async () => _getStudiosInternal(),
		['equipment-bookings-studios'],
		{
			revalidate: 30, // 30 seconds
			tags: ['equipment-bookings'],
		}
	)()
}

async function getEquipment() {
	return await unstable_cache(
		async () => _getEquipmentInternal(),
		['equipment-bookings-equipment'],
		{
			revalidate: 30, // 30 seconds
			tags: ['equipment-bookings'],
		}
	)()
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
		return await unstable_cache(
			async () => _getUserProjectIdsInternal(userId),
			[`equipment-bookings-user-projects-${userId}`],
			{
				revalidate: 60, // 60 seconds
				tags: ['user-projects', `user-projects-${userId}`],
			}
		)()
	} catch (error) {
		console.error('Error fetching user project IDs:', error)
		return []
	}
}

export default async function AdminPage() {
	const [studios, equipment, userData] = await Promise.all([
		getStudios(), 
		getEquipment(), 
		getUserWithRole()
	])

	const userProjectIds = await getUserProjectIds(userData.userId)

	return (
		<div className="container mx-auto p-6">
			<Suspense fallback={<div>Loading...</div>}>
				<BookingDashboard 
					studios={studios} 
					equipment={equipment} 
					isAdmin={userData.isAdmin}
					userProjectIds={userProjectIds}
				/>
			</Suspense>
		</div>
	)
}

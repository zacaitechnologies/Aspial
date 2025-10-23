import { Suspense } from "react"
import { BookingDashboard } from "./equipment-dashboard"
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

async function getStudios() {
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

async function getEquipment() {
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

async function getUserWithRole() {
	try {
		const supabase = await createClient()

		const { data: { user }, error } = await supabase.auth.getUser()

		if (error || !user) {
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
	} catch (error: any) {
		console.error("Error in getUserWithRole:", error)
		throw new Error("Failed to get user with role")
	}
}

async function getUserProjectIds(userId: string) {
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

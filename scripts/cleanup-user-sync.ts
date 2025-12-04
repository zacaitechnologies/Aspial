/**
 * Cleanup script to sync Prisma and Supabase Auth users
 * 
 * This script:
 * 1. Deletes orphaned Supabase Auth users (not in Prisma)
 * 2. Deletes Prisma users missing in Supabase Auth
 * 3. Generates a list of legitimate users for userSyncData.ts
 * 
 * Usage:
 *   npx tsx scripts/cleanup-user-sync.ts
 * 
 * WARNING: This script will DELETE users. Use with caution!
 */

import { PrismaClient } from "@prisma/client"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const prisma = new PrismaClient()

// Create Supabase admin client
function createAdminClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!supabaseUrl) {
		throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in environment variables")
	}

	if (!serviceRoleKey) {
		throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables")
	}

	return createSupabaseClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})
}

async function cleanupUserSync() {
	console.log("🧹 Starting user synchronization cleanup...")
	console.log("")

	const supabase = createAdminClient()

	try {
		// Fetch all users from Supabase Auth
		console.log("📊 Fetching all users from Supabase Auth...")
		let allSupabaseUsers: any[] = []
		let page = 1
		const perPage = 1000
		let hasMore = true

		while (hasMore) {
			const { data: users, error: listError } = await supabase.auth.admin.listUsers({
				page,
				perPage,
			})

			if (listError) {
				throw new Error(`Failed to list Supabase users: ${listError.message}`)
			}

			if (users?.users) {
				allSupabaseUsers = allSupabaseUsers.concat(users.users)
				hasMore = users.users.length === perPage
				page++
			} else {
				hasMore = false
			}
		}

		console.log(`   Found ${allSupabaseUsers.length} user(s) in Supabase Auth`)
		console.log("")

		// Fetch all users from Prisma
		console.log("📊 Fetching users from Prisma database...")
		const prismaUsers = await prisma.user.findMany({
			select: {
				id: true,
				supabase_id: true,
				email: true,
				firstName: true,
				lastName: true,
			},
			orderBy: {
				email: "asc",
			},
		})

		console.log(`   Found ${prismaUsers.length} user(s) in Prisma database`)
		console.log("")

		// Create maps for quick lookup
		const supabaseUsersMap = new Map<string, any>()
		for (const authUser of allSupabaseUsers) {
			supabaseUsersMap.set(authUser.id, authUser)
		}

		const prismaUsersBySupabaseId = new Map<string, typeof prismaUsers[0]>()
		for (const prismaUser of prismaUsers) {
			if (prismaUser.supabase_id) {
				prismaUsersBySupabaseId.set(prismaUser.supabase_id, prismaUser)
			}
		}

		// Find orphaned Supabase users (in Supabase but not in Prisma)
		const orphanedSupabaseUsers = allSupabaseUsers.filter(
			(authUser) => !prismaUsersBySupabaseId.has(authUser.id)
		)

		// Find Prisma users missing in Supabase
		const missingInSupabaseUsers = prismaUsers.filter(
			(prismaUser) => !prismaUser.supabase_id || !supabaseUsersMap.has(prismaUser.supabase_id)
		)

		// Find legitimate users (exist in both)
		const legitimateUsers = prismaUsers.filter(
			(prismaUser) => prismaUser.supabase_id && supabaseUsersMap.has(prismaUser.supabase_id)
		)

		// Print summary
		console.log("=".repeat(80))
		console.log("📋 CLEANUP SUMMARY")
		console.log("=".repeat(80))
		console.log(`Orphaned Supabase Auth users (will be deleted): ${orphanedSupabaseUsers.length}`)
		console.log(`Prisma users missing in Supabase (will be deleted): ${missingInSupabaseUsers.length}`)
		console.log(`Legitimate users (will be kept): ${legitimateUsers.length}`)
		console.log("")

		if (orphanedSupabaseUsers.length === 0 && missingInSupabaseUsers.length === 0) {
			console.log("✅ No cleanup needed! All users are properly synced.")
			console.log("")
			// Still generate the legitimate users list
			await generateLegitimateUsersList(legitimateUsers, supabaseUsersMap)
			return
		}

		// Show what will be deleted
		if (orphanedSupabaseUsers.length > 0) {
			console.log("=".repeat(80))
			console.log("🔵 ORPHANED SUPABASE AUTH USERS (Will be deleted)")
			console.log("=".repeat(80))
			for (const authUser of orphanedSupabaseUsers) {
				console.log(`   - ${authUser.email || "NO EMAIL"} (ID: ${authUser.id})`)
			}
			console.log("")
		}

		if (missingInSupabaseUsers.length > 0) {
			console.log("=".repeat(80))
			console.log("🔴 PRISMA USERS MISSING IN SUPABASE (Will be deleted)")
			console.log("=".repeat(80))
			for (const prismaUser of missingInSupabaseUsers) {
				console.log(`   - ${prismaUser.firstName} ${prismaUser.lastName} (${prismaUser.email})`)
				console.log(`     Prisma ID: ${prismaUser.id}`)
				console.log(`     Supabase ID: ${prismaUser.supabase_id || "NULL"}`)
			}
			console.log("")
		}

		// Ask for confirmation (in a real scenario, you might want to add a prompt)
		console.log("⚠️  WARNING: This will DELETE users!")
		console.log("   Press Ctrl+C to cancel, or wait 5 seconds to continue...")
		console.log("")

		// Wait 5 seconds
		await new Promise((resolve) => setTimeout(resolve, 5000))

		// Delete orphaned Supabase users
		if (orphanedSupabaseUsers.length > 0) {
			console.log("🗑️  Deleting orphaned Supabase Auth users...")
			for (const authUser of orphanedSupabaseUsers) {
				try {
					const { error } = await supabase.auth.admin.deleteUser(authUser.id)
					if (error) {
						console.error(`   ❌ Failed to delete ${authUser.email}: ${error.message}`)
					} else {
						console.log(`   ✅ Deleted ${authUser.email || authUser.id}`)
					}
				} catch (error: any) {
					console.error(`   ❌ Error deleting ${authUser.email}: ${error.message}`)
				}
			}
			console.log("")
		}

		// Delete Prisma users missing in Supabase
		if (missingInSupabaseUsers.length > 0) {
			console.log("🗑️  Deleting Prisma users missing in Supabase...")
			for (const prismaUser of missingInSupabaseUsers) {
				try {
					// Delete related records first (foreign key constraints)
					// Records that reference User.id
					await prisma.userRole.deleteMany({
						where: { userId: prismaUser.id },
					})

					await prisma.complaint.deleteMany({
						where: { userId: prismaUser.id },
					})

					await prisma.timeEntry.deleteMany({
						where: { userId: prismaUser.id },
					})

					// Records that reference User.supabase_id
					if (prismaUser.supabase_id) {
						await prisma.quotation.deleteMany({
							where: { createdById: prismaUser.supabase_id },
						})

						await prisma.project.deleteMany({
							where: { createdBy: prismaUser.supabase_id },
						})

						await prisma.projectPermission.deleteMany({
							where: { userId: prismaUser.supabase_id },
						})

						await prisma.projectInvitation.deleteMany({
							where: {
								OR: [
									{ invitedBy: prismaUser.supabase_id },
									{ invitedUser: prismaUser.supabase_id },
								],
							},
						})

						await prisma.task.deleteMany({
							where: {
								OR: [
									{ assigneeId: prismaUser.supabase_id },
									{ creatorId: prismaUser.supabase_id },
								],
							},
						})

						await prisma.customService.deleteMany({
							where: {
								OR: [
									{ createdById: prismaUser.supabase_id },
									{ reviewedById: prismaUser.supabase_id },
								],
							},
						})
					}

					// Delete the user
					await prisma.user.delete({
						where: { id: prismaUser.id },
					})

					console.log(`   ✅ Deleted ${prismaUser.firstName} ${prismaUser.lastName} (${prismaUser.email})`)
				} catch (error: any) {
					console.error(`   ❌ Error deleting ${prismaUser.email}: ${error.message}`)
					console.error(`   Stack: ${error.stack}`)
				}
			}
			console.log("")
		}

		// Generate legitimate users list
		await generateLegitimateUsersList(legitimateUsers, supabaseUsersMap)

		console.log("=".repeat(80))
		console.log("✅ Cleanup completed!")
		console.log("=".repeat(80))

	} catch (error: any) {
		console.error("❌ Fatal error:", error.message)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

async function generateLegitimateUsersList(
	legitimateUsers: any[],
	supabaseUsersMap: Map<string, any>
) {
	console.log("=".repeat(80))
	console.log("📝 GENERATING LEGITIMATE USERS LIST")
	console.log("=".repeat(80))
	console.log("")

	// Get user roles for each legitimate user
	const usersWithRoles = await Promise.all(
		legitimateUsers.map(async (prismaUser) => {
			const userRoles = await prisma.userRole.findMany({
				where: { userId: prismaUser.id },
				include: { role: true },
			})

			const roles = userRoles.map((ur) => ur.role.slug)
			const authUser = supabaseUsersMap.get(prismaUser.supabase_id!)

			return {
				firstName: prismaUser.firstName,
				lastName: prismaUser.lastName,
				email: prismaUser.email,
				supabase_id: prismaUser.supabase_id,
				roles: roles,
				emailConfirmed: authUser?.email_confirmed_at ? true : false,
			}
		})
	)

	// Generate the code for userSyncData.ts
	console.log("Copy this code to replace the users array in prisma/userSyncData.ts:")
	console.log("")
	console.log("  const users = [")

	for (const user of usersWithRoles) {
		const rolesStr = user.roles.map((r) => `'${r}'`).join(", ")
		console.log(`    {`)
		console.log(`      firstName: '${user.firstName}',`)
		console.log(`      lastName: '${user.lastName}',`)
		console.log(`      email: '${user.email}',`)
		console.log(`      supabase_id: '${user.supabase_id}',`)
		console.log(`      roles: [${rolesStr}],`)
		console.log(`      // Email confirmed: ${user.emailConfirmed ? "✅" : "❌"}`)
		console.log(`    },`)
	}

	console.log("  ];")
	console.log("")
}

// Run the cleanup
cleanupUserSync().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})


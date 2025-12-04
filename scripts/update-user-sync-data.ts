/**
 * Script to automatically update userSyncData.ts with legitimate users
 * 
 * This script:
 * 1. Fetches all legitimate users (exist in both Prisma and Supabase)
 * 2. Updates the userSyncData.ts file with the current legitimate users
 * 
 * Usage:
 *   npx tsx scripts/update-user-sync-data.ts
 */

import { PrismaClient } from "@prisma/client"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

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

async function updateUserSyncData() {
	console.log("🔄 Updating userSyncData.ts with legitimate users...")
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

		// Create map of Supabase users
		const supabaseUsersMap = new Map<string, any>()
		for (const authUser of allSupabaseUsers) {
			supabaseUsersMap.set(authUser.id, authUser)
		}

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

		// Find legitimate users (exist in both)
		const legitimateUsers = prismaUsers.filter(
			(prismaUser) => prismaUser.supabase_id && supabaseUsersMap.has(prismaUser.supabase_id)
		)

		console.log(`   Found ${legitimateUsers.length} legitimate user(s)`)
		console.log("")

		// Get user roles for each legitimate user
		const usersWithRoles = await Promise.all(
			legitimateUsers.map(async (prismaUser) => {
				const userRoles = await prisma.userRole.findMany({
					where: { userId: prismaUser.id },
					include: { role: true },
				})

				const roles = userRoles.map((ur) => ur.role.slug)

				return {
					firstName: prismaUser.firstName,
					lastName: prismaUser.lastName,
					email: prismaUser.email,
					supabase_id: prismaUser.supabase_id!,
					roles: roles,
				}
			})
		)

		// Generate the users array code
		let usersArrayCode = "  const users = [\n"
		for (const user of usersWithRoles) {
			const rolesStr = user.roles.map((r) => `'${r}'`).join(", ")
			usersArrayCode += `    {\n`
			usersArrayCode += `      firstName: '${user.firstName}',\n`
			usersArrayCode += `      lastName: '${user.lastName}',\n`
			usersArrayCode += `      email: '${user.email}',\n`
			usersArrayCode += `      supabase_id: '${user.supabase_id}',\n`
			usersArrayCode += `      roles: [${rolesStr}],\n`
			usersArrayCode += `    },\n`
		}
		usersArrayCode += "  ];"

		// Read the current file
		const filePath = path.join(process.cwd(), "prisma", "userSyncData.ts")
		let fileContent = fs.readFileSync(filePath, "utf-8")

		// Replace the users array
		const usersArrayRegex = /const users = \[[\s\S]*?\];/
		if (usersArrayRegex.test(fileContent)) {
			fileContent = fileContent.replace(usersArrayRegex, usersArrayCode)
		} else {
			console.error("❌ Could not find users array in file")
			return
		}

		// Write the updated file
		fs.writeFileSync(filePath, fileContent, "utf-8")

		console.log("=".repeat(80))
		console.log("✅ Successfully updated userSyncData.ts!")
		console.log("=".repeat(80))
		console.log(`   Updated ${usersWithRoles.length} user(s)`)
		console.log("")

	} catch (error: any) {
		console.error("❌ Fatal error:", error.message)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the update
updateUserSyncData().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})





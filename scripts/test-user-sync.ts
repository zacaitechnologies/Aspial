/**
 * Test script to verify user synchronization between Prisma and Supabase Auth
 * 
 * This script checks:
 * 1. Lists all users from Supabase Auth
 * 2. Lists all users from Prisma database
 * 3. If all users in Prisma database exist in Supabase Auth
 * 4. If their IDs match (Prisma supabase_id === Supabase Auth id)
 * 5. If their emails match
 * 6. Identifies users in Supabase Auth but not in Prisma
 * 
 * Usage:
 *   npx tsx scripts/test-user-sync.ts
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

interface UserCheckResult {
	prismaId: string
	supabaseId: string | null
	email: string
	firstName: string
	lastName: string
	existsInSupabase: boolean
	supabaseAuthId: string | null
	supabaseAuthEmail: string | null
	idMatches: boolean
	emailMatches: boolean
	error?: string
}

async function checkUserSync() {
	console.log("🔍 Starting user synchronization check...")
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

		// List all Supabase Auth users
		console.log("=".repeat(80))
		console.log("👥 ALL SUPABASE AUTH USERS")
		console.log("=".repeat(80))
		console.log("")
		if (allSupabaseUsers.length === 0) {
			console.log("   No users found in Supabase Auth")
		} else {
			for (const authUser of allSupabaseUsers) {
				const metadata = authUser.user_metadata || {}
				console.log(`   ID: ${authUser.id}`)
				console.log(`   Email: ${authUser.email || "NULL"}`)
				console.log(`   Created: ${authUser.created_at ? new Date(authUser.created_at).toLocaleString() : "NULL"}`)
				console.log(`   Email Confirmed: ${authUser.email_confirmed_at ? "✅ YES" : "❌ NO"}`)
				console.log(`   Metadata: ${JSON.stringify(metadata)}`)
				console.log("")
			}
		}
		console.log("")

		// List all Prisma users
		console.log("=".repeat(80))
		console.log("👥 ALL PRISMA DATABASE USERS")
		console.log("=".repeat(80))
		console.log("")
		if (prismaUsers.length === 0) {
			console.log("   No users found in Prisma database")
		} else {
			for (const prismaUser of prismaUsers) {
				console.log(`   Prisma ID: ${prismaUser.id}`)
				console.log(`   Supabase ID: ${prismaUser.supabase_id || "NULL"}`)
				console.log(`   Email: ${prismaUser.email}`)
				console.log(`   Name: ${prismaUser.firstName} ${prismaUser.lastName}`)
				console.log("")
			}
		}
		console.log("")

		if (prismaUsers.length === 0) {
			console.log("⚠️  No users found in Prisma database")
			return
		}

		// Check each Prisma user against Supabase Auth
		const results: UserCheckResult[] = []
		let successCount = 0
		let errorCount = 0
		let missingCount = 0
		let mismatchCount = 0

		// Create a map of Supabase users by ID for quick lookup
		const supabaseUsersMap = new Map<string, any>()
		for (const authUser of allSupabaseUsers) {
			supabaseUsersMap.set(authUser.id, authUser)
		}

		// Create a map of Prisma users by supabase_id for reverse lookup
		const prismaUsersBySupabaseId = new Map<string, typeof prismaUsers[0]>()
		for (const prismaUser of prismaUsers) {
			if (prismaUser.supabase_id) {
				prismaUsersBySupabaseId.set(prismaUser.supabase_id, prismaUser)
			}
		}

		console.log("🔎 Checking each Prisma user against Supabase Auth...")
		console.log("")

		for (const user of prismaUsers) {
			const result: UserCheckResult = {
				prismaId: user.id,
				supabaseId: user.supabase_id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				existsInSupabase: false,
				supabaseAuthId: null,
				supabaseAuthEmail: null,
				idMatches: false,
				emailMatches: false,
			}

			// Check if supabase_id exists
			if (!user.supabase_id) {
				result.error = "No supabase_id in Prisma database"
				errorCount++
				results.push(result)
				continue
			}

			// Check if user exists in Supabase Auth using the map
			const authUser = supabaseUsersMap.get(user.supabase_id)

			if (!authUser) {
				result.error = "User not found in Supabase Auth"
				missingCount++
			} else {
				result.existsInSupabase = true
				result.supabaseAuthId = authUser.id
				result.supabaseAuthEmail = authUser.email || null

				// Check if IDs match
				result.idMatches = user.supabase_id === authUser.id

				// Check if emails match
				result.emailMatches = user.email.toLowerCase() === (authUser.email || "").toLowerCase()

				if (result.idMatches && result.emailMatches) {
					successCount++
				} else {
					mismatchCount++
				}
			}

			results.push(result)
		}

		// Find users in Supabase Auth but not in Prisma
		const orphanedSupabaseUsers = allSupabaseUsers.filter(
			(authUser) => !prismaUsersBySupabaseId.has(authUser.id)
		)

		// Print results
		console.log("=".repeat(80))
		console.log("📋 SUMMARY")
		console.log("=".repeat(80))
		console.log(`Total users in Supabase Auth: ${allSupabaseUsers.length}`)
		console.log(`Total users in Prisma: ${prismaUsers.length}`)
		console.log(`✅ Fully synced (ID + Email match): ${successCount}`)
		console.log(`⚠️  Missing in Supabase Auth: ${missingCount}`)
		console.log(`❌ ID/Email mismatch: ${mismatchCount}`)
		console.log(`🔴 Errors: ${errorCount}`)
		console.log(`🔵 Orphaned in Supabase (not in Prisma): ${orphanedSupabaseUsers.length}`)
		console.log("")

		// Print detailed results
		console.log("=".repeat(80))
		console.log("📝 DETAILED RESULTS")
		console.log("=".repeat(80))
		console.log("")

		for (const result of results) {
			const statusIcon = result.existsInSupabase && result.idMatches && result.emailMatches
				? "✅"
				: result.existsInSupabase && (!result.idMatches || !result.emailMatches)
				? "⚠️"
				: "❌"

			console.log(`${statusIcon} ${result.firstName} ${result.lastName} (${result.email})`)
			console.log(`   Prisma ID: ${result.prismaId}`)
			console.log(`   Prisma supabase_id: ${result.supabaseId || "NULL"}`)

			if (result.existsInSupabase) {
				console.log(`   Supabase Auth ID: ${result.supabaseAuthId}`)
				console.log(`   Supabase Auth Email: ${result.supabaseAuthEmail || "NULL"}`)
				console.log(`   ID Match: ${result.idMatches ? "✅ YES" : "❌ NO"}`)
				console.log(`   Email Match: ${result.emailMatches ? "✅ YES" : "❌ NO"}`)
			} else {
				console.log(`   Status: ${result.error || "Not found in Supabase Auth"}`)
			}

			console.log("")
		}

		// List orphaned Supabase users
		if (orphanedSupabaseUsers.length > 0) {
			console.log("=".repeat(80))
			console.log("🔵 ORPHANED SUPABASE AUTH USERS (Not in Prisma)")
			console.log("=".repeat(80))
			console.log("")
			for (const authUser of orphanedSupabaseUsers) {
				const metadata = authUser.user_metadata || {}
				console.log(`   ID: ${authUser.id}`)
				console.log(`   Email: ${authUser.email || "NULL"}`)
				console.log(`   Created: ${authUser.created_at ? new Date(authUser.created_at).toLocaleString() : "NULL"}`)
				console.log(`   Metadata: ${JSON.stringify(metadata)}`)
				console.log("")
			}
		}

		// Print recommendations
		if (missingCount > 0 || mismatchCount > 0 || errorCount > 0 || orphanedSupabaseUsers.length > 0) {
			console.log("=".repeat(80))
			console.log("💡 RECOMMENDATIONS")
			console.log("=".repeat(80))
			console.log("")

			if (missingCount > 0) {
				console.log("⚠️  Users missing in Supabase Auth:")
				console.log("   - These users exist in Prisma but not in Supabase Auth")
				console.log("   - They may have been manually created in the database")
				console.log("   - Or they may have been deleted from Supabase Auth")
				console.log("   - Consider recreating them in Supabase Auth or removing from Prisma")
				console.log("")
			}

			if (orphanedSupabaseUsers.length > 0) {
				console.log("🔵 Orphaned users in Supabase Auth:")
				console.log("   - These users exist in Supabase Auth but not in Prisma")
				console.log("   - They may have been created directly in Supabase Auth")
				console.log("   - Or the Prisma record may have been deleted")
				console.log("   - Consider creating Prisma records for them or deleting from Supabase Auth")
				console.log("")
			}

			if (mismatchCount > 0) {
				console.log("⚠️  Users with ID/Email mismatches:")
				console.log("   - These users exist in both systems but data doesn't match")
				console.log("   - Check if the supabase_id in Prisma matches the user ID in Supabase Auth")
				console.log("   - Verify email addresses are correct in both systems")
				console.log("")
			}

			if (errorCount > 0) {
				console.log("🔴 Errors occurred while checking users:")
				console.log("   - Check your SUPABASE_SERVICE_ROLE_KEY is correct")
				console.log("   - Verify your Supabase URL is correct")
				console.log("   - Ensure you have admin access to Supabase")
				console.log("")
			}
		} else {
			console.log("=".repeat(80))
			console.log("🎉 ALL USERS ARE PROPERLY SYNCED!")
			console.log("=".repeat(80))
		}

	} catch (error: any) {
		console.error("❌ Fatal error:", error.message)
		console.error("")
		console.error("Make sure you have:")
		console.error("  1. NEXT_PUBLIC_SUPABASE_URL in your .env.local")
		console.error("  2. SUPABASE_SERVICE_ROLE_KEY in your .env.local")
		console.error("  3. DATABASE_URL in your .env.local")
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the check
checkUserSync()
	.catch((error) => {
		console.error("Fatal error:", error)
		process.exit(1)
	})


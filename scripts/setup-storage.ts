/**
 * Setup script for Supabase Storage Bucket
 * 
 * Run this script to automatically create the profile-pictures bucket and RLS policies
 * 
 * Usage:
 *   npx tsx scripts/setup-storage.ts
 * 
 * Or import and call from your code:
 *   import { setupProfilePicturesStorage } from '@/app/(main)/settings/setup-storage'
 *   await setupProfilePicturesStorage()
 */

import { setupProfilePicturesStorage } from "../src/app/(main)/settings/setup-storage"

async function main() {
	console.log("🚀 Starting storage setup...")
	console.log("")

	const result = await setupProfilePicturesStorage()

	console.log("")
	if (result.success) {
		if (result.policiesCreated) {
			console.log("✅ Setup completed successfully!")
			console.log(`   - Bucket: ${result.bucketCreated ? "Created" : "Already exists"}`)
			console.log("   - RLS Policies: Created")
		} else {
			console.log("⚠️  Setup partially completed")
			console.log(`   - Bucket: ${result.bucketCreated ? "Created" : "Already exists"}`)
			console.log("   - RLS Policies: Need to be created manually")
			console.log("")
			console.log("Please run this SQL in your Supabase SQL Editor:")
			console.log("")
			console.log(result.sql)
		}
	} else {
		console.log("❌ Setup failed!")
		console.log(`   Error: ${result.error}`)
		if (result.sql) {
			console.log("")
			console.log("Please run this SQL in your Supabase SQL Editor:")
			console.log("")
			console.log(result.sql)
		}
		process.exit(1)
	}
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})


/**
 * Setup script for Supabase Storage Buckets
 *
 * Creates the profile-pictures and leave-attachments buckets and prints
 * the RLS policy SQL that must be applied via the Supabase SQL Editor.
 *
 * Usage:
 *   npx tsx scripts/setup-storage.ts
 */

import {
	setupProfilePicturesStorage,
	setupLeaveAttachmentsStorage,
} from "../supabase/storage/setup-storage"

type SetupResult =
	| { success: true; bucketCreated?: boolean; sql?: string }
	| { success: false; error?: string; sql?: string }

function printResult(label: string, result: SetupResult) {
	console.log("")
	console.log(`── ${label} ──`)
	if (result.success) {
		console.log(`✅ Bucket: ${result.bucketCreated ? "Created" : "Already exists"}`)
		console.log("⚠️  RLS Policies: apply the SQL below in the Supabase SQL Editor")
		if (result.sql) {
			console.log("")
			console.log(result.sql)
		}
	} else {
		console.log(`❌ Setup failed: ${result.error ?? "unknown error"}`)
		if (result.sql) {
			console.log("")
			console.log("RLS SQL to apply manually once the bucket exists:")
			console.log("")
			console.log(result.sql)
		}
	}
}

async function main() {
	console.log("🚀 Starting storage setup...")

	const profileResult = (await setupProfilePicturesStorage()) as SetupResult
	printResult("profile-pictures", profileResult)

	const leaveResult = (await setupLeaveAttachmentsStorage()) as SetupResult
	printResult("leave-attachments", leaveResult)

	if (!profileResult.success || !leaveResult.success) {
		process.exit(1)
	}
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})

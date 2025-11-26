"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const PROFILE_PICTURES_BUCKET = "profile-pictures"

// Create admin client for bucket operations (requires SUPABASE_SERVICE_ROLE_KEY)
function createAdminClient() {
	if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
		throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables")
	}

	return createSupabaseClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		}
	)
}

/**
 * Note: Supabase doesn't provide a direct REST API to execute arbitrary SQL.
 * Policies must be created manually via the Supabase SQL Editor or Dashboard.
 * This function just returns the SQL for manual execution.
 */

/**
 * Sets up the profile-pictures storage bucket and RLS policies
 * Run this script once during initial setup
 */
export async function setupProfilePicturesStorage() {
	try {
		const adminClient = createAdminClient()

		// Step 1: Check if bucket exists
		console.log("Checking if bucket exists...")
		const { data: buckets, error: listError } = await adminClient.storage.listBuckets()

		if (listError) {
			throw new Error(`Failed to list buckets: ${listError.message}`)
		}

		const bucketExists = buckets?.some(bucket => bucket.name === PROFILE_PICTURES_BUCKET)

		// Step 2: Create bucket if it doesn't exist
		if (!bucketExists) {
			console.log(`Creating bucket '${PROFILE_PICTURES_BUCKET}'...`)
			const { data: bucketData, error: createError } = await adminClient.storage.createBucket(
				PROFILE_PICTURES_BUCKET,
				{
					public: true, // Make bucket public so images can be accessed
					fileSizeLimit: 5242880, // 5MB
					allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
				}
			)

			if (createError) {
				throw new Error(`Failed to create bucket: ${createError.message}`)
			}

			console.log(`Bucket '${PROFILE_PICTURES_BUCKET}' created successfully`)
		} else {
			console.log(`Bucket '${PROFILE_PICTURES_BUCKET}' already exists`)
		}

		// Step 3: Generate SQL for RLS policies
		// Note: Supabase doesn't support executing arbitrary SQL via REST API
		// Policies must be created manually in the Supabase SQL Editor
		console.log("Generating RLS policy SQL...")

		const policySQL = `-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');`

		return {
			success: true,
			bucketCreated: !bucketExists,
			policiesCreated: false,
			message: "Bucket created/verified successfully. Please run the SQL below in Supabase SQL Editor to create RLS policies.",
			sql: policySQL,
		}
	} catch (error: any) {
		console.error("Error setting up storage:", error)
		
		// Generate SQL for manual execution even on error
		const policySQL = `-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');`

		return {
			success: false,
			error: error.message || "Failed to set up storage",
			sql: policySQL,
		}
	}
}


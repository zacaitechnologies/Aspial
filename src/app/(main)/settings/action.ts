"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const PROFILE_PICTURES_BUCKET = "profile-pictures"

// Create admin client for bucket operations (requires SUPABASE_SERVICE_ROLE_KEY)
function createAdminClient() {
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

// Ensure bucket exists (call this once during setup or manually create in Supabase dashboard)
// This can be exported and called from a setup script if needed
export async function ensureBucketExists() {
	try {
		const adminClient = createAdminClient()
		
		// Check if bucket exists
		const { data: buckets, error: listError } = await adminClient.storage.listBuckets()
		
		if (listError) {
			console.error("Error listing buckets:", listError)
			return { success: false, error: listError.message }
		}

		const bucketExists = buckets?.some(bucket => bucket.name === PROFILE_PICTURES_BUCKET)

		if (!bucketExists) {
			// Create bucket
			const { data, error: createError } = await adminClient.storage.createBucket(
				PROFILE_PICTURES_BUCKET,
				{
					public: true, // Make bucket public so images can be accessed
					fileSizeLimit: 5242880, // 5MB
					allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
				}
			)

			if (createError) {
				console.error("Error creating bucket:", createError)
				return { success: false, error: createError.message }
			}

			return { success: true, created: true }
		}

		return { success: true, created: false }
	} catch (error: any) {
		console.error("Error ensuring bucket exists:", error)
		return { success: false, error: error.message }
	}
}

export async function updateProfile(data: {
	firstName: string
	lastName: string
}) {
	try {
		const supabase = await createClient()
		const { data: { user }, error: authError } = await supabase.auth.getUser()

		if (authError || !user) {
			return {
				success: false,
				error: "Unauthorized"
			}
		}

		// Get user from database
		const dbUser = await prisma.user.findUnique({
			where: { supabase_id: user.id },
			select: { id: true }
		})

		if (!dbUser) {
			return {
				success: false,
				error: "User not found"
			}
		}

		// Update user in database (only firstName and lastName)
		await prisma.user.update({
			where: { id: dbUser.id },
			data: {
				firstName: data.firstName,
				lastName: data.lastName
			}
		})

		revalidatePath("/settings")
		return {
			success: true
		}
	} catch (error: any) {
		console.error("Error updating profile:", error)
		return {
			success: false,
			error: error.message || "Failed to update profile"
		}
	}
}

export async function changePassword(data: {
	currentPassword: string
	newPassword: string
}) {
	try {
		const supabase = await createClient()
		const { data: { user }, error: authError } = await supabase.auth.getUser()

		if (authError || !user) {
			return {
				success: false,
				error: "Unauthorized"
			}
		}

		// Verify current password by attempting to sign in
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email: user.email!,
			password: data.currentPassword
		})

		if (signInError) {
			return {
				success: false,
				error: "Current password is incorrect"
			}
		}

		// Update password
		const { error: updateError } = await supabase.auth.updateUser({
			password: data.newPassword
		})

		if (updateError) {
			return {
				success: false,
				error: `Failed to update password: ${updateError.message}`
			}
		}

		return {
			success: true
		}
	} catch (error: any) {
		console.error("Error changing password:", error)
		return {
			success: false,
			error: error.message || "Failed to change password"
		}
	}
}

export async function uploadProfilePicture(formData: FormData) {
	try {
		const supabase = await createClient()
		const { data: { user }, error: authError } = await supabase.auth.getUser()

		if (authError || !user) {
			return {
				success: false,
				error: "Unauthorized"
			}
		}

		// Get user from database
		const dbUser = await prisma.user.findUnique({
			where: { supabase_id: user.id },
			select: { id: true, profilePicture: true }
		})

		if (!dbUser) {
			return {
				success: false,
				error: "User not found"
			}
		}

		const file = formData.get("file") as File | null
		if (!file) {
			return {
				success: false,
				error: "No file provided"
			}
		}

		// Validate file type
		if (!file.type.startsWith("image/")) {
			return {
				success: false,
				error: "File must be an image"
			}
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return {
				success: false,
				error: "File size must be less than 5MB"
			}
		}

		// Generate unique filename
		const fileExt = file.name.split(".").pop()
		const fileName = `${user.id}-${Date.now()}.${fileExt}`
		const filePath = `${fileName}`

		// Delete old profile picture if it exists
		if (dbUser.profilePicture) {
			try {
				// Extract file path from URL (remove domain and bucket name)
				const oldFilePath = dbUser.profilePicture.split("/").pop()
				if (oldFilePath) {
					await supabase.storage
						.from(PROFILE_PICTURES_BUCKET)
						.remove([oldFilePath])
				}
			} catch (deleteError) {
				// Log but don't fail if old image deletion fails
				console.error("Error deleting old profile picture:", deleteError)
			}
		}

		// Upload new file to Supabase storage
		let uploadData = null
		let uploadError = null
		
		const uploadResult = await supabase.storage
			.from(PROFILE_PICTURES_BUCKET)
			.upload(filePath, file, {
				cacheControl: "3600",
				upsert: false
			})

		uploadData = uploadResult.data
		uploadError = uploadResult.error

		if (uploadError) {
			// If bucket not found, try to create it (only works if SUPABASE_SERVICE_ROLE_KEY is set)
			if (uploadError.message.includes("Bucket not found") || uploadError.message.includes("not found")) {
				const bucketResult = await ensureBucketExists()
				if (bucketResult.success) {
					// Retry upload after creating bucket
					const retryResult = await supabase.storage
						.from(PROFILE_PICTURES_BUCKET)
						.upload(filePath, file, {
							cacheControl: "3600",
							upsert: false
						})

					if (retryResult.error) {
						return {
							success: false,
							error: `Failed to upload image: ${retryResult.error.message}. Please run 'npm run setup:storage' to set up the bucket and policies.`
						}
					}
					uploadData = retryResult.data
				} else {
					return {
						success: false,
						error: `Bucket '${PROFILE_PICTURES_BUCKET}' not found. Please run 'npm run setup:storage' to set it up automatically, or create it manually in Supabase Dashboard > Storage.`
					}
				}
			} else if (uploadError.message.includes("row-level security policy") || uploadError.message.includes("RLS")) {
				return {
					success: false,
					error: `RLS policy error: ${uploadError.message}. Please run 'npm run setup:storage' to set up the required policies, or configure them manually in Supabase Dashboard.`
				}
			} else {
				return {
					success: false,
					error: `Failed to upload image: ${uploadError.message}`
				}
			}
		}

		// Get public URL
		const { data: urlData } = supabase.storage
			.from(PROFILE_PICTURES_BUCKET)
			.getPublicUrl(filePath)

		const publicUrl = urlData.publicUrl

		// Update user record with new profile picture URL
		await prisma.user.update({
			where: { id: dbUser.id },
			data: {
				profilePicture: publicUrl
			}
		})

		revalidatePath("/settings")
		return {
			success: true,
			url: publicUrl
		}
	} catch (error: any) {
		console.error("Error uploading profile picture:", error)
		return {
			success: false,
			error: error.message || "Failed to upload profile picture"
		}
	}
}

export async function deleteProfilePicture() {
	try {
		const supabase = await createClient()
		const { data: { user }, error: authError } = await supabase.auth.getUser()

		if (authError || !user) {
			return {
				success: false,
				error: "Unauthorized"
			}
		}

		// Get user from database
		const dbUser = await prisma.user.findUnique({
			where: { supabase_id: user.id },
			select: { id: true, profilePicture: true }
		})

		if (!dbUser) {
			return {
				success: false,
				error: "User not found"
			}
		}

		if (!dbUser.profilePicture) {
			return {
				success: true
			}
		}

		// Delete file from storage
		try {
			const filePath = dbUser.profilePicture.split("/").pop()
			if (filePath) {
				await supabase.storage
					.from(PROFILE_PICTURES_BUCKET)
					.remove([filePath])
			}
		} catch (deleteError) {
			console.error("Error deleting profile picture from storage:", deleteError)
		}

		// Update user record
		await prisma.user.update({
			where: { id: dbUser.id },
			data: {
				profilePicture: null
			}
		})

		revalidatePath("/settings")
		return {
			success: true
		}
	} catch (error: any) {
		console.error("Error deleting profile picture:", error)
		return {
			success: false,
			error: error.message || "Failed to delete profile picture"
		}
	}
}


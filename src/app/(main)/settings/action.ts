"use server"

import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

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


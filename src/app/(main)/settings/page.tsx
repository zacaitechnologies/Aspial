"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "../contexts/SessionProvider"
import { updateProfile, changePassword } from "./action"
import { signout } from "@/lib/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PasswordInput } from "@/components/PasswordInput"
import { LogOut, User, Lock } from "lucide-react"

export default function SettingsPage() {
	const { enhancedUser } = useSession()
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	// Profile state
	const [firstName, setFirstName] = useState(
		enhancedUser?.profile?.firstName || ""
	)
	const [lastName, setLastName] = useState(
		enhancedUser?.profile?.lastName || ""
	)
	const [profileError, setProfileError] = useState("")
	const [profileSuccess, setProfileSuccess] = useState("")

	// Password state
	const [currentPassword, setCurrentPassword] = useState("")
	const [newPassword, setNewPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [passwordError, setPasswordError] = useState("")
	const [passwordSuccess, setPasswordSuccess] = useState("")

	const handleUpdateProfile = async (e: React.FormEvent) => {
		e.preventDefault()
		setProfileError("")
		setProfileSuccess("")

		if (!firstName || !lastName) {
			setProfileError("All fields are required")
			return
		}

		startTransition(async () => {
			const result = await updateProfile({
				firstName,
				lastName,
			})

			if (result.success) {
				setProfileSuccess("Profile updated successfully")
				router.refresh()
				setTimeout(() => setProfileSuccess(""), 3000)
			} else {
				setProfileError(result.error || "Failed to update profile")
			}
		})
	}

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault()
		setPasswordError("")
		setPasswordSuccess("")

		if (!currentPassword || !newPassword || !confirmPassword) {
			setPasswordError("All fields are required")
			return
		}

		if (newPassword !== confirmPassword) {
			setPasswordError("New passwords do not match")
			return
		}

		if (newPassword.length < 6) {
			setPasswordError("Password must be at least 6 characters")
			return
		}

		startTransition(async () => {
			const result = await changePassword({
				currentPassword,
				newPassword,
			})

			if (result.success) {
				setPasswordSuccess("Password changed successfully")
				setCurrentPassword("")
				setNewPassword("")
				setConfirmPassword("")
				setTimeout(() => setPasswordSuccess(""), 3000)
			} else {
				setPasswordError(result.error || "Failed to change password")
			}
		})
	}

	const handleLogout = () => {
		startTransition(async () => {
			await signout()
		})
	}

	return (
		<div className="container max-w-4xl mx-auto p-6 space-y-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">Settings</h1>
				<p className="text-muted-foreground">
					Manage your account settings and preferences
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<User className="w-5 h-5" />
						<CardTitle>Edit Profile</CardTitle>
					</div>
					<CardDescription>
						Update your personal information
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleUpdateProfile} className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="firstName">First Name</Label>
								<Input
									id="firstName"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
									disabled={isPending}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="lastName">Last Name</Label>
								<Input
									id="lastName"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									disabled={isPending}
									required
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={enhancedUser?.email || ""}
								disabled
								className="bg-muted cursor-not-allowed"
							/>
							<p className="text-xs text-muted-foreground">
								Email cannot be changed
							</p>
						</div>
						{profileError && (
							<div className="text-sm text-destructive">
								{profileError}
							</div>
						)}
						{profileSuccess && (
							<div className="text-sm text-green-600">
								{profileSuccess}
							</div>
						)}
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving..." : "Save Changes"}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Lock className="w-5 h-5" />
						<CardTitle>Change Password</CardTitle>
					</div>
					<CardDescription>
						Update your password to keep your account secure
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleChangePassword} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="currentPassword">
								Current Password
							</Label>
							<PasswordInput
								id="currentPassword"
								value={currentPassword}
								onChange={(e) =>
									setCurrentPassword(e.target.value)
								}
								disabled={isPending}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="newPassword">New Password</Label>
							<PasswordInput
								id="newPassword"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								disabled={isPending}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">
								Confirm New Password
							</Label>
							<PasswordInput
								id="confirmPassword"
								value={confirmPassword}
								onChange={(e) =>
									setConfirmPassword(e.target.value)
								}
								disabled={isPending}
								required
							/>
						</div>
						{passwordError && (
							<div className="text-sm text-destructive">
								{passwordError}
							</div>
						)}
						{passwordSuccess && (
							<div className="text-sm text-green-600">
								{passwordSuccess}
							</div>
						)}
						<Button type="submit" disabled={isPending}>
							{isPending ? "Changing..." : "Change Password"}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Account Actions</CardTitle>
					<CardDescription>
						Manage your account session
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Separator />
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Sign Out</p>
								<p className="text-sm text-muted-foreground">
									Sign out of your account
								</p>
							</div>
							<Button
								variant="destructive"
								onClick={handleLogout}
								disabled={isPending}
							>
								<LogOut className="w-4 h-4" />
								Log Out
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}


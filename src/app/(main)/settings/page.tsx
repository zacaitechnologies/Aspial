"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "../contexts/SessionProvider"
import { updateProfile, changePassword, uploadProfilePicture, deleteProfilePicture } from "./action"
import { signout } from "@/lib/auth-actions"
import { clearAllCachesOnLogout } from "@/lib/clear-all-cache"
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
import { LogOut, User, Lock, Upload, X, Image as ImageIcon } from "lucide-react"
import Image from "next/image"

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

	// Profile picture state
	const [profilePicture, setProfilePicture] = useState<string | null>(
		enhancedUser?.profile?.profilePicture || null
	)
	const [isUploadingPicture, setIsUploadingPicture] = useState(false)
	const [pictureError, setPictureError] = useState("")
	const [pictureSuccess, setPictureSuccess] = useState("")
	const fileInputRef = useRef<HTMLInputElement>(null)

	// Sync profile picture when user data updates
	useEffect(() => {
		setProfilePicture(enhancedUser?.profile?.profilePicture || null)
	}, [enhancedUser?.profile?.profilePicture])

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
		clearAllCachesOnLogout()
		startTransition(async () => {
			await signout()
		})
	}

	const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		// Validate file type
		if (!file.type.startsWith("image/")) {
			setPictureError("Please select an image file")
			return
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			setPictureError("File size must be less than 5MB")
			return
		}

		setPictureError("")
		setPictureSuccess("")
		setIsUploadingPicture(true)

		try {
			const formData = new FormData()
			formData.append("file", file)

			const result = await uploadProfilePicture(formData)

			if (result.success && result.url) {
				setProfilePicture(result.url)
				setPictureSuccess("Profile picture updated successfully")
				router.refresh()
				setTimeout(() => setPictureSuccess(""), 3000)
			} else {
				setPictureError(result.error || "Failed to upload profile picture")
			}
		} catch (error: any) {
			setPictureError(error.message || "Failed to upload profile picture")
		} finally {
			setIsUploadingPicture(false)
			if (fileInputRef.current) {
				fileInputRef.current.value = ""
			}
		}
	}

	const handleDeletePicture = async () => {
		setPictureError("")
		setPictureSuccess("")
		setIsUploadingPicture(true)

		try {
			const result = await deleteProfilePicture()

			if (result.success) {
				setProfilePicture(null)
				setPictureSuccess("Profile picture removed successfully")
				router.refresh()
				setTimeout(() => setPictureSuccess(""), 3000)
			} else {
				setPictureError(result.error || "Failed to delete profile picture")
			}
		} catch (error: any) {
			setPictureError(error.message || "Failed to delete profile picture")
		} finally {
			setIsUploadingPicture(false)
		}
	}

	const handleUploadClick = () => {
		fileInputRef.current?.click()
	}

	const getInitials = () => {
		const firstName = enhancedUser?.profile?.firstName || ""
		const lastName = enhancedUser?.profile?.lastName || ""
		const firstInitial = firstName.charAt(0).toUpperCase() || ""
		const lastInitial = lastName.charAt(0).toUpperCase() || ""
		return firstInitial + lastInitial || "U"
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
						<ImageIcon className="w-5 h-5" />
						<CardTitle>Profile Picture</CardTitle>
					</div>
					<CardDescription>
						Upload or update your profile picture
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center space-y-4">
						<div className="relative">
							<div className="w-32 h-32 rounded-full border-4 border-border flex items-center justify-center overflow-hidden bg-muted">
								{profilePicture ? (
									<Image
										src={profilePicture}
										alt="Profile picture"
										width={128}
										height={128}
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-3xl font-semibold">
										{getInitials()}
									</div>
								)}
							</div>
							{profilePicture && (
								<Button
									variant="destructive"
									size="icon"
									className="absolute -top-2 -right-2 w-8 h-8 rounded-full"
									onClick={handleDeletePicture}
									disabled={isUploadingPicture}
								>
									<X className="w-4 h-4" />
								</Button>
							)}
						</div>
						<div className="flex flex-col items-center space-y-2">
							<Button
								onClick={handleUploadClick}
								disabled={isUploadingPicture}
								variant="outline"
							>
								<Upload className="w-4 h-4 mr-2" />
								{isUploadingPicture
									? "Uploading..."
									: profilePicture
									? "Change Picture"
									: "Upload Picture"}
							</Button>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								onChange={handleFileSelect}
								className="hidden"
							/>
							<p className="text-xs text-muted-foreground text-center">
								JPG, PNG or GIF (max 5MB)
							</p>
						</div>
						{pictureError && (
							<div className="text-sm text-destructive text-center">
								{pictureError}
							</div>
						)}
						{pictureSuccess && (
							<div className="text-sm text-green-600 text-center">
								{pictureSuccess}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

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


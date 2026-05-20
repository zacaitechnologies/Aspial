"use client"

import { useState, useCallback } from "react"
import { useSession } from "../../contexts/SessionProvider"
import {
	getUserInvitations,
	acceptProjectInvitation,
	declineProjectInvitation,
	getAllInvitationsForAdmin,
} from "../../projects/permissions"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Check, X, Users, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import CustomServiceNotifications from "./CustomServiceNotifications"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { PENDING_INVITATIONS_UPDATED_EVENT } from "../constants"

type ProjectInvitation = {
	id: number
	projectId: number
	invitedBy: string
	invitedUser: string
	status: string
	canView: boolean
	canEdit: boolean
	isOwner: boolean
	createdAt: Date
	updatedAt: Date
	project: {
		id: number
		name: string
		description: string | null
		quotations: {
			id: number
			name: string
			totalPrice: number
		}[]
		createdByUser: {
			firstName: string
			lastName: string
			email: string
		}
	}
	inviter: {
		firstName: string
		lastName: string
		email: string
	}
	invitee?: {
		firstName: string
		lastName: string
		email: string
	}
}

type NotificationCustomService = {
	id: string
	name: string
	description: string
	price: number
	status: string
	createdAt: Date
	createdBy: { firstName: string; lastName: string; email: string }
	reviewedBy: { firstName: string; lastName: string } | null
	quotation: {
		id: number
		name: string
		Client: { name: string; company: string | null } | null
	}
	approvalComment: string | null
	rejectionComment: string | null
}

interface NotificationPageClientProps {
	initialInvitations: ProjectInvitation[]
	initialAllInvitations: ProjectInvitation[]
	initialPendingInvitations: ProjectInvitation[]
	initialCustomServices: NotificationCustomService[]
	isAdmin: boolean
	canReviewCustomServices: boolean
	canManageAllInvitations: boolean
}

export default function NotificationPageClient({
	initialInvitations,
	initialAllInvitations,
	initialPendingInvitations,
	initialCustomServices,
	isAdmin,
	canReviewCustomServices,
	canManageAllInvitations,
}: NotificationPageClientProps) {
	const { enhancedUser } = useSession()
	const [invitations, setInvitations] = useState(initialInvitations)
	const [allInvitations, setAllInvitations] = useState(initialAllInvitations)
	const [pendingInvitations, setPendingInvitations] = useState(initialPendingInvitations)
	const [deleteInvitationId, setDeleteInvitationId] = useState<number | null>(null)
	const [successMessage, setSuccessMessage] = useState<string>("")
	const [errorMessage, setErrorMessage] = useState<string>("")
	const [processingInvitationId, setProcessingInvitationId] = useState<number | null>(null)
	const [processingAction, setProcessingAction] = useState<"accept" | "decline" | null>(null)

	const myInvitations = invitations

	const notifyPendingInvitationsUpdated = useCallback(() => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(new Event(PENDING_INVITATIONS_UPDATED_EVENT))
		}
	}, [])

	// Refresh invitations via direct callback (not useEffect)
	const handleRefreshInvitations = useCallback(async () => {
		if (!enhancedUser?.id) {
			setInvitations([])
			return
		}

		try {
			const data = await getUserInvitations(enhancedUser.id)
			setInvitations(data as unknown as ProjectInvitation[])

			if (canManageAllInvitations) {
				const allData = await getAllInvitationsForAdmin()
				setAllInvitations(allData as ProjectInvitation[])
				setPendingInvitations(
					(allData as ProjectInvitation[]).filter((inv) => inv.status === "pending")
				)
			} else if (isAdmin) {
				setAllInvitations(data as unknown as ProjectInvitation[])
			}
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Failed to fetch invitations:", error)
			}
			setInvitations([])
		}
	}, [enhancedUser?.id, isAdmin, canManageAllInvitations])

	const handleAcceptInvitation = useCallback(async (invitationId: number) => {
		setSuccessMessage("")
		setErrorMessage("")
		setProcessingInvitationId(invitationId)
		setProcessingAction("accept")
		
		try {
			await acceptProjectInvitation(invitationId)
			await handleRefreshInvitations()
			notifyPendingInvitationsUpdated()
			setSuccessMessage("Invitation accepted! You can now access the project.")
			setTimeout(() => {
				setSuccessMessage("")
			}, 3000)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error accepting invitation:", error)
			}
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to accept invitation. Please try again."
			)
		} finally {
			setProcessingInvitationId(null)
			setProcessingAction(null)
		}
	}, [handleRefreshInvitations, notifyPendingInvitationsUpdated])

	const handleDeclineInvitation = useCallback(async (invitationId: number) => {
		setSuccessMessage("")
		setErrorMessage("")
		setProcessingInvitationId(invitationId)
		setProcessingAction("decline")
		
		try {
			await declineProjectInvitation(invitationId)
			await handleRefreshInvitations()
			notifyPendingInvitationsUpdated()
			setSuccessMessage("Invitation declined.")
			setTimeout(() => {
				setSuccessMessage("")
			}, 3000)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error declining invitation:", error)
			}
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to decline invitation. Please try again."
			)
		} finally {
			setProcessingInvitationId(null)
			setProcessingAction(null)
		}
	}, [handleRefreshInvitations, notifyPendingInvitationsUpdated])

	const handleAdminAcceptInvitation = useCallback(async (invitationId: number) => {
		setSuccessMessage("")
		setErrorMessage("")
		setProcessingInvitationId(invitationId)
		setProcessingAction("accept")
		
		try {
			await acceptProjectInvitation(invitationId)
			await handleRefreshInvitations()
			notifyPendingInvitationsUpdated()
			setSuccessMessage("Invitation accepted by admin!")
			setTimeout(() => {
				setSuccessMessage("")
			}, 3000)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error accepting invitation as admin:", error)
			}
			setErrorMessage("Failed to accept invitation. Please try again.")
		} finally {
			setProcessingInvitationId(null)
			setProcessingAction(null)
		}
	}, [handleRefreshInvitations, notifyPendingInvitationsUpdated])

	const handleAdminDeclineInvitation = useCallback(async (invitationId: number) => {
		setSuccessMessage("")
		setErrorMessage("")
		setProcessingInvitationId(invitationId)
		setProcessingAction("decline")
		
		try {
			await declineProjectInvitation(invitationId)
			await handleRefreshInvitations()
			notifyPendingInvitationsUpdated()
			setSuccessMessage("Invitation declined by admin!")
			setTimeout(() => {
				setSuccessMessage("")
			}, 3000)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error declining invitation as admin:", error)
			}
			setErrorMessage("Failed to decline invitation. Please try again.")
		} finally {
			setProcessingInvitationId(null)
			setProcessingAction(null)
		}
	}, [handleRefreshInvitations, notifyPendingInvitationsUpdated])

	const handleAdminDeleteInvitation = useCallback((invitationId: number) => {
		setSuccessMessage("")
		setErrorMessage("")
		setDeleteInvitationId(invitationId)
	}, [])

	const confirmDeleteInvitation = useCallback(async () => {
		if (!deleteInvitationId) return
		
		try {
			await declineProjectInvitation(deleteInvitationId)
			setDeleteInvitationId(null)
			await handleRefreshInvitations()
			notifyPendingInvitationsUpdated()
			toast({
				title: "Success",
				description: "Invitation deleted successfully.",
			})
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Error deleting invitation:", error)
			}
			toast({
				title: "Error",
				description: "Failed to delete invitation. Please try again.",
				variant: "destructive",
			})
		}
	}, [deleteInvitationId, handleRefreshInvitations, notifyPendingInvitationsUpdated])

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "pending":
				return <Badge variant="secondary">Pending</Badge>
			case "accepted":
				return <Badge variant="default">Accepted</Badge>
			case "declined":
				return <Badge variant="destructive">Declined</Badge>
			case "expired":
				return <Badge variant="outline">Expired</Badge>
			case "removed":
				return <Badge variant="destructive">Removed</Badge>
			default:
				return <Badge variant="outline">{status}</Badge>
		}
	}

	const getPermissionBadges = (invitation: ProjectInvitation) => {
		const badges = []
		if (invitation.canView) badges.push(<Badge key="view" variant="outline" className="text-xs">View</Badge>)
		if (invitation.canEdit) badges.push(<Badge key="edit" variant="outline" className="text-xs">Edit</Badge>)
		if (invitation.isOwner) badges.push(<Badge key="owner" variant="default" className="text-xs">Owner</Badge>)
		return badges
	}

	return (
		<div className="container mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-3xl font-bold flex items-center gap-2">
					<Bell className="w-8 h-8" />
					Notifications
				</h1>
				<p className="text-muted-foreground mt-2">
					{canManageAllInvitations
						? "Manage project invitations and custom service requests"
						: "View your project invitations and custom service requests"}
				</p>
			</div>

			{/* Success/Error Messages */}
			{successMessage && (
				<Alert className="bg-green-50 border-green-200 text-green-800 mb-4">
					<CheckCircle2 className="h-4 w-4" />
					<AlertTitle>Success</AlertTitle>
					<AlertDescription>{successMessage}</AlertDescription>
				</Alert>
			)}
			{errorMessage && (
				<Alert variant="destructive" className="bg-red-50 border-red-200 mb-4">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			)}

			{canManageAllInvitations ? (
				<Tabs defaultValue="invitations" className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="invitations">Project Invitations</TabsTrigger>
						<TabsTrigger value="custom-services">Custom Services</TabsTrigger>
					</TabsList>

					<TabsContent value="invitations" className="space-y-4">
						<div className="flex items-center gap-2 mb-4">
							<Bell className="w-5 h-5" />
							<h2 className="text-xl font-semibold">All Project Invitations</h2>
							<Badge variant="secondary">{allInvitations.length}</Badge>
							<Badge variant="default" className="ml-2">
								{pendingInvitations.length} Pending
							</Badge>
						</div>
						
						{allInvitations.length === 0 ? (
							<Card>
								<CardContent className="p-6 text-center">
									<Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
									<p className="text-muted-foreground">No invitation history found.</p>
								</CardContent>
							</Card>
						) : (
							allInvitations.map((invitation) => (
								<Card key={invitation.id} className="p-4">
									<CardHeader className="pb-3">
										<div className="flex justify-between items-start">
											<div>
												<CardTitle className="text-lg">{invitation.project.name}</CardTitle>
												<CardDescription>
													{invitation.inviter.firstName} {invitation.inviter.lastName} invited {invitation.invitee?.firstName} {invitation.invitee?.lastName}
												</CardDescription>
											</div>
											{getStatusBadge(invitation.status)}
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<h4 className="font-medium mb-2">Project Details</h4>
												<div className="space-y-1 text-sm">
													<p>
														<strong>Project:</strong> {invitation.project.name}
													</p>
													<p>
														<strong>Value:</strong> RM
														{invitation.project.quotations[0]?.totalPrice.toFixed(2) || '0.00'}
													</p>
													<p>
														<strong>Inviter:</strong> {invitation.inviter.firstName} {invitation.inviter.lastName}
													</p>
													<p>
														<strong>Invitee:</strong> {invitation.invitee?.firstName} {invitation.invitee?.lastName}
													</p>
												</div>
											</div>
											<div>
												<h4 className="font-medium mb-2">Permissions</h4>
												<div className="flex flex-wrap gap-1 mb-2">
													{getPermissionBadges(invitation)}
												</div>
												<p className="text-sm text-muted-foreground">
													<strong>Invited:</strong> {new Date(invitation.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
												</p>
												<p className="text-sm text-muted-foreground">
													<strong>Updated:</strong> {new Date(invitation.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
												</p>
											</div>
										</div>

										{invitation.status === "removed" && (
											<div className="border-t pt-4 mt-4">
												<Alert variant="destructive">
													<AlertCircle className="h-4 w-4" />
													<AlertTitle>User Removed from Project</AlertTitle>
													<AlertDescription>
														{invitation.invitee?.firstName} {invitation.invitee?.lastName} was removed from this project by {invitation.inviter.firstName} {invitation.inviter.lastName}.
													</AlertDescription>
												</Alert>
											</div>
										)}

										{invitation.status === "pending" && (
											<div className="flex gap-2 border-t pt-4">
												<Button
													onClick={() => handleAdminAcceptInvitation(invitation.id)}
													className="flex-1"
													disabled={processingInvitationId === invitation.id}
												>
													{processingInvitationId === invitation.id && processingAction === "accept" ? (
														<Loader2 className="w-4 h-4 mr-2 animate-spin" />
													) : (
														<Check className="w-4 h-4 mr-2" />
													)}
													{processingInvitationId === invitation.id && processingAction === "accept" ? "Accepting..." : "Accept as Admin"}
												</Button>
												<Button
													variant="outline"
													onClick={() => handleAdminDeclineInvitation(invitation.id)}
													className="flex-1"
													disabled={processingInvitationId === invitation.id}
												>
													{processingInvitationId === invitation.id && processingAction === "decline" ? (
														<Loader2 className="w-4 h-4 mr-2 animate-spin" />
													) : (
														<X className="w-4 h-4 mr-2" />
													)}
													{processingInvitationId === invitation.id && processingAction === "decline" ? "Declining..." : "Decline as Admin"}
												</Button>
												<Button
													variant="destructive"
													onClick={() => handleAdminDeleteInvitation(invitation.id)}
													size="sm"
													disabled={processingInvitationId === invitation.id}
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											</div>
										)}
									</CardContent>
								</Card>
							))
						)}
					</TabsContent>

					<TabsContent value="custom-services" className="space-y-4">
						<CustomServiceNotifications
							userId={enhancedUser?.id || ""}
							initialServices={initialCustomServices}
							canReviewCustomServices={canReviewCustomServices}
						/>
					</TabsContent>
				</Tabs>
			) : (
				<Tabs defaultValue="invitations" className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="invitations">Project Invitations</TabsTrigger>
						<TabsTrigger value="custom-services">My Custom Services</TabsTrigger>
					</TabsList>

					<TabsContent value="invitations" className="space-y-4">
						<div className="flex items-center gap-2 mb-4">
							<Users className="w-5 h-5" />
							<h2 className="text-xl font-semibold">My Project Invitations</h2>
							<Badge variant="secondary">{myInvitations.length}</Badge>
						</div>
						
						{myInvitations.length === 0 ? (
							<Card>
								<CardContent className="p-6 text-center">
									<Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
									<p className="text-muted-foreground">
										You don&apos;t have any project invitations sent to you or by you.
									</p>
								</CardContent>
							</Card>
						) : (
							myInvitations.map((invitation) => {
								const isIncoming =
									enhancedUser?.id != null &&
									invitation.invitedUser === enhancedUser.id
								const isOutgoing =
									enhancedUser?.id != null &&
									invitation.invitedBy === enhancedUser.id

								return (
								<Card key={invitation.id} className="p-4">
									<CardHeader className="pb-3">
										<div className="flex justify-between items-start">
											<div>
												<CardTitle className="text-lg">{invitation.project.name}</CardTitle>
												<CardDescription>
													{isIncoming && !isOutgoing && (
														<>
															Received — invited by {invitation.inviter.firstName}{" "}
															{invitation.inviter.lastName}
														</>
													)}
													{isOutgoing && !isIncoming && invitation.invitee && (
														<>
															Sent — invited {invitation.invitee.firstName}{" "}
															{invitation.invitee.lastName}
														</>
													)}
													{isIncoming && isOutgoing && (
														<>Project invitation</>
													)}
												</CardDescription>
											</div>
											{getStatusBadge(invitation.status)}
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<h4 className="font-medium mb-2">Project Details</h4>
												<div className="space-y-1 text-sm">
													<p>
														<strong>Project:</strong> {invitation.project.name}
													</p>
													{invitation.project.description && (
														<p>
															<strong>Description:</strong>{" "}
															{invitation.project.description}
														</p>
													)}
													<p>
														<strong>Value:</strong> RM
														{invitation.project.quotations[0]?.totalPrice.toFixed(2) || '0.00'}
													</p>
													<p>
														<strong>Created by:</strong>{" "}
														{invitation.project.createdByUser.firstName}{" "}
														{invitation.project.createdByUser.lastName}
													</p>
												</div>
											</div>
											<div>
												<h4 className="font-medium mb-2">Permissions</h4>
												<div className="flex flex-wrap gap-1 mb-2">
													{getPermissionBadges(invitation)}
												</div>
												<p className="text-sm text-muted-foreground">
													<strong>Invited:</strong> {new Date(invitation.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
												</p>
											</div>
										</div>

										{invitation.status === "removed" && isIncoming && (
											<div className="border-t pt-4 mt-4">
												<Alert variant="destructive">
													<AlertCircle className="h-4 w-4" />
													<AlertTitle>Removed from Project</AlertTitle>
													<AlertDescription>
														You have been removed from this project by {invitation.inviter.firstName} {invitation.inviter.lastName}. 
														You no longer have access to this project.
													</AlertDescription>
												</Alert>
											</div>
										)}

										{invitation.status === "pending" && isOutgoing && !isIncoming && (
											<p className="text-sm text-muted-foreground border-t pt-4">
												Waiting for {invitation.invitee?.firstName}{" "}
												{invitation.invitee?.lastName} to respond.
											</p>
										)}

										{invitation.status === "pending" && isIncoming && (
											<div className="flex gap-2">
												<Button
													onClick={() => handleAcceptInvitation(invitation.id)}
													className="flex-1"
													disabled={processingInvitationId === invitation.id}
												>
													{processingInvitationId === invitation.id && processingAction === "accept" ? (
														<Loader2 className="w-4 h-4 mr-2 animate-spin" />
													) : (
														<Check className="w-4 h-4 mr-2" />
													)}
													{processingInvitationId === invitation.id && processingAction === "accept" ? "Accepting..." : "Accept"}
												</Button>
												<Button
													variant="outline"
													onClick={() => handleDeclineInvitation(invitation.id)}
													className="flex-1"
													disabled={processingInvitationId === invitation.id}
												>
													{processingInvitationId === invitation.id && processingAction === "decline" ? (
														<Loader2 className="w-4 h-4 mr-2 animate-spin" />
													) : (
														<X className="w-4 h-4 mr-2" />
													)}
													{processingInvitationId === invitation.id && processingAction === "decline" ? "Declining..." : "Decline"}
												</Button>
											</div>
										)}
									</CardContent>
								</Card>
							)})
						)}
					</TabsContent>

					<TabsContent value="custom-services" className="space-y-4">
						<CustomServiceNotifications
							userId={enhancedUser?.id || ""}
							initialServices={initialCustomServices}
							canReviewCustomServices={canReviewCustomServices}
						/>
					</TabsContent>
				</Tabs>
			)}

			<ConfirmationDialog
				isOpen={deleteInvitationId !== null}
				onClose={() => setDeleteInvitationId(null)}
				onConfirm={confirmDeleteInvitation}
				title="Delete Invitation"
				description="Are you sure you want to delete this invitation? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
			/>
		</div>
	)
}

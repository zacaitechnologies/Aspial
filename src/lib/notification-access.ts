import { getCachedUser } from "@/lib/auth-cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"

/** Thrown when a notification action is not allowed for the current user. */
export class NotificationAccessError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message)
    this.name = "NotificationAccessError"
  }
}

export type AuthenticatedActor = {
  userId: string
  isAdmin: boolean
}

/** Resolve the current Supabase user id and admin flag from the session. */
export async function getAuthenticatedActor(): Promise<AuthenticatedActor> {
  const user = await getCachedUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  return { userId: user.id, isAdmin }
}

/** Requires an authenticated admin; throws otherwise. */
export async function requireNotificationAdmin(): Promise<AuthenticatedActor> {
  const actor = await getAuthenticatedActor()
  if (!actor.isAdmin) {
    throw new NotificationAccessError("Admin access required.")
  }
  return actor
}

/**
 * Non-admins may only act as themselves. Admins may optionally target another user
 * when loading data on their behalf (not used for invitations).
 */
export function resolveSelfOrAdminTarget(
  actor: AuthenticatedActor,
  requestedUserId: string | undefined
): string {
  if (!requestedUserId || requestedUserId === actor.userId) {
    return actor.userId
  }
  if (!actor.isAdmin) {
    throw new NotificationAccessError(
      "You can only access your own notifications."
    )
  }
  return requestedUserId
}

export function assertInvitationRecipient(
  invitation: { invitedUser: string },
  actor: AuthenticatedActor,
  action: "view" | "accept" | "decline"
): void {
  if (actor.isAdmin) return
  if (invitation.invitedUser !== actor.userId) {
    const verb =
      action === "view"
        ? "view"
        : action === "accept"
          ? "accept"
          : "decline"
    throw new NotificationAccessError(
      `You can only ${verb} project invitations that were sent to you.`
    )
  }
}

export function assertCustomServiceRequester(
  record: { createdById: string },
  actor: AuthenticatedActor
): void {
  if (actor.isAdmin) return
  if (record.createdById !== actor.userId) {
    throw new NotificationAccessError(
      "You can only view custom service requests that you submitted."
    )
  }
}

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const NO_PROJECT_SENTINEL_NAME = "__NO_PROJECT__"

/** Exclude the internal time-tracking placeholder from user-facing project lists. */
export const excludeNoProjectSentinelWhere: Prisma.ProjectWhereInput = {
  name: { not: NO_PROJECT_SENTINEL_NAME },
}
/** Internal client record required by Project.clientId for the No-Project placeholder. */
export const SYSTEM_CLIENT_NAME = "__SYSTEM__"
export const SYSTEM_CLIENT_EMAIL = "system@aspial.local"
/** User-facing label for the internal system client placeholder. */
export const SYSTEM_CLIENT_DISPLAY_LABEL = "NO CLIENT"

export function formatProjectClientLabel(
	clientName: string | null | undefined
): string | null {
	if (!clientName) return null
	if (clientName === SYSTEM_CLIENT_NAME) return SYSTEM_CLIENT_DISPLAY_LABEL
	return clientName
}

export function formatProjectOptionLabel(
	projectName: string,
	clientName: string | null | undefined
): string {
	const displayClient = formatProjectClientLabel(clientName)
	return displayClient ? `${projectName} (${displayClient})` : projectName
}

/** Exclude the internal system client from user-facing client lists and selectors. */
export const excludeSystemClientWhere: Prisma.ClientWhereInput = {
  NOT: {
    name: SYSTEM_CLIENT_NAME,
    email: SYSTEM_CLIENT_EMAIL,
  },
}

/** Merge user-facing client filters with the system-client exclusion. */
export function withExcludedSystemClient(
  where: Prisma.ClientWhereInput = {}
): Prisma.ClientWhereInput {
  if (Object.keys(where).length === 0) return excludeSystemClientWhere
  return { AND: [excludeSystemClientWhere, where] }
}

let cachedNoProjectId: number | null = null

type BootstrapUser = { id: string; supabase_id: string }

async function pickBootstrapUser(): Promise<BootstrapUser> {
  const adminUser = await prisma.user.findFirst({
    where: {
      userRoles: { some: { role: { slug: "admin" } } },
    },
    select: { id: true, supabase_id: true },
  })
  if (adminUser) return adminUser

  const anyUser = await prisma.user.findFirst({
    select: { id: true, supabase_id: true },
  })
  if (!anyUser) {
    throw new Error("Cannot create No-Project placeholder: no users in the database yet.")
  }
  return anyUser
}

/** Internal client used when a project has no customer assigned (same record as the No-Project placeholder). */
export async function getOrCreateSystemClient(): Promise<{ id: string; name: string }> {
  const bootstrapUser = await pickBootstrapUser()
  const id = await getOrCreateSystemClientId(bootstrapUser.id)
  return { id, name: SYSTEM_CLIENT_NAME }
}

async function getOrCreateSystemClientId(createdByUserId: string): Promise<string> {
  const existing = await prisma.client.findFirst({
    where: { name: SYSTEM_CLIENT_NAME, email: SYSTEM_CLIENT_EMAIL },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prisma.client.create({
    data: {
      name: SYSTEM_CLIENT_NAME,
      email: SYSTEM_CLIENT_EMAIL,
      createdById: createdByUserId,
    },
    select: { id: true },
  })
  return created.id
}

export async function getOrCreateNoProjectId(): Promise<number> {
  if (cachedNoProjectId !== null) return cachedNoProjectId

  const existing = await prisma.project.findFirst({
    where: { name: NO_PROJECT_SENTINEL_NAME },
    select: { id: true },
  })
  if (existing) {
    cachedNoProjectId = existing.id
    return cachedNoProjectId
  }

  const bootstrapUser = await pickBootstrapUser()
  const clientId = await getOrCreateSystemClientId(bootstrapUser.id)
  const now = new Date()

  const created = await prisma.project.create({
    data: {
      name: NO_PROJECT_SENTINEL_NAME,
      description: "Internal placeholder for time entries with no project selected.",
      status: "planning",
      startDate: now,
      endDate: now,
      createdBy: bootstrapUser.supabase_id,
      clientId,
      clientName: SYSTEM_CLIENT_NAME,
    },
    select: { id: true },
  })
  cachedNoProjectId = created.id
  return cachedNoProjectId
}

export async function getNoProjectIdOrNull(): Promise<number | null> {
  if (cachedNoProjectId !== null) return cachedNoProjectId
  const existing = await prisma.project.findFirst({
    where: { name: NO_PROJECT_SENTINEL_NAME },
    select: { id: true },
  })
  if (existing) {
    cachedNoProjectId = existing.id
    return cachedNoProjectId
  }
  return null
}

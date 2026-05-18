"use server"

import { prisma } from "@/lib/prisma"

export const NO_PROJECT_SENTINEL_NAME = "__NO_PROJECT__"
const SYSTEM_CLIENT_NAME = "__SYSTEM__"
const SYSTEM_CLIENT_EMAIL = "system@aspial.local"

let cachedNoProjectId: number | null = null

async function pickBootstrapUserSupabaseId(): Promise<string> {
  const adminUser = await prisma.user.findFirst({
    where: {
      userRoles: { some: { role: { slug: "admin" } } },
    },
    select: { supabase_id: true },
  })
  if (adminUser) return adminUser.supabase_id

  const anyUser = await prisma.user.findFirst({
    select: { supabase_id: true },
  })
  if (!anyUser) {
    throw new Error("Cannot create No-Project placeholder: no users in the database yet.")
  }
  return anyUser.supabase_id
}

async function getOrCreateSystemClientId(bootstrapUserSupabaseId: string): Promise<string> {
  const existing = await prisma.client.findFirst({
    where: { name: SYSTEM_CLIENT_NAME, email: SYSTEM_CLIENT_EMAIL },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prisma.client.create({
    data: {
      name: SYSTEM_CLIENT_NAME,
      email: SYSTEM_CLIENT_EMAIL,
      createdById: bootstrapUserSupabaseId,
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

  const bootstrapUserSupabaseId = await pickBootstrapUserSupabaseId()
  const clientId = await getOrCreateSystemClientId(bootstrapUserSupabaseId)
  const now = new Date()

  const created = await prisma.project.create({
    data: {
      name: NO_PROJECT_SENTINEL_NAME,
      description: "Internal placeholder for time entries with no project selected.",
      status: "planning",
      startDate: now,
      endDate: now,
      createdBy: bootstrapUserSupabaseId,
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

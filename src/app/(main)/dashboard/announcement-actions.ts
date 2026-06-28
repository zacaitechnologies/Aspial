"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { SupabaseClient } from "@supabase/supabase-js"
import { checkIsAdmin } from "../actions/admin-actions"
import { parseDateInBusinessTZ } from "@/lib/date-utils"
import type {
  AnnouncementDTO,
  AnnouncementStatus,
  CreateAnnouncementData,
  UpdateAnnouncementData,
} from "./announcement-types"

const ANNOUNCEMENTS_BUCKET = "announcements"
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

/** Build the public URL for a stored object key (no network round-trip). */
function publicUrlFor(supabase: SupabaseClient, key: string | null | undefined): string | null {
  if (!key) return null
  const { data } = supabase.storage.from(ANNOUNCEMENTS_BUCKET).getPublicUrl(key)
  return data?.publicUrl ?? null
}

/** Interpret a "YYYY-MM-DD" calendar day in business TZ; start = 00:00:00. */
function toStartInstant(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  return parseDateInBusinessTZ(`${dateStr}T00:00:00`)
}

/** Interpret a "YYYY-MM-DD" calendar day in business TZ; end = 23:59:59. */
function toEndInstant(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  return parseDateInBusinessTZ(`${dateStr}T23:59:59`)
}

function transformAnnouncement(row: any, supabase: SupabaseClient): AnnouncementDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    bannerType: row.bannerType,
    imageUrl: row.bannerType === "image" ? publicUrlFor(supabase, row.imageUrl) : null,
    templateKey: row.templateKey ?? null,
    status: row.status,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    sortOrder: row.sortOrder,
    createdById: row.createdById,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/** Re-check admin from the session; throws if not an authenticated admin. */
async function requireAdmin(): Promise<{ userId: string }> {
  const user = await getCachedUser()
  if (!user?.id) throw new Error("Unauthorized")
  const isAdmin = await checkIsAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized: Admin access required")
  return { userId: user.id }
}

/**
 * Active announcements for the dashboard slideshow — visible to every
 * authenticated user. Filtered by status + start/expiry window at query time.
 */
export async function getActiveAnnouncements(): Promise<AnnouncementDTO[]> {
  const user = await getCachedUser()
  if (!user?.id) return []

  const now = new Date()
  const rows = await prisma.announcement.findMany({
    where: {
      status: "active",
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { created_at: "desc" }],
  })

  const supabase = await createClient()
  return rows.map((row) => transformAnnouncement(row, supabase))
}

/** Every announcement regardless of status/window — admin management view. */
export async function getAllAnnouncementsForAdmin(): Promise<AnnouncementDTO[]> {
  await requireAdmin()

  const rows = await prisma.announcement.findMany({
    orderBy: [{ sortOrder: "asc" }, { created_at: "desc" }],
  })

  const supabase = await createClient()
  return rows.map((row) => transformAnnouncement(row, supabase))
}

export async function createAnnouncement(
  data: CreateAnnouncementData
): Promise<AnnouncementDTO> {
  const { userId } = await requireAdmin()

  if (!data.title?.trim()) throw new Error("Title is required")
  if (!data.description?.trim()) throw new Error("Description is required")

  const isTemplate = data.bannerType === "template"

  const row = await prisma.announcement.create({
    data: {
      title: data.title.trim(),
      description: data.description.trim(),
      bannerType: data.bannerType,
      templateKey: isTemplate ? (data.templateKey ?? "gradientGreen") : null,
      imageUrl: null,
      status: data.status ?? "draft",
      startDate: toStartInstant(data.startDate),
      endDate: toEndInstant(data.endDate),
      sortOrder: data.sortOrder ?? 0,
      createdById: userId,
    },
  })

  revalidatePath("/dashboard")
  const supabase = await createClient()
  return transformAnnouncement(row, supabase)
}

export async function updateAnnouncement(
  id: string,
  data: UpdateAnnouncementData
): Promise<AnnouncementDTO> {
  await requireAdmin()

  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) throw new Error("Announcement not found")

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.description !== undefined) updateData.description = data.description.trim()
  if (data.status !== undefined) updateData.status = data.status
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
  if (data.startDate !== undefined) updateData.startDate = toStartInstant(data.startDate)
  if (data.endDate !== undefined) updateData.endDate = toEndInstant(data.endDate)

  if (data.bannerType !== undefined) {
    updateData.bannerType = data.bannerType
    if (data.bannerType === "template") {
      // Switching to a template banner — drop any uploaded image.
      updateData.templateKey = data.templateKey ?? existing.templateKey ?? "gradientGreen"
      updateData.imageUrl = null
      if (existing.imageUrl) {
        const supabase = await createClient()
        await supabase.storage
          .from(ANNOUNCEMENTS_BUCKET)
          .remove([existing.imageUrl])
          .catch(() => {
            /* best effort */
          })
      }
    } else {
      updateData.templateKey = null
    }
  } else if (data.templateKey !== undefined) {
    updateData.templateKey = data.templateKey
  }

  const row = await prisma.announcement.update({ where: { id }, data: updateData })

  revalidatePath("/dashboard")
  const supabase = await createClient()
  return transformAnnouncement(row, supabase)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await requireAdmin()

  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) return

  if (existing.imageUrl) {
    const supabase = await createClient()
    await supabase.storage
      .from(ANNOUNCEMENTS_BUCKET)
      .remove([existing.imageUrl])
      .catch(() => {
        /* best effort */
      })
  }

  await prisma.announcement.delete({ where: { id } })
  revalidatePath("/dashboard")
}

/** Bulk draft / activate / deactivate — the core multi-select admin action. */
export async function bulkUpdateAnnouncementStatus(
  ids: string[],
  status: AnnouncementStatus
): Promise<{ count: number }> {
  await requireAdmin()
  if (!ids.length) return { count: 0 }

  const result = await prisma.announcement.updateMany({
    where: { id: { in: ids } },
    data: { status },
  })

  revalidatePath("/dashboard")
  return { count: result.count }
}

/** Persist a new slideshow order (lower sortOrder shows first). */
export async function reorderAnnouncements(orderedIds: string[]): Promise<void> {
  await requireAdmin()

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.announcement.update({ where: { id }, data: { sortOrder: index } })
    )
  )

  revalidatePath("/dashboard")
}

/**
 * Upload (or replace) the banner image for an announcement. Mirrors the
 * service-image upload flow: validate, push to the public bucket, drop the
 * previous object, persist the storage key, and mark the banner as image type.
 */
export async function uploadAnnouncementImage(
  announcementId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; imageKey?: string }> {
  try {
    const user = await getCachedUser()
    if (!user?.id) return { success: false, error: "Unauthorized" }
    const isAdmin = await checkIsAdmin(user.id)
    if (!isAdmin) return { success: false, error: "Unauthorized: Admin access required" }

    const supabase = await createClient()
    const {
      data: { user: sessionUser },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !sessionUser || sessionUser.id !== user.id) {
      return { success: false, error: "User not authenticated. Please log in again." }
    }

    const file = formData.get("file") as File | null
    if (!file) return { success: false, error: "No file provided" }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { success: false, error: "Invalid file type. Use JPEG, PNG, GIF, or WebP." }
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { success: false, error: "File size exceeds 5MB limit" }
    }

    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { imageUrl: true },
    })
    if (!existing) return { success: false, error: "Announcement not found" }

    const fileExtension = file.name.split(".").pop() || "jpg"
    const fileName = `announcement-${announcementId}-${Date.now()}.${fileExtension}`

    const { error: uploadError } = await supabase.storage
      .from(ANNOUNCEMENTS_BUCKET)
      .upload(fileName, file, { cacheControl: "3600", upsert: false })

    if (uploadError) {
      if (uploadError.message.includes("Bucket not found")) {
        return {
          success: false,
          error: `Bucket '${ANNOUNCEMENTS_BUCKET}' not found. Run: npm run setup:storage -- announcements`,
        }
      }
      return { success: false, error: `Failed to upload image: ${uploadError.message}` }
    }

    if (existing.imageUrl && existing.imageUrl !== fileName) {
      await supabase.storage
        .from(ANNOUNCEMENTS_BUCKET)
        .remove([existing.imageUrl])
        .catch(() => {
          /* best effort */
        })
    }

    await prisma.announcement.update({
      where: { id: announcementId },
      data: { imageUrl: fileName, bannerType: "image", templateKey: null },
    })

    revalidatePath("/dashboard")
    return { success: true, imageKey: fileName }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: message }
  }
}

// Types for the dashboard announcements feature.
// String-literal unions mirror the Prisma enums (announcements migration).

export type AnnouncementBannerType = "image" | "template"
export type AnnouncementStatus = "draft" | "active" | "inactive"
export type AnnouncementTemplate = "gradientGreen" | "creamGold" | "spotlightAccent"

/** Built-in banner templates (keep in sync with AnnouncementTemplateBanner). */
export const ANNOUNCEMENT_TEMPLATE_KEYS: AnnouncementTemplate[] = [
  "gradientGreen",
  "creamGold",
  "spotlightAccent",
]

export const ANNOUNCEMENT_TEMPLATE_LABELS: Record<AnnouncementTemplate, string> = {
  gradientGreen: "Executive",
  creamGold: "Light",
  spotlightAccent: "Spotlight",
}

/** Recommended banner aspect ratio for uploaded images (ultra-wide hero). */
export const ANNOUNCEMENT_IMAGE_ASPECT = 21 / 9
export const ANNOUNCEMENT_IMAGE_RATIO_LABEL = "21:9 (recommended ~1680×720)"

/**
 * Serializable announcement shape passed from server actions to client
 * components. Dates are ISO strings and `imageUrl` is a resolved public URL
 * (never the raw storage object key) so the slideshow can render it directly.
 */
export type AnnouncementDTO = {
  id: string
  title: string
  description: string
  bannerType: AnnouncementBannerType
  /** Resolved public URL of the banner image, or null for template banners. */
  imageUrl: string | null
  templateKey: AnnouncementTemplate | null
  status: AnnouncementStatus
  /** ISO string (UTC instant) or null when no window bound is set. */
  startDate: string | null
  endDate: string | null
  sortOrder: number
  createdById: string
  createdAt: string
  updatedAt: string
}

/**
 * Payload for creating an announcement. `startDate`/`endDate` are calendar-day
 * strings ("YYYY-MM-DD") interpreted in the business timezone (start = 00:00,
 * end = 23:59:59); null means unbounded.
 */
export type CreateAnnouncementData = {
  title: string
  description: string
  bannerType: AnnouncementBannerType
  templateKey?: AnnouncementTemplate | null
  status?: AnnouncementStatus
  startDate?: string | null
  endDate?: string | null
  sortOrder?: number
}

export type UpdateAnnouncementData = Partial<CreateAnnouncementData>

"use client"

import { cn } from "@/lib/utils"
import type { AnnouncementTemplate } from "../../announcement-types"

interface AnnouncementTemplateBannerProps {
  templateKey: AnnouncementTemplate
  title: string
  description: string
  /** Compact rendering for thumbnails / pickers (smaller type, no eyebrow). */
  compact?: boolean
  className?: string
}

/**
 * Pure presentational banner for template announcements. Fills its parent
 * (which controls the aspect ratio). Three brand-themed designs keyed by
 * `templateKey`. Reused by slides, the detail dialog, and the form preview.
 */
export function AnnouncementTemplateBanner({
  templateKey,
  title,
  description,
  compact = false,
  className,
}: AnnouncementTemplateBannerProps) {
  const titleText = title.trim() || "Announcement title"
  const descText = description.trim() || "Announcement description goes here."

  if (templateKey === "creamGold") {
    return (
      <div
        className={cn(
          "relative flex h-full w-full flex-col justify-center overflow-hidden bg-background",
          "border border-[#e3bb69]/40",
          compact ? "gap-1 px-4 py-3" : "gap-2 px-6 py-6 sm:px-10",
          className
        )}
      >
        {/* Decorative gold corner */}
        <div
          aria-hidden
          className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#e3bb69]/25 blur-2xl"
        />
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full bg-[#e3bb69] font-semibold uppercase tracking-wide text-primary",
            compact ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-[11px]"
          )}
        >
          Announcement
        </span>
        <h3
          className={cn(
            "line-clamp-2 font-semibold text-primary",
            compact ? "text-sm" : "text-xl sm:text-2xl md:text-3xl"
          )}
        >
          {titleText}
        </h3>
        {!compact && (
          <p className="line-clamp-2 max-w-2xl text-sm text-secondary sm:text-base">{descText}</p>
        )}
      </div>
    )
  }

  if (templateKey === "spotlightAccent") {
    return (
      <div
        className={cn(
          "relative flex h-full w-full items-center overflow-hidden bg-accent",
          compact ? "p-2" : "p-4 sm:p-6",
          className
        )}
      >
        <div
          className={cn(
            "relative flex h-full w-full flex-col justify-center overflow-hidden rounded-xl bg-primary",
            compact ? "gap-1 px-4 py-3" : "gap-2 px-6 py-6 sm:px-10"
          )}
        >
          <div
            aria-hidden
            className={cn(
              "rounded-full bg-[#e3bb69]",
              compact ? "h-2 w-2" : "mb-1 h-3 w-3"
            )}
          />
          <h3
            className={cn(
              "line-clamp-2 font-semibold text-primary-foreground",
              compact ? "text-sm" : "text-xl sm:text-2xl md:text-3xl"
            )}
          >
            {titleText}
          </h3>
          {!compact && (
            <p className="line-clamp-2 max-w-2xl text-sm text-accent sm:text-base">{descText}</p>
          )}
        </div>
      </div>
    )
  }

  // gradientGreen ("Executive") — default
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background:
          "linear-gradient(135deg, #202F21 0%, #2c4030 55%, #34492f 100%)",
      }}
    >
      {/* Gold left accent bar */}
      <div aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-[#e3bb69]" />
      {/* Soft highlight top-right */}
      <div
        aria-hidden
        className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-[#bdc4a5]/20 blur-3xl"
      />
      <div
        className={cn(
          "relative flex h-full w-full flex-col justify-center",
          compact ? "gap-1 px-5 py-3" : "gap-2 px-7 py-6 sm:px-12"
        )}
      >
        {!compact && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e3bb69]">
            Announcement
          </span>
        )}
        <h3
          className={cn(
            "line-clamp-2 font-semibold text-primary-foreground",
            compact ? "text-sm" : "text-xl sm:text-2xl md:text-3xl"
          )}
        >
          {titleText}
        </h3>
        {!compact && (
          <p className="line-clamp-2 max-w-2xl text-sm text-accent sm:text-base">{descText}</p>
        )}
      </div>
    </div>
  )
}

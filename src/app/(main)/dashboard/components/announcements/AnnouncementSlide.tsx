"use client"

import Image from "next/image"
import { AnnouncementTemplateBanner } from "./AnnouncementTemplateBanner"
import type { AnnouncementDTO } from "../../announcement-types"

interface AnnouncementSlideProps {
  announcement: AnnouncementDTO
  onClick: () => void
  /** Hint to the browser to eagerly load the first slide image. */
  priority?: boolean
}

/** A single slideshow banner. Clicking opens the click-to-expand detail dialog. */
export function AnnouncementSlide({ announcement, onClick, priority }: AnnouncementSlideProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View announcement: ${announcement.title}`}
      className="group relative block aspect-[16/9] w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:aspect-[21/9]"
    >
      {announcement.bannerType === "image" && announcement.imageUrl ? (
        <Image
          src={announcement.imageUrl}
          alt={announcement.title}
          fill
          sizes="(max-width: 1024px) 100vw, 1024px"
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      ) : (
        <AnnouncementTemplateBanner
          templateKey={announcement.templateKey ?? "gradientGreen"}
          title={announcement.title}
          description={announcement.description}
        />
      )}
      <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
        Click to read
      </span>
    </button>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnnouncementSlide } from "./AnnouncementSlide"
import { AnnouncementDetailDialog } from "./AnnouncementDetailDialog"
import { ManageAnnouncementsButton } from "./ManageAnnouncementsButton"
import type { AnnouncementDTO } from "../../announcement-types"

interface AnnouncementSlideshowProps {
  announcements: AnnouncementDTO[]
  isAdmin: boolean
}

/**
 * Dashboard announcements banner. Everyone sees the active slideshow; admins
 * additionally get a "Manage" entry point (no separate page). Auto-rotates and
 * shows dots/arrows only when there is more than one announcement.
 */
export function AnnouncementSlideshow({ announcements, isAdmin }: AnnouncementSlideshowProps) {
  const hasMultiple = announcements.length > 1

  const autoplay = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true })
  )
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: hasMultiple, align: "center" },
    hasMultiple ? [autoplay.current] : []
  )

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [snaps, setSnaps] = useState<number[]>([])
  const [detail, setDetail] = useState<AnnouncementDTO | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    setSnaps(emblaApi.scrollSnapList())
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    onSelect()
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  const openDetail = (a: AnnouncementDTO) => {
    autoplay.current?.stop?.()
    setDetail(a)
    setDetailOpen(true)
  }

  const handleDetailOpenChange = (open: boolean) => {
    setDetailOpen(open)
    if (!open) autoplay.current?.play?.()
  }

  // Non-admins with nothing to show get no banner at all.
  if (announcements.length === 0 && !isAdmin) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-primary">Announcements</h2>
        </div>
        {isAdmin && <ManageAnnouncementsButton />}
      </div>

      {announcements.length === 0 ? (
        <div className="flex aspect-[16/9] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--card-border)] bg-card/60 text-center sm:aspect-[21/9]">
          <Megaphone className="mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground/80">No active announcements</p>
          <p className="text-xs text-muted-foreground">
            Use “Manage” to create and activate one.
          </p>
        </div>
      ) : (
        <div className="relative">
          <div
            className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-card shadow-sm"
            ref={emblaRef}
          >
            <div className="flex">
              {announcements.map((a, i) => (
                <div key={a.id} className="min-w-0 flex-[0_0_100%]">
                  <AnnouncementSlide
                    announcement={a}
                    onClick={() => openDetail(a)}
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          </div>

          {hasMultiple && (
            <>
              <button
                type="button"
                aria-label="Previous announcement"
                onClick={() => emblaApi?.scrollPrev()}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next announcement"
                onClick={() => emblaApi?.scrollNext()}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
                {snaps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to announcement ${i + 1}`}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === selectedIndex
                        ? "w-5 bg-white"
                        : "w-2 bg-white/50 hover:bg-white/80"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <AnnouncementDetailDialog
        announcement={detail}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />
    </section>
  )
}

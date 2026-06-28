"use client"

import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AnnouncementTemplateBanner } from "./AnnouncementTemplateBanner"
import type { AnnouncementDTO } from "../../announcement-types"

interface AnnouncementDetailDialogProps {
  announcement: AnnouncementDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Raise above another open dialog/sheet (e.g. opened from the manage panel). */
  nested?: boolean
}

/** Click-to-expand popup showing the banner plus the full title and description. */
export function AnnouncementDetailDialog({
  announcement,
  open,
  onOpenChange,
  nested = false,
}: AnnouncementDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent nested={nested} className="max-w-2xl gap-0 overflow-hidden p-0">
        {announcement && (
          <>
            {/* Banner */}
            <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
              {announcement.bannerType === "image" && announcement.imageUrl ? (
                <Image
                  src={announcement.imageUrl}
                  alt={announcement.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 672px"
                  className="object-cover"
                />
              ) : (
                <AnnouncementTemplateBanner
                  templateKey={announcement.templateKey ?? "gradientGreen"}
                  title={announcement.title}
                  description={announcement.description}
                />
              )}
            </div>

            {/* Full text */}
            <div className="space-y-3 p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-xl leading-snug text-primary">
                  {announcement.title}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Announcement details
                </DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {announcement.description}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

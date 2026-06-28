"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Settings2 } from "lucide-react"
import { ManageAnnouncementsPanel } from "./ManageAnnouncementsPanel"
import { getAllAnnouncementsForAdmin } from "../../announcement-actions"
import type { AnnouncementDTO } from "../../announcement-types"

/**
 * Admin-only entry point rendered on the dashboard. Opens a side sheet holding
 * the full announcement management table (there is no separate page).
 */
export function ManageAnnouncementsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AnnouncementDTO[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await getAllAnnouncementsForAdmin())
    } catch {
      // surfaced by individual actions; keep the panel usable
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  // Refetch the admin list and refresh the dashboard slideshow server data.
  const refresh = useCallback(async () => {
    await load()
    router.refresh()
  }, [load, router])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-4 w-4" />
          Manage
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
        <SheetHeader className="border-b">
          <SheetTitle>Manage announcements</SheetTitle>
          <SheetDescription>
            Create, schedule, and activate banners shown on everyone’s dashboard.
          </SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <ManageAnnouncementsPanel items={items} loading={loading} refresh={refresh} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

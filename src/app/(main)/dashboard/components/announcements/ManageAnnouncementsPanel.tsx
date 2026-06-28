"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { CheckCircle2, Loader2, Megaphone, Pencil, Plus, Trash2, XCircle } from "lucide-react"
import { formatMYTDateForDisplay } from "@/lib/date-utils"
import { AnnouncementTemplateBanner } from "./AnnouncementTemplateBanner"
import { AnnouncementForm } from "./AnnouncementForm"
import {
  bulkUpdateAnnouncementStatus,
  deleteAnnouncement,
} from "../../announcement-actions"
import {
  ANNOUNCEMENT_TEMPLATE_LABELS,
  type AnnouncementDTO,
  type AnnouncementStatus,
} from "../../announcement-types"

interface ManageAnnouncementsPanelProps {
  items: AnnouncementDTO[]
  loading: boolean
  /** Refetch the admin list AND refresh the dashboard slideshow. */
  refresh: () => void | Promise<void>
}

const STATUS_BADGE: Record<AnnouncementStatus, string> = {
  active: "bg-[#799F78] text-white",
  draft: "bg-secondary text-secondary-foreground",
  inactive: "bg-muted text-muted-foreground",
}

function formatWindow(a: AnnouncementDTO): string {
  const fmt = (iso: string) => formatMYTDateForDisplay(new Date(iso), { format: "short" })
  if (!a.startDate && !a.endDate) return "Always on"
  if (a.startDate && a.endDate) return `${fmt(a.startDate)} – ${fmt(a.endDate)}`
  if (a.startDate) return `From ${fmt(a.startDate)}`
  return `Until ${fmt(a.endDate as string)}`
}

export function ManageAnnouncementsPanel({ items, loading, refresh }: ManageAnnouncementsPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AnnouncementDTO | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementDTO | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const allSelected = items.length > 0 && selected.size === items.length

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))))
  }

  const runBulk = async (status: AnnouncementStatus) => {
    if (selected.size === 0) return
    setBulkBusy(true)
    try {
      const ids = Array.from(selected)
      const { count } = await bulkUpdateAnnouncementStatus(ids, status)
      toast({ title: `${count} announcement${count === 1 ? "" : "s"} set to ${status}` })
      setSelected(new Set())
      await refresh()
    } catch (err) {
      toast({
        title: "Bulk update failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setBulkBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await deleteAnnouncement(deleteTarget.id)
      toast({ title: "Announcement deleted" })
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      setDeleteTarget(null)
      await refresh()
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setDeleteBusy(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (a: AnnouncementDTO) => {
    setEditing(a)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {items.length} announcement{items.length === 1 ? "" : "s"}
        </p>
        <Button type="button" size="sm" className="text-white" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New announcement
        </Button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-accent/20 px-3 py-2">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={bulkBusy} onClick={() => runBulk("active")}>
              <CheckCircle2 className="mr-1.5 h-4 w-4 text-[#799F78]" />
              Activate
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={bulkBusy} onClick={() => runBulk("inactive")}>
              <XCircle className="mr-1.5 h-4 w-4 text-secondary" />
              Deactivate
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={bulkBusy} onClick={() => runBulk("draft")}>
              Set to draft
            </Button>
            {bulkBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--card-border)] py-16 text-center">
          <Megaphone className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground/80">No announcements yet</p>
          <p className="text-xs text-muted-foreground">Create your first one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead className="w-24">Banner</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-44">Window</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id} className={cn(selected.has(a.id) && "bg-accent/10")}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(a.id)}
                      onCheckedChange={() => toggle(a.id)}
                      aria-label={`Select ${a.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative aspect-[21/9] w-20 overflow-hidden rounded">
                      {a.bannerType === "image" && a.imageUrl ? (
                        <Image src={a.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                      ) : (
                        <AnnouncementTemplateBanner
                          templateKey={a.templateKey ?? "gradientGreen"}
                          title={a.title}
                          description={a.description}
                          compact
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-1 font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.bannerType === "image"
                        ? "Image banner"
                        : `${ANNOUNCEMENT_TEMPLATE_LABELS[a.templateKey ?? "gradientGreen"]} template`}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("capitalize", STATUS_BADGE[a.status])}>{a.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatWindow(a)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(a)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AnnouncementForm
        announcement={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={() => {
          void refresh()
        }}
      />

      {/* Delete confirmation (nested above the manage sheet) */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent nested className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete announcement?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

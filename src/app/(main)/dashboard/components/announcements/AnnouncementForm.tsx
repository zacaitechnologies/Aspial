"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  CalendarDays,
  ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react"
import {
  formatLocalDate,
  formatDateForDisplay,
  parseLocalDateString,
  toBusinessTZParts,
} from "@/lib/date-utils"
import { AnnouncementTemplateBanner } from "./AnnouncementTemplateBanner"
import { AnnouncementImageCropper } from "./AnnouncementImageCropper"
import {
  createAnnouncement,
  updateAnnouncement,
  uploadAnnouncementImage,
} from "../../announcement-actions"
import {
  ANNOUNCEMENT_IMAGE_RATIO_LABEL,
  ANNOUNCEMENT_TEMPLATE_KEYS,
  ANNOUNCEMENT_TEMPLATE_LABELS,
  type AnnouncementBannerType,
  type AnnouncementDTO,
  type AnnouncementStatus,
  type AnnouncementTemplate,
} from "../../announcement-types"

interface AnnouncementFormProps {
  announcement?: AnnouncementDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function businessDayToDate(iso: string | null): Date | null {
  if (!iso) return null
  return parseLocalDateString(toBusinessTZParts(new Date(iso)).dateStr)
}

export function AnnouncementForm({
  announcement,
  open,
  onOpenChange,
  onSaved,
}: AnnouncementFormProps) {
  const isEditing = !!announcement
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [bannerType, setBannerType] = useState<AnnouncementBannerType>("template")
  const [templateKey, setTemplateKey] = useState<AnnouncementTemplate>("gradientGreen")
  const [status, setStatus] = useState<AnnouncementStatus>("draft")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [cropperOpen, setCropperOpen] = useState(false)

  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync state to the announcement being edited (or reset for create) on open.
  useEffect(() => {
    if (!open) return
    setTitle(announcement?.title ?? "")
    setDescription(announcement?.description ?? "")
    setBannerType(announcement?.bannerType ?? "template")
    setTemplateKey(announcement?.templateKey ?? "gradientGreen")
    setStatus(announcement?.status ?? "draft")
    setStartDate(businessDayToDate(announcement?.startDate ?? null))
    setEndDate(businessDayToDate(announcement?.endDate ?? null))
    setImageFile(null)
    setImagePreview(announcement?.bannerType === "image" ? announcement?.imageUrl ?? null : null)
    setRawImageSrc(null)
  }, [open, announcement])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image.", variant: "destructive" })
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setRawImageSrc(reader.result as string)
      setCropperOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropConfirm = (file: File, previewUrl: string) => {
    setImageFile(file)
    setImagePreview(previewUrl)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" })
      return
    }
    if (!description.trim()) {
      toast({ title: "Description required", variant: "destructive" })
      return
    }
    if (bannerType === "image" && !imageFile && !imagePreview) {
      toast({
        title: "Image required",
        description: "Upload a banner image or switch to a template.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        bannerType,
        templateKey: bannerType === "template" ? templateKey : null,
        status,
        startDate: startDate ? formatLocalDate(startDate) : null,
        endDate: endDate ? formatLocalDate(endDate) : null,
      }

      const saved = isEditing
        ? await updateAnnouncement(announcement!.id, payload)
        : await createAnnouncement(payload)

      if (bannerType === "image" && imageFile) {
        const fd = new FormData()
        fd.append("file", imageFile)
        const uploadResult = await uploadAnnouncementImage(saved.id, fd)
        if (!uploadResult.success) {
          toast({
            title: "Image upload failed",
            description: uploadResult.error ?? "The announcement was saved without the image.",
            variant: "destructive",
          })
        }
      }

      toast({ title: isEditing ? "Announcement updated" : "Announcement created" })
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent nested className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit announcement" : "New announcement"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Title *</Label>
              <Input
                id="announcement-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Office closed for Hari Raya"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="announcement-description">Description *</Label>
              <Textarea
                id="announcement-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full details shown when a user clicks the banner..."
                rows={4}
              />
            </div>

            {/* Banner type */}
            <div className="space-y-2">
              <Label>Banner</Label>
              <Tabs
                value={bannerType}
                onValueChange={(v) => setBannerType(v as AnnouncementBannerType)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="template">Use a template</TabsTrigger>
                  <TabsTrigger value="image">Upload an image</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {bannerType === "template" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {ANNOUNCEMENT_TEMPLATE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTemplateKey(key)}
                    className={cn(
                      "group space-y-1.5 rounded-lg border-2 p-1.5 text-left transition",
                      templateKey === key
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-accent"
                    )}
                  >
                    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-md">
                      <AnnouncementTemplateBanner
                        templateKey={key}
                        title={title || "Title"}
                        description={description}
                        compact
                      />
                    </div>
                    <span className="block px-1 text-xs font-medium text-foreground/70">
                      {ANNOUNCEMENT_TEMPLATE_LABELS[key]}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative w-full overflow-hidden rounded-lg border border-[var(--card-border)]">
                    <div className="relative aspect-[21/9] w-full">
                      <Image
                        src={imagePreview}
                        alt="Banner preview"
                        fill
                        sizes="(max-width: 640px) 100vw, 640px"
                        className="object-cover"
                        unoptimized={imagePreview.startsWith("blob:")}
                      />
                    </div>
                    <div className="absolute right-2 top-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change
                      </Button>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-[21/9] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--card-border)] bg-muted/30 text-center transition hover:border-accent hover:bg-muted/50"
                  >
                    <Upload className="mb-2 h-7 w-7 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground/80">
                      Click to upload &amp; crop
                    </span>
                    <span className="text-xs text-muted-foreground">PNG, JPG, WebP — max 5MB</span>
                  </button>
                )}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Recommended ratio: {ANNOUNCEMENT_IMAGE_RATIO_LABEL}
                </p>
              </div>
            )}

            {/* Status + schedule */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as AnnouncementStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DateField
                label="Start date"
                value={startDate}
                open={startOpen}
                onOpenChange={setStartOpen}
                onSelect={(d) => {
                  setStartDate(d ?? null)
                  setStartOpen(false)
                }}
                onClear={() => setStartDate(null)}
              />

              <DateField
                label="Expiry date"
                value={endDate}
                open={endOpen}
                onOpenChange={setEndOpen}
                onSelect={(d) => {
                  setEndDate(d ?? null)
                  setEndOpen(false)
                }}
                onClear={() => setEndDate(null)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave dates empty to show immediately and never auto-expire. Only <b>active</b>{" "}
              announcements within their date window appear in the slideshow.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="text-white" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Save changes"
                ) : (
                  "Create announcement"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AnnouncementImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={rawImageSrc}
        onConfirm={handleCropConfirm}
      />
    </>
  )
}

interface DateFieldProps {
  label: string
  value: Date | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (date: Date | undefined) => void
  onClear: () => void
}

function DateField({ label, value, open, onOpenChange, onSelect, onClear }: DateFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start gap-2 font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarDays className="h-4 w-4" />
              {value ? formatDateForDisplay(value) : "Any"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar selected={value ?? undefined} onSelect={onSelect} />
          </PopoverContent>
        </Popover>
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title={`Clear ${label.toLowerCase()}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

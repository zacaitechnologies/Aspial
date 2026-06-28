"use client"

import { useCallback, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import "react-easy-crop/react-easy-crop.css"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, ZoomIn } from "lucide-react"
import {
  ANNOUNCEMENT_IMAGE_ASPECT,
  ANNOUNCEMENT_IMAGE_RATIO_LABEL,
} from "../../announcement-types"

interface AnnouncementImageCropperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Source image (object URL or data URL) to crop. */
  imageSrc: string | null
  /** Called with the cropped image as a File plus a preview object URL. */
  onConfirm: (file: File, previewUrl: string) => void
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.addEventListener("load", () => resolve(img))
    img.addEventListener("error", (err) => reject(err))
    img.setAttribute("crossOrigin", "anonymous")
    img.src = url
  })
}

async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth = 1680
): Promise<{ file: File; url: string }> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not get canvas context")

  const outWidth = outputWidth
  const outHeight = Math.round(outputWidth / ANNOUNCEMENT_IMAGE_ASPECT)
  canvas.width = outWidth
  canvas.height = outHeight

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outWidth,
    outHeight
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"))
          return
        }
        const file = new File([blob], `announcement-banner-${Date.now()}.jpeg`, {
          type: "image/jpeg",
        })
        resolve({ file, url: URL.createObjectURL(blob) })
      },
      "image/jpeg",
      0.9
    )
  })
}

/** Modal cropper enforcing the recommended announcement banner aspect ratio. */
export function AnnouncementImageCropper({
  open,
  onOpenChange,
  imageSrc,
  onConfirm,
}: AnnouncementImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const { file, url } = await getCroppedImage(imageSrc, croppedAreaPixels)
      onConfirm(file, url)
      onOpenChange(false)
      // reset for next time
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    } catch (err) {
      console.error("Failed to crop image:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent nested className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop banner image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Recommended ratio: <span className="font-medium">{ANNOUNCEMENT_IMAGE_RATIO_LABEL}</span>.
            Drag to reposition and zoom to frame the banner.
          </p>

          <div className="relative h-[280px] w-full overflow-hidden rounded-lg bg-muted">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={ANNOUNCEMENT_IMAGE_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-primary"
              aria-label="Zoom"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button type="button" className="text-white" onClick={handleConfirm} disabled={isProcessing || !croppedAreaPixels}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Apply crop"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

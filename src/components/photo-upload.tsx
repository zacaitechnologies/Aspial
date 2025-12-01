"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, User } from "lucide-react"
import Image from "next/image"
import { toast } from "@/components/ui/use-toast"

interface PhotoUploadProps {
  currentPhoto?: string
  onPhotoChange: (photo: string | null) => void
  className?: string
}

export function PhotoUpload({ currentPhoto, onPhotoChange, className }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Validation Error",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Validation Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPreview(result)
        onPhotoChange(result)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading photo:", error)
      toast({
        title: "Error",
        description: "Error uploading photo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = () => {
    setPreview(null)
    onPhotoChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Photo Display */}
            <div className="relative">
              <div
                className="w-32 h-32 rounded-full border-4 flex items-center justify-center overflow-hidden"
                style={{ borderColor: "#BDC4A5" }}
              >
                {preview ? (
                  <Image
                    src={preview || "/placeholder.svg"}
                    alt="Client photo"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16" style={{ color: "#898D74" }} />
                )}
              </div>

              {/* Remove button */}
              {preview && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full p-0 bg-white border-2"
                  style={{ borderColor: "#BDC4A5" }}
                  onClick={handleRemovePhoto}
                >
                  <X className="w-4 h-4" style={{ color: "#898D74" }} />
                </Button>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex flex-col items-center space-y-2">
              <Button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="text-white"
                style={{ backgroundColor: "#202F21" }}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : preview ? "Change Photo" : "Upload Photo"}
              </Button>

              <p className="text-xs text-center" style={{ color: "#898D74" }}>
                JPG, PNG or GIF (max 5MB)
              </p>
            </div>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

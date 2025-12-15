"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, X, DollarSign, Tag, FileText, Loader2, Image as ImageIcon, Upload } from "lucide-react"
import Image from "next/image"
import { 
  createService, 
  updateService,
  uploadServiceImage
} from "../service-actions"
import { 
  Service, 
  ServiceTag, 
  CreateServiceData, 
  UpdateServiceData 
} from "../types"
import { useServicesCacheContext } from "../contexts/ServicesCacheContext"

interface ServiceFormProps {
  service?: Service
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export default function ServiceForm({ service, onSuccess, trigger }: ServiceFormProps) {
  const { serviceTags } = useServicesCacheContext()
  const [isOpen, setIsOpen] = useState(!!service) // Auto-open if editing
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [formData, setFormData] = useState<CreateServiceData>({
    name: "",
    description: "",
    basePrice: 0,
    imageUrl: null,
    tagIds: []
  })

  const isEditing = !!service
  const availableTags = serviceTags.tags

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        imageUrl: service.imageUrl || null,
        tagIds: service.tags?.map(tag => tag.id) || []
      })
      setSelectedTagIds(service.tags?.map(tag => tag.id) || [])
      setImagePreview(service.imageUrl || null)
    }
  }, [service])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true)
    try {
      let serviceId: number
      
      if (isEditing && service) {
        const updated = await updateService(service.id, {
          ...formData,
          tagIds: selectedTagIds
        })
        serviceId = updated.id
      } else {
        const created = await createService({
          ...formData,
          tagIds: selectedTagIds
        })
        serviceId = created.id
      }

      // Upload image if a new file was selected
      if (imageFile && serviceId) {
        setIsUploadingImage(true)
        const uploadFormData = new FormData()
        uploadFormData.append("file", imageFile)
        
        const uploadResult = await uploadServiceImage(serviceId, uploadFormData)
        if (!uploadResult.success) {
          console.error("Error uploading image:", uploadResult.error)
          // Don't fail the whole operation, just log the error
        }
        setIsUploadingImage(false)
      }
      
      setIsOpen(false)
      resetForm()
      onSuccess?.()
    } catch (error) {
      console.error("Error saving service:", error)
    } finally {
      setIsSubmitting(false)
      setIsUploadingImage(false)
    }
  }

  const validateAndSetImage = (file: File) => {
    // Validate file type - accept images and PDFs
    const isImage = file.type.startsWith("image/")
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    
    if (!isImage && !isPDF) {
      alert("Please select an image file or PDF")
      return false
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB")
      return false
    }

    setImageFile(file)
    
    // Create preview only for images
    if (isImage) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      // For PDFs, show a placeholder preview
      setImagePreview(null)
    }
    return true
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSetImage(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      validateAndSetImage(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData({ ...formData, imageUrl: null })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      basePrice: 0,
      imageUrl: null,
      tagIds: []
    })
    setSelectedTagIds([])
    setImagePreview(null)
    setImageFile(null)
  }

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const removeTag = (tagId: number) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId))
  }

  const selectedTags = availableTags.filter(tag => selectedTagIds.includes(tag.id))

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsOpen(false)
      resetForm()
      if (isEditing) {
        onSuccess?.() // Call onSuccess to close the edit mode
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      {!isEditing && (
        <DialogTrigger asChild>
          {trigger || (
            <Button onClick={() => setIsOpen(true)} className="text-white">
              <Plus className="w-5 h-5 mr-2" />
              Create Service
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isEditing ? (
              <>
                Edit Service
              </>
            ) : (
              <>
                Create New Service
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="serviceName" className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  Service Name *
                </Label>
                <Input
                  id="serviceName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter service name"
                  required
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="basePrice" className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  Base Price *
                </Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter detailed service description..."
                rows={4}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Image/File Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="serviceImage" className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gray-500" />
                Service Image / Document
              </Label>
              <div className="space-y-3">
                {imagePreview ? (
                  <div className="relative inline-block w-full">
                    <Image
                      src={imagePreview}
                      alt="Service preview"
                      width={600}
                      height={192}
                      className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-md"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : imageFile ? (
                  <div className="relative inline-block w-full">
                    <div className="w-full h-48 flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50">
                      <div className="text-center space-y-2">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                        <p className="text-sm font-medium text-gray-700">{imageFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-md"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                      ${isDragging 
                        ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                      }
                      cursor-pointer
                    `}
                    onClick={() => document.getElementById('serviceImage')?.click()}
                  >
                    <input
                      id="serviceImage"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className={`
                        w-16 h-16 rounded-full flex items-center justify-center transition-colors
                        ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}
                      `}>
                        <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="space-y-1">
                        <p className={`text-sm font-medium ${isDragging ? 'text-blue-600' : 'text-gray-700'}`}>
                          {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF, WebP or PDF (max 5MB)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              Service Tags
            </h3>
            
            <div className="space-y-4">
              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">Selected Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tag => (
                      <Badge 
                        key={tag.id}
                        style={{ backgroundColor: tag.color || '#3B82F6', color: 'white' }}
                        className="px-3 py-2 flex items-center gap-2 text-sm font-medium shadow-sm"
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => removeTag(tag.id)}
                          className="hover:bg-white/20 rounded-full p-1 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Tags */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Available Tags ({availableTags.length})
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg border">
                  {availableTags.map(tag => (
                    <div key={tag.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white transition-colors">
                      <Checkbox
                        id={`tag-${tag.id}`}
                        checked={selectedTagIds.includes(tag.id)}
                        onCheckedChange={() => toggleTag(tag.id)}
                        className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label 
                        htmlFor={`tag-${tag.id}`}
                        className="flex items-center gap-2 cursor-pointer text-sm flex-1"
                      >
                        <div 
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: tag.color || '#3B82F6' }}
                        />
                        <span className="font-medium">{tag.name}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="text-white px-6"
              style={{ backgroundColor: "#202F21" }}
              disabled={!formData.name.trim() || formData.basePrice <= 0 || isSubmitting || isUploadingImage}
            >
              {(isSubmitting || isUploadingImage) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUploadingImage ? "Uploading image..." : isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update Service"
              ) : (
                "Create Service"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

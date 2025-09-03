"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, X } from "lucide-react"
import { 
  createService, 
  updateService, 
  getAllServiceTags 
} from "../service-actions"
import { 
  Service, 
  ServiceTag, 
  CreateServiceData, 
  UpdateServiceData 
} from "../types"

interface ServiceFormProps {
  service?: Service
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export default function ServiceForm({ service, onSuccess, trigger }: ServiceFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<ServiceTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [formData, setFormData] = useState<CreateServiceData>({
    name: "",
    description: "",
    basePrice: 0,
    tagIds: []
  })

  const isEditing = !!service

  useEffect(() => {
    loadTags()
    if (service) {
      setFormData({
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        tagIds: service.tags.map(tag => tag.id)
      })
      setSelectedTagIds(service.tags.map(tag => tag.id))
    }
  }, [service])

  const loadTags = async () => {
    try {
      const tags = await getAllServiceTags()
      setAvailableTags(tags)
    } catch (error) {
      console.error("Error loading tags:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (isEditing && service) {
        await updateService(service.id, {
          ...formData,
          tagIds: selectedTagIds
        })
      } else {
        await createService({
          ...formData,
          tagIds: selectedTagIds
        })
      }
      
      setIsOpen(false)
      resetForm()
      onSuccess?.()
    } catch (error) {
      console.error("Error saving service:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      basePrice: 0,
      tagIds: []
    })
    setSelectedTagIds([])
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {isEditing ? "Edit Service" : "Create Service"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Service" : "Create New Service"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serviceName">Service Name *</Label>
              <Input
                id="serviceName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter service name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="basePrice">Base Price *</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter service description"
              rows={3}
            />
          </div>

          <div>
            <Label>Tags</Label>
            <div className="space-y-3">
              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <Badge 
                      key={tag.id}
                      style={{ backgroundColor: tag.color, color: 'white' }}
                      className="px-3 py-1 flex items-center gap-2"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => removeTag(tag.id)}
                        className="hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Available Tags */}
              <div className="grid grid-cols-2 gap-2">
                {availableTags.map(tag => (
                  <div key={tag.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={() => toggleTag(tag.id)}
                    />
                    <Label 
                      htmlFor={`tag-${tag.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Update Service" : "Create Service"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

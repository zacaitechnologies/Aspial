"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Plus, Loader2, Tag, Palette } from "lucide-react"
import { 
  createServiceTag, 
  updateServiceTag, 
  deleteServiceTag
} from "../service-actions"
import { ServiceTag, CreateServiceTagData, UpdateServiceTagData } from "../types"
import { useServicesCacheContext } from "../contexts/ServicesCacheContext"

export default function ServiceTagManager() {
  const { serviceTags, invalidateAllCaches } = useServicesCacheContext()
  const { tags, isLoading, onRefresh } = serviceTags
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<ServiceTag | null>(null)
  const [formData, setFormData] = useState<CreateServiceTagData>({
    name: "",
    color: "#3B82F6"
  })



  const handleCreateTag = async () => {
    if (!formData.name.trim()) return
    
    try {
      await createServiceTag(formData)
      setFormData({ name: "", color: "#3B82F6" })
      setIsCreateDialogOpen(false)
      invalidateAllCaches()
      await onRefresh()
    } catch (error) {
      console.error("Error creating tag:", error)
    }
  }

  const handleEditTag = async () => {
    if (!editingTag || !formData.name.trim()) return
    
    try {
      await updateServiceTag(editingTag.id, formData)
      setFormData({ name: "", color: "#3B82F6" })
      setEditingTag(null)
      setIsEditDialogOpen(false)
      invalidateAllCaches()
      await onRefresh()
    } catch (error) {
      console.error("Error updating tag:", error)
    }
  }

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm("Are you sure you want to delete this tag? This will remove it from all associated services.")) return
    
    try {
      await deleteServiceTag(tagId)
      invalidateAllCaches()
      await onRefresh()
    } catch (error) {
      console.error("Error deleting tag:", error)
    }
  }

  const openEditDialog = (tag: ServiceTag) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, color: tag.color || "#3B82F6" })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ name: "", color: "#3B82F6" })
    setEditingTag(null)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Tags</h2>
          <p className="text-gray-600 mt-1">
            Organize your services with custom tags and colors
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                Create Service Tag
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tagName" className="text-sm font-medium">Tag Name *</Label>
                <Input
                  id="tagName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter tag name"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagColor" className="text-sm font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Color
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="tagColor"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-12 rounded-lg border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-xs text-gray-500">Preview</span>
                </div>
              </div>
              <Button 
                onClick={handleCreateTag} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!formData.name.trim()}
              >
                Create Tag
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading service tags...</p>
          </div>
        </div>
      )}

      {/* Tags Grid */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <div key={tag.id} className="group relative bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge 
                      style={{ backgroundColor: tag.color || "#3B82F6", color: 'white' }}
                      className="px-3 py-1 text-sm font-medium shadow-sm"
                    >
                      {tag.name}
                    </Badge>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                      {tag.services?.length || 0} services
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(tag.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(tag)}
                    className="h-8 w-8 p-0 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTag(tag.id)}
                    className="h-8 w-8 p-0 border-gray-300 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && tags.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No service tags yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first service tag to start organizing your services
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create First Tag
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Service Tag
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="editTagName" className="text-sm font-medium">Tag Name *</Label>
              <Input
                id="editTagName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter tag name"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTagColor" className="text-sm font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="editTagColor"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-12 rounded-lg border-gray-300 cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="text-xs text-gray-500">Preview</span>
              </div>
            </div>
            <Button 
              onClick={handleEditTag} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!formData.name.trim()}
            >
              Update Tag
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

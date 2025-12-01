"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Edit, Plus, Loader2, Tag, Palette } from "lucide-react"

// Predefined color palette for service tags
const PREDEFINED_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red  
  "#F97316", // Orange
  "#22C55E", // Green
  "#A855F7", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#10B981", // Emerald
  "#F43F5E", // Rose
]
import { 
  createServiceTag, 
  updateServiceTag, 
  deleteServiceTag
} from "../service-actions"
import { ServiceTag, CreateServiceTagData, UpdateServiceTagData } from "../types"
import { useServicesCacheContext } from "../contexts/ServicesCacheContext"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { toast } from "@/components/ui/use-toast"

export default function ServiceTagManager() {
  const { serviceTags, invalidateAllCaches } = useServicesCacheContext()
  const { tags, isLoading, onRefresh } = serviceTags
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<ServiceTag | null>(null)
  const [deleteTagId, setDeleteTagId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
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
    setDeleteTagId(tagId)
  }

  const confirmDeleteTag = async () => {
    if (!deleteTagId) return
    
    setIsDeleting(true)
    try {
      await deleteServiceTag(deleteTagId)
      invalidateAllCaches()
      await onRefresh()
      setDeleteTagId(null)
      toast({
        title: "Success",
        description: "Service tag deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting tag:", error)
      toast({
        title: "Error",
        description: "Failed to delete service tag. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
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
    <div className="space-y-6">
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
            <Button onClick={() => resetForm()} className="text-white" style={{ backgroundColor: "#202F21" }}>
              <Plus className="w-5 h-5 mr-2" />
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
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Choose Color
                </Label>
                <div className="grid grid-cols-6 gap-2">
                  {PREDEFINED_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                        formData.color === color 
                          ? 'border-gray-800 shadow-lg' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-xs text-gray-500">Selected: {formData.color}</span>
                </div>
              </div>
              <Button 
                onClick={handleCreateTag} 
                className="w-full text-white"
                style={{ backgroundColor: "#202F21" }}
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
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {tags.map((tag) => (
            <Card key={tag.id} className="card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      <Badge 
                        style={{ backgroundColor: tag.color || "#3B82F6", color: 'white' }}
                        className="px-3 py-1 text-sm font-medium shadow-sm"
                      >
                        {tag.name}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {tag.services?.length || 0} services
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(tag)}
                      title="Edit Tag"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete Tag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(tag.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
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
          <Button onClick={() => setIsCreateDialogOpen(true)} className="text-white" style={{ backgroundColor: "#202F21" }}>
            <Plus className="w-5 h-5 mr-2" />
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
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Choose Color
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {PREDEFINED_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      formData.color === color 
                        ? 'border-gray-800 shadow-lg' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="text-xs text-gray-500">Selected: {formData.color}</span>
              </div>
            </div>
            <Button 
              onClick={handleEditTag} 
              className="w-full text-white"
              style={{ backgroundColor: "#202F21" }}
              disabled={!formData.name.trim()}
            >
              Update Tag
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={deleteTagId !== null}
        onClose={() => setDeleteTagId(null)}
        onConfirm={confirmDeleteTag}
        title="Delete Service Tag"
        description="Are you sure you want to delete this tag? This will remove it from all associated services."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}

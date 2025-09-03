"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Plus } from "lucide-react"
import { 
  createServiceTag, 
  updateServiceTag, 
  deleteServiceTag, 
  getAllServiceTags 
} from "../service-actions"
import { ServiceTag, CreateServiceTagData, UpdateServiceTagData } from "../types"

export default function ServiceTagManager() {
  const [tags, setTags] = useState<ServiceTag[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<ServiceTag | null>(null)
  const [formData, setFormData] = useState<CreateServiceTagData>({
    name: "",
    color: "#3B82F6"
  })

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      const loadedTags = await getAllServiceTags()
      setTags(loadedTags)
    } catch (error) {
      console.error("Error loading tags:", error)
    }
  }

  const handleCreateTag = async () => {
    try {
      await createServiceTag(formData)
      setFormData({ name: "", color: "#3B82F6" })
      setIsCreateDialogOpen(false)
      await loadTags()
    } catch (error) {
      console.error("Error creating tag:", error)
    }
  }

  const handleEditTag = async () => {
    if (!editingTag) return
    
    try {
      await updateServiceTag(editingTag.id, formData)
      setFormData({ name: "", color: "#3B82F6" })
      setEditingTag(null)
      setIsEditDialogOpen(false)
      await loadTags()
    } catch (error) {
      console.error("Error updating tag:", error)
    }
  }

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm("Are you sure you want to delete this tag?")) return
    
    try {
      await deleteServiceTag(tagId)
      await loadTags()
    } catch (error) {
      console.error("Error deleting tag:", error)
    }
  }

  const openEditDialog = (tag: ServiceTag) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, color: tag.color })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ name: "", color: "#3B82F6" })
    setEditingTag(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Service Tags</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Service Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tagName">Tag Name</Label>
                <Input
                  id="tagName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter tag name"
                />
              </div>
              <div>
                <Label htmlFor="tagColor">Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="tagColor"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <Button onClick={handleCreateTag} className="w-full">
                Create Tag
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Badge 
                style={{ backgroundColor: tag.color, color: 'white' }}
                className="px-3 py-1"
              >
                {tag.name}
              </Badge>
              <span className="text-sm text-gray-500">
                {tag.services?.length || 0} services
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(tag)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteTag(tag.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTagName">Tag Name</Label>
              <Input
                id="editTagName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter tag name"
              />
            </div>
            <div>
              <Label htmlFor="editTagColor">Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="editTagColor"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <Button onClick={handleEditTag} className="w-full">
              Update Tag
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

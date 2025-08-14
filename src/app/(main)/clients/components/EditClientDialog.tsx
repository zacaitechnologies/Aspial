"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { updateClient } from "../action"

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  notes?: string
  quotationsCount: number
  totalValue: number
  created_at: string
  photo?: string
}

interface EditClientDialogProps {
  client: Client | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function EditClientDialog({ 
  client, 
  isOpen, 
  onOpenChange, 
  onSuccess 
}: EditClientDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    notes: ""
  })

  // Update form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone || "",
        company: client.company || "",
        address: client.address || "",
        notes: client.notes || ""
      })
    }
  }, [client])

  const handleUpdateClient = async () => {
    if (!client) return
    
    try {
      await updateClient(client.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        address: formData.address || undefined,
        notes: formData.notes || undefined,
      })
      
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Failed to update client:", error)
      alert("Failed to update client. Please try again.")
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  if (!client) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ color: "#202F21" }}>Edit Client</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input 
              id="edit-name" 
              placeholder="John Smith" 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input 
              id="edit-email" 
              type="email" 
              placeholder="john@company.com" 
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input 
              id="edit-phone" 
              placeholder="+1 (555) 123-4567" 
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-company">Company</Label>
            <Input 
              id="edit-company" 
              placeholder="Company Name" 
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Input 
              id="edit-address" 
              placeholder="123 Business Avenue" 
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea 
              id="edit-notes" 
              placeholder="Additional notes about the client..." 
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            style={{ backgroundColor: "#202F21" }} 
            className="text-white"
            onClick={handleUpdateClient}
            disabled={!formData.name || !formData.email}
          >
            Update Client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
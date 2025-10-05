"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createCustomerClient } from "../action"

interface CreateClientDialogProps {
  onSuccess: () => void
}

export default function CreateClientDialog({ onSuccess }: CreateClientDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    notes: "",
    industry: "",
    yearlyRevenue: "",
    membershipType: "NON_MEMBER"
  })

  const handleCreateClient = async () => {
    try {
      await createCustomerClient({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        address: formData.address || undefined,
        notes: formData.notes || undefined,
        industry: formData.industry || undefined,
        yearlyRevenue: formData.yearlyRevenue ? parseFloat(formData.yearlyRevenue) : undefined,
        membershipType: formData.membershipType as "MEMBER" | "NON_MEMBER",
      })
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        notes: "",
        industry: "",
        yearlyRevenue: "",
        membershipType: "NON_MEMBER"
      })
      
      setIsOpen(false)
      onSuccess()
    } catch (error) {
      console.error("Failed to create client:", error)
      alert("Failed to create client. Please try again.")
    }
  }

  const handleCancel = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      notes: "",
      industry: "",
      yearlyRevenue: "",
      membershipType: "NON_MEMBER"
    })
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="text-white" style={{ backgroundColor: "#202F21" }}>
          <Plus className="w-5 h-5 mr-2" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ color: "#202F21" }}>Add New Client</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              placeholder="John Smith" 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="john@company.com" 
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input 
              id="phone" 
              placeholder="+60161616161" 
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input 
              id="company" 
              placeholder="Company Name" 
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input 
              id="address" 
              placeholder="123 Business Avenue" 
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input 
              id="industry" 
              placeholder="Technology, Healthcare, etc." 
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearlyRevenue">Yearly Revenue (RM)</Label>
            <Input 
              id="yearlyRevenue" 
              type="number"
              placeholder="1000000" 
              value={formData.yearlyRevenue}
              onChange={(e) => setFormData(prev => ({ ...prev, yearlyRevenue: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="membershipType">Membership Type</Label>
            <Select value={formData.membershipType} onValueChange={(value) => setFormData(prev => ({ ...prev, membershipType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select membership type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="NON_MEMBER">Non-Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
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
            onClick={handleCreateClient}
            disabled={!formData.name || !formData.email}
          >
            Add Client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

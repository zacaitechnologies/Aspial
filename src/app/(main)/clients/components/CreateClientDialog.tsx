"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { createCustomerClient, checkIsAdmin, getCurrentUserId } from "../action"
import { getAllUsers } from "../../quotations/action"
import { MultiSelectAdvisors, type AdvisorOption } from "@/components/ui/multi-select-advisors"
import { toast } from "@/components/ui/use-toast"

interface CreateClientDialogProps {
  onSuccess: () => void
}

export default function CreateClientDialog({ onSuccess }: CreateClientDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [allUsers, setAllUsers] = useState<AdvisorOption[]>([])
  const [selectedAdvisorIds, setSelectedAdvisorIds] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    ic: "",
    phone: "",
    company: "",
    companyRegistrationNumber: "",
    address: "",
    notes: "",
    industry: "",
    yearlyRevenue: "",
    membershipType: "NON_MEMBER"
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [users, userId] = await Promise.all([
          getAllUsers(),
          getCurrentUserId(),
        ])
        setAllUsers(users.map(u => ({ id: u.id, firstName: u.firstName ?? "", lastName: u.lastName ?? "", email: u.email })))
        if (userId) {
          setCurrentUserId(userId)
          setSelectedAdvisorIds([userId])
        }
        // Check admin via Supabase ID (checkIsAdmin expects supabase_id)
        // We'll use the action that handles this internally
      } catch {}
    }
    if (isOpen) loadData()
  }, [isOpen])

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { createClient: _ } = await import("@/utils/supabase/client")
        // Use a server action approach
        const res = await fetch("/api/check-admin").catch(() => null)
        // Fallback: if no API, just set false
        setIsAdmin(false)
      } catch {
        setIsAdmin(false)
      }
    }
    // Simplified: get admin status from the server action
    import("../action").then(mod => {
      const supabase = import("@/utils/supabase/client")
      supabase.then(({ createClient }) => {
        const client = createClient()
        client.auth.getUser().then(({ data }) => {
          if (data?.user?.id) {
            mod.checkIsAdmin(data.user.id).then(setIsAdmin)
          }
        })
      })
    }).catch(() => {})
  }, [])

  const handleCreateClient = async () => {
    if (isCreating) return; // Prevent double submission

    try {
      if (selectedAdvisorIds.length === 0) {
        toast({
          title: "Advisor required",
          description: "Please select at least one advisor before submitting.",
          variant: "destructive",
        })
        return
      }
      setIsCreating(true)
      await createCustomerClient({
        name: formData.name,
        email: formData.email,
        ic: formData.ic,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        companyRegistrationNumber: formData.companyRegistrationNumber || undefined,
        address: formData.address || undefined,
        notes: formData.notes || undefined,
        industry: formData.industry || undefined,
        yearlyRevenue: formData.yearlyRevenue ? parseFloat(formData.yearlyRevenue) : undefined,
        membershipType: formData.membershipType as "MEMBER" | "NON_MEMBER",
        advisorIds: selectedAdvisorIds,
      })
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        ic: "",
        phone: "",
        company: "",
        companyRegistrationNumber: "",
        address: "",
        notes: "",
        industry: "",
        yearlyRevenue: "",
        membershipType: "NON_MEMBER"
      })
      setSelectedAdvisorIds(currentUserId ? [currentUserId] : [])

      setIsOpen(false)
      onSuccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create client. Please try again."
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: "",
      email: "",
      ic: "",
      phone: "",
      company: "",
      companyRegistrationNumber: "",
      address: "",
      notes: "",
      industry: "",
      yearlyRevenue: "",
      membershipType: "NON_MEMBER"
    })
    setSelectedAdvisorIds(currentUserId ? [currentUserId] : [])
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-5 h-5 mr-2" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Client</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
            <Input 
              id="name" 
              placeholder="John Smith" 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="john@company.com" 
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ic">IC <span className="text-red-500">*</span></Label>
            <Input 
              id="ic" 
              placeholder="e.g., 123456-12-1234" 
              value={formData.ic}
              onChange={(e) => setFormData(prev => ({ ...prev, ic: e.target.value }))}
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
          <div className="space-y-2">
            <Label htmlFor="companyRegistrationNumber">Company Registration Number <span className="text-red-500">*</span></Label>
            <Input 
              id="companyRegistrationNumber" 
              placeholder="e.g., 123456789" 
              value={formData.companyRegistrationNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, companyRegistrationNumber: e.target.value }))}
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
            <Label>Advisors</Label>
            <MultiSelectAdvisors
              users={allUsers}
              selectedIds={selectedAdvisorIds}
              onChange={setSelectedAdvisorIds}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              placeholder="Select advisors"
            />
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Select one or more advisors for this client" : "You are automatically included as an advisor"}
            </p>
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
          <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleCreateClient}
            disabled={!formData.name || !formData.email || !formData.ic || !formData.companyRegistrationNumber || selectedAdvisorIds.length === 0 || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Add Client"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

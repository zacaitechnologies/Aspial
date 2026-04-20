"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { updateClient, getCurrentUserId } from "../action"
import { getAllUsers } from "../../quotations/action"
import { MultiSelectAdvisors, type AdvisorOption } from "@/components/ui/multi-select-advisors"
import { toast } from "@/components/ui/use-toast"

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  companyRegistrationNumber?: string
  ic?: string
  address?: string
  notes?: string
  industry?: string
  yearlyRevenue?: number
  membershipType: "MEMBER" | "NON_MEMBER"
  quotationsCount: number
  totalValue: number
  created_at: string
  advisors?: Array<{ id: string; firstName: string; lastName: string; email: string }>
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
  const [isUpdating, setIsUpdating] = useState(false)
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
  // Load users for advisor picker
  useEffect(() => {
    async function loadData() {
      try {
        const [users, userId] = await Promise.all([
          getAllUsers(),
          getCurrentUserId(),
        ])
        setAllUsers(users.map(u => ({ id: u.id, firstName: u.firstName ?? "", lastName: u.lastName ?? "", email: u.email })))
        if (userId) setCurrentUserId(userId)
      } catch {}
    }
    if (isOpen) loadData()
  }, [isOpen])

  useEffect(() => {
    import("../action").then(mod => {
      import("@/utils/supabase/client").then(({ createClient }) => {
        const supabaseClient = createClient()
        supabaseClient.auth.getUser().then(({ data }) => {
          if (data?.user?.id) {
            mod.checkIsAdmin(data.user.id).then(setIsAdmin)
          }
        })
      })
    }).catch(() => {})
  }, [])

  // Update form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        ic: client.ic || "",
        phone: client.phone || "",
        company: client.company || "",
        companyRegistrationNumber: client.companyRegistrationNumber || "",
        address: client.address || "",
        notes: client.notes || "",
        industry: client.industry || "",
        yearlyRevenue: client.yearlyRevenue?.toString() || "",
        membershipType: client.membershipType || "NON_MEMBER"
      })
      setSelectedAdvisorIds(client.advisors?.map(a => a.id) ?? [])
    }
  }, [client])

  const handleUpdateClient = async () => {
    if (!client) return
    if (isUpdating) return; // Prevent double submission
    
    try {
      if (selectedAdvisorIds.length === 0) {
        toast({
          title: "Advisor required",
          description: "Please select at least one advisor before submitting.",
          variant: "destructive",
        })
        return
      }
      setIsUpdating(true)
      await updateClient(client.id, {
        name: formData.name,
        email: formData.email,
        ic: formData.ic || undefined,
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
      
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update client. You can only edit clients that you created."
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  if (!client) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] rounded-lg">
        <div className="custom-scrollbar overflow-y-auto max-h-[calc(90vh-4rem)] pr-2">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle className="text-foreground">Edit Client</DialogTitle>
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
              <Label htmlFor="edit-ic">IC <span className="text-red-500">*</span></Label>
              <Input 
                id="edit-ic" 
                placeholder="e.g., 123456-12-1234" 
                value={formData.ic}
                onChange={(e) => setFormData(prev => ({ ...prev, ic: e.target.value }))}
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
            <div className="space-y-2">
              <Label htmlFor="edit-companyRegistrationNumber">Company Registration Number <span className="text-red-500">*</span></Label>
              <Input 
                id="edit-companyRegistrationNumber" 
                placeholder="e.g., 123456789" 
                value={formData.companyRegistrationNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, companyRegistrationNumber: e.target.value }))}
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
            <div className="space-y-2">
              <Label htmlFor="edit-industry">Industry</Label>
              <Input 
                id="edit-industry" 
                placeholder="Technology, Healthcare, etc." 
                value={formData.industry}
                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-yearlyRevenue">Yearly Revenue (RM)</Label>
              <Input 
                id="edit-yearlyRevenue" 
                type="number"
                placeholder="1000000" 
                value={formData.yearlyRevenue}
                onChange={(e) => setFormData(prev => ({ ...prev, yearlyRevenue: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-membershipType">Membership Type</Label>
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
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional notes about the client..." 
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 sticky bottom-0 bg-background pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
              Cancel
            </Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleUpdateClient}
              disabled={!formData.name || !formData.email || !formData.ic || !formData.companyRegistrationNumber || selectedAdvisorIds.length === 0 || isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Client"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
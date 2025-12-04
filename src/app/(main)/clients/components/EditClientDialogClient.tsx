"use client"

import dynamic from "next/dynamic"

// Dynamically import EditClientDialog with SSR disabled to prevent hydration errors
const EditClientDialog = dynamic(() => import("./EditClientDialog"), {
  ssr: false,
})

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  notes?: string
  industry?: string
  yearlyRevenue?: number
  membershipType: "MEMBER" | "NON_MEMBER"
  quotationsCount: number
  totalValue: number
  created_at: string
  createdById?: string
}

interface EditClientDialogClientProps {
  client: Client | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function EditClientDialogClient({ 
  client, 
  isOpen, 
  onOpenChange, 
  onSuccess 
}: EditClientDialogClientProps) {
  return <EditClientDialog client={client} isOpen={isOpen} onOpenChange={onOpenChange} onSuccess={onSuccess} />
}


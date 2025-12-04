"use client"

import dynamic from "next/dynamic"

// Dynamically import DeleteClientDialog with SSR disabled to prevent hydration errors
const DeleteClientDialog = dynamic(() => import("./DeleteClientDialog"), {
  ssr: false,
})

interface DeleteClientDialogClientProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  clientName: string
}

export default function DeleteClientDialogClient({ 
  isOpen, 
  onOpenChange, 
  onConfirm, 
  clientName 
}: DeleteClientDialogClientProps) {
  return <DeleteClientDialog isOpen={isOpen} onOpenChange={onOpenChange} onConfirm={onConfirm} clientName={clientName} />
}


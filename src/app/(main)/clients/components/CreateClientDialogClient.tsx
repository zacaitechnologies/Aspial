"use client"

import dynamic from "next/dynamic"

// Dynamically import CreateClientDialog with SSR disabled to prevent hydration errors
const CreateClientDialog = dynamic(() => import("./CreateClientDialog"), {
  ssr: false,
})

interface CreateClientDialogClientProps {
  onSuccess: () => void
}

export default function CreateClientDialogClient({ onSuccess }: CreateClientDialogClientProps) {
  return <CreateClientDialog onSuccess={onSuccess} />
}


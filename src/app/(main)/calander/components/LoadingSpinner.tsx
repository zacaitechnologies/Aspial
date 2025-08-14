"use client"

import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
}

export function LoadingSpinner({ size = "md", text = "Loading..." }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  }

  return (
    <div className="flex items-center justify-center gap-2 p-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  )
} 
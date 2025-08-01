"use client";

import { GalleryVerticalEnd } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

import { LoginForm } from "./components/LoginForm"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get("code")
  const message = searchParams.get("message")
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    if (code) {
      // If there's a code parameter, redirect to reset password page
      router.replace(`/reset-password?code=${code}`)
    }
    
    if (message) {
      setShowMessage(true)
      // Hide message after 5 seconds
      const timer = setTimeout(() => setShowMessage(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [code, message, router])

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {showMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-800 text-sm">{message}</p>
          </div>
        )}
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Acme Inc.
        </a>
        <LoginForm />
      </div>
    </div>
  )
}

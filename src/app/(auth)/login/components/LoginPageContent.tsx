"use client";

import Image from "next/image"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

import { LoginForm } from "./LoginForm"

export default function LoginPageContent() {
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
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: "url('/images/LoginBackground.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Login Form - Left Side */}
      <div className="absolute left-0 top-5 bottom-5 w-1/3 flex items-center justify-center p-0">
        <div className="w-full max-w-sm space-y-8 rounded-lg p-8">
          {showMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <p className="text-green-800 text-sm">{message}</p>
            </div>
          )}

          {/* Welcome Text */}
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8 text-brand">
              Welcome back!
            </h1>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/images/LoginLogo.png"
              alt="Aspial Production"
              width={200}
              height={60}
              className="object-contain"
            />
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-brand mb-2">
                Log In
              </h2>
              <p className="text-brand-light text-sm font-bold">
                Please enter your details.
              </p>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>

      {/* Studio Image - Floating on Right Side */}
      <div className="absolute right-5 top-5 bottom-5 rounded-3xl overflow-hidden w-2/3">
        <Image
          src="/images/LoginImage-1.png"
          alt="Photography Studio"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  )
} 
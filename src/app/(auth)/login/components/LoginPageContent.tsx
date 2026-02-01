"use client";

import Image from "next/image"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

import { LoginForm } from "./LoginForm"

export default function LoginPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get("code")
  const message = searchParams.get("message")
  const [showMessage, setShowMessage] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

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

  const handleGetStarted = () => {
    setShowLogin(true)
  }

  const handleBack = () => {
    setShowLogin(false)
  }

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center"
      style={{
        backgroundImage: "url('/images/homebackground.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Landing Page */}
      {!showLogin && (
        <div className="flex flex-col items-center justify-center space-y-8 opacity-0 animate-fade-in-up">
          {/* Logo - responsive, centered */}
          <div className="flex justify-center items-center mb-4 sm:mb-6 w-full px-4 opacity-0 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="w-full max-w-[85vw] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[360px] xl:max-w-[400px] flex justify-center">
              <Image
                src="/images/mainlogo.png"
                alt="ASPIAL SINCE 2003"
                width={400}
                height={150}
                className="w-full h-auto object-contain mx-auto"
                priority
                sizes="(max-width: 640px) 85vw, (max-width: 768px) 280px, (max-width: 1024px) 320px, (max-width: 1280px) 360px, 400px"
              />
            </div>
          </div>

          {/* Slogan - responsive text size */}
          <div className="text-center space-y-4 sm:space-y-6 px-4">
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-primary-foreground font-medium max-w-3xl opacity-0 animate-fade-in-down" style={{ animationDelay: '0.2s' }}>
              We don't build brands. We build futures together.
            </p>
          </div>

          {/* Start Now Button - primary, white text */}
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 text-base sm:text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              START NOW
            </Button>
          </div>
        </div>
      )}

      {/* Login Form */}
      {showLogin && (
        <div className="w-full max-w-md px-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Back Button */}
          <div className="mb-4 opacity-0 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <Button
              onClick={handleBack}
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:text-primary-foreground/80 hover:bg-background/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {/* Login Content - No Card Background */}
          <div className="space-y-8">
            {showMessage && (
              <div className="bg-green-50/90 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 mb-6 opacity-0 animate-fade-in backdrop-blur-sm">
                <p className="text-green-800 dark:text-green-200 text-sm">{message}</p>
              </div>
            )}

            {/* Logo - responsive, centered for login view */}
            <div className="flex justify-center items-center mb-6 w-full opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-full max-w-[200px] sm:max-w-[250px] md:max-w-[300px] flex justify-center">
                <Image
                  src="/images/mainlogo.png"
                  alt="ASPIAL SINCE 2003"
                  width={300}
                  height={112}
                  className="w-full h-auto object-contain mx-auto"
                  sizes="(max-width: 640px) 200px, (max-width: 768px) 250px, 300px"
                />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="text-center opacity-0 animate-fade-in-down" style={{ animationDelay: '0.3s' }}>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-primary-foreground">
                Welcome Back!
              </h1>
              <p className="text-lg text-primary-foreground/90">
                Let's Login to Your Account
              </p>
            </div>

            {/* Login Form */}
            <div className="space-y-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <LoginForm />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
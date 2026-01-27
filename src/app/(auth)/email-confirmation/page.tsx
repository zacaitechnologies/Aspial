"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Mail, Loader2, CheckCircle2, ArrowLeft } from "lucide-react"
import { resendConfirmationEmail } from "@/lib/auth-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"

function EmailConfirmationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email") || ""
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleResend = async () => {
    if (!email) {
      setError("Email address is required")
      return
    }

    setIsResending(true)
    setError("")
    setResendSuccess(false)

    try {
      const result = await resendConfirmationEmail(email)
      if (result.success) {
        setResendSuccess(true)
      } else {
        setError(result.error || "Failed to resend confirmation email")
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      setIsResending(false)
    }
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
      <div className="w-full max-w-md px-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        {/* Back Button */}
        <div className="mb-4 opacity-0 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Button
            onClick={() => router.push("/login")}
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:text-primary-foreground/80 hover:bg-background/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
        </div>

        {/* Content - No Card Background */}
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Image
              src="/images/mainlogo.png"
              alt="ASPIAL SINCE 2003"
              width={300}
              height={112}
              className="object-contain"
            />
          </div>

          {/* Title Text */}
          <div className="text-center opacity-0 animate-fade-in-down" style={{ animationDelay: '0.3s' }}>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-primary-foreground">
              Email Confirmation Required
            </h1>
            <p className="text-lg text-primary-foreground/90">
              Please confirm your email address to continue
            </p>
          </div>

          {/* Email Display */}
          {email && (
            <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="p-4 bg-background/10 backdrop-blur-sm border border-border/20 rounded-md">
                <p className="text-sm text-primary-foreground/90 text-center">
                  <strong className="text-primary-foreground">Email:</strong> {email}
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="space-y-2">
              <p className="text-sm text-primary-foreground/90 text-center">
                We've sent a confirmation email to your inbox. Please check your email (including your spam folder) and click the confirmation link to verify your account.
              </p>
              <p className="text-sm text-primary-foreground/90 text-center">
                If you didn't receive the email, you can resend it using the button below.
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/50 rounded-md p-4 backdrop-blur-sm">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {resendSuccess && (
              <div className="bg-green-50/90 border border-green-200 rounded-md p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    Confirmation email sent successfully! Please check your inbox (including your spam folder).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="space-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <Button
              onClick={handleResend}
              disabled={isResending || !email}
              className="w-full px-10 py-6 text-lg font-semibold bg-background/95 text-foreground hover:bg-background transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 border border-border"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  Resend Confirmation Email
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmailConfirmationPage() {
  return (
    <Suspense fallback={
      <div 
        className="min-h-screen relative flex items-center justify-center"
        style={{
          backgroundImage: "url('/images/homebackground.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
        </div>
      </div>
    }>
      <EmailConfirmationContent />
    </Suspense>
  )
}


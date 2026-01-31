"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [autoRetryCount, setAutoRetryCount] = useState(0)

  useEffect(() => {
    // Log the error to an error reporting service in production
    if (process.env.NODE_ENV === "development") {
      console.error("Main section error:", error)
    }
  }, [error])

  // Auto-retry once on initial load (handles transient hydration errors)
  useEffect(() => {
    if (autoRetryCount < 1) {
      const timer = setTimeout(() => {
        setAutoRetryCount((prev) => prev + 1)
        reset()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [autoRetryCount, reset])

  // Show loading state during auto-retry
  if (autoRetryCount < 1) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const handleRetry = () => {
    setIsRetrying(true)
    setTimeout(() => {
      reset()
      setIsRetrying(false)
    }, 500)
  }

  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <RefreshCw className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            We encountered an issue loading this page. Please try again or return to the projects page.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRetry}
            variant="outline"
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </>
            )}
          </Button>
          <Link href="/projects">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              Go to Projects
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

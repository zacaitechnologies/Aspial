"use client"

import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    if (process.env.NODE_ENV === "development") {
      console.error("Global error:", error)
    }
  }, [error])

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              Loading...
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Please wait while we set things up. If this takes too long, try refreshing the page.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => reset()}
              variant="outline"
            >
              Try again
            </Button>
            <Button
              onClick={() => window.location.href = "/login"}
            >
              Go to Login
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}

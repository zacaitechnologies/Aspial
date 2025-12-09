"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get("message")

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        {errorMessage && (
          <p className="text-muted-foreground">{errorMessage}</p>
        )}
        {!errorMessage && (
          <p className="text-muted-foreground">Sorry, an error occurred. Please try again.</p>
        )}
        <div className="flex gap-4 justify-center">
          <Link href="/signup">
            <Button variant="outline">Try Signing Up Again</Button>
          </Link>
          <Link href="/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Trash2 } from "lucide-react"
import { emergencyClearAllCaches } from "../actions/emergency-cache-clear"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export default function ClearCachePage() {
  const [isClearing, setIsClearing] = useState(false)
  const router = useRouter()

  const handleClearCache = async () => {
    if (!confirm("⚠️ This will clear ALL role caches server-wide. Continue?")) {
      return
    }

    setIsClearing(true)
    try {
      const result = await emergencyClearAllCaches()
      
      if (result.success) {
        toast({
          title: "Success",
          description: "All caches cleared. Page will reload.",
        })
        
        // Clear client-side caches too
        localStorage.clear()
        sessionStorage.clear()
        
        setTimeout(() => {
          router.refresh()
        }, 1000)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to clear caches",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear caches",
        variant: "destructive",
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Emergency Cache Clear
          </CardTitle>
          <CardDescription>
            Admin only - Force clear all role caches server-wide
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-900 font-medium mb-2">⚠️ Warning</p>
            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>This will clear ALL role caches for ALL users</li>
              <li>All users may experience a brief slowdown as caches rebuild</li>
              <li>Use this only if users are seeing incorrect roles after changes</li>
              <li>Client-side caches (localStorage/sessionStorage) will also be cleared</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">ℹ️ When to use this</p>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>User role was changed but they still see old permissions</li>
              <li>Operation-user can still access restricted pages</li>
              <li>Sidebar shows wrong items after role update</li>
              <li>After bulk user role changes</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-900 font-medium mb-2">✅ Alternative solutions (try first)</p>
            <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
              <li>Ask the affected user to logout and login again</li>
              <li>Wait 30 seconds for cache to expire naturally</li>
              <li>User can clear their browser cache (Ctrl+Shift+Delete)</li>
            </ul>
          </div>

          <Button
            onClick={handleClearCache}
            disabled={isClearing}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {isClearing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Clearing All Caches...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Role Caches
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


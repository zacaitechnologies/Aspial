"use client"

import { useSession } from "../contexts/SessionProvider"
import { useEffect, useState } from "react"
import { checkIsAdmin, checkIsOperationUser, checkIsBrandAdvisor, getUserRole, debugGetUserRoles, clearUserCache, clearAllCaches } from "../actions/admin-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function DebugRolePage() {
  const { enhancedUser } = useSession()
  const [roleInfo, setRoleInfo] = useState<any>(null)
  const [dbRoleInfo, setDbRoleInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRoleInfo = async () => {
      if (!enhancedUser?.id) return

      try {
        const [isAdmin, isOperationUser, isBrandAdvisor, role, dbInfo] = await Promise.all([
          checkIsAdmin(enhancedUser.id),
          checkIsOperationUser(enhancedUser.id),
          checkIsBrandAdvisor(enhancedUser.id),
          getUserRole(enhancedUser.id),
          debugGetUserRoles(enhancedUser.id)
        ])

        setRoleInfo({
          userId: enhancedUser.id,
          email: enhancedUser.email,
          isAdmin,
          isOperationUser,
          isBrandAdvisor,
          role,
          timestamp: new Date().toISOString()
        })
        
        setDbRoleInfo(dbInfo)
      } catch (error) {
        console.error("Error fetching role info:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRoleInfo()
  }, [enhancedUser])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }
  
  const handleRefresh = () => {
    setLoading(true)
    window.location.reload()
  }
  
  const handleClearMyCache = async () => {
    if (!enhancedUser?.id) return
    setLoading(true)
    try {
      await clearUserCache(enhancedUser.id)
      window.location.reload()
    } catch (error) {
      console.error('Error clearing cache:', error)
      setLoading(false)
    }
  }
  
  const handleClearAllCaches = async () => {
    setLoading(true)
    try {
      await clearAllCaches()
      window.location.reload()
    } catch (error) {
      console.error('Error clearing all caches:', error)
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Role Debug Information</h1>
        <div className="flex gap-2">
          <Button onClick={handleClearMyCache} variant="outline">
            Clear My Cache
          </Button>
          <Button onClick={handleClearAllCaches} variant="outline">
            Clear All Caches
          </Button>
          <Button onClick={handleRefresh} variant="default">
            Refresh
          </Button>
        </div>
      </div>

      {/* Cached Role Info */}
      <Card>
        <CardHeader>
          <CardTitle>Cached Role Status</CardTitle>
          <CardDescription>From cached permission checks (may be stale)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">User ID (Supabase Auth)</p>
            <p className="text-sm font-mono">{roleInfo?.userId}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{roleInfo?.email}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Role Status</p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={roleInfo?.isAdmin ? "default" : "secondary"}>
                {roleInfo?.isAdmin ? "✓" : "✗"} Admin
              </Badge>
              <Badge variant={roleInfo?.isBrandAdvisor ? "default" : "secondary"}>
                {roleInfo?.isBrandAdvisor ? "✓" : "✗"} Brand Advisor
              </Badge>
              <Badge variant={roleInfo?.isOperationUser ? "destructive" : "secondary"}>
                {roleInfo?.isOperationUser ? "✓" : "✗"} Operation User
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Primary Role</p>
            <Badge className="mt-1">{roleInfo?.role || "None"}</Badge>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Checked At</p>
            <p className="text-xs font-mono">{roleInfo?.timestamp}</p>
          </div>

          {roleInfo?.isOperationUser && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm font-medium text-yellow-900">⚠️ Operation User Restrictions Active</p>
              <p className="text-xs text-yellow-700 mt-1">
                You should NOT see: Clients, Services, Payments (Quotations/Invoices/Receipts), User Management
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw Database Info */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Database Query</CardTitle>
          <CardDescription>Direct database lookup (not cached)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dbRoleInfo?.found ? (
            <>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Found By</p>
                <Badge>{dbRoleInfo.searchedBy}</Badge>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">User ID (Public DB)</p>
                <p className="text-sm font-mono">{dbRoleInfo.userId}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Supabase ID</p>
                <p className="text-sm font-mono">{dbRoleInfo.supabaseId}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{dbRoleInfo.firstName} {dbRoleInfo.lastName}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{dbRoleInfo.email}</p>
              </div>
              
              {dbRoleInfo.staffRole && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Staff Role</p>
                  <Badge variant="outline">{dbRoleInfo.staffRole.roleName}</Badge>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">System Roles (userRoles table)</p>
                {dbRoleInfo.userRoles && dbRoleInfo.userRoles.length > 0 ? (
                  <div className="space-y-2">
                    {dbRoleInfo.userRoles.map((ur: any) => (
                      <div key={ur.id} className="p-2 bg-muted rounded text-sm">
                        <p><strong>Slug:</strong> {ur.role.slug}</p>
                        <p className="text-xs text-muted-foreground">Role ID: {ur.role.id}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-destructive">⚠️ NO ROLES ASSIGNED IN DATABASE!</p>
                )}
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role Slugs</p>
                <div className="flex gap-2 flex-wrap mt-1">
                  {dbRoleInfo.roleSlugs && dbRoleInfo.roleSlugs.length > 0 ? (
                    dbRoleInfo.roleSlugs.map((slug: string) => (
                      <Badge key={slug} variant="default">{slug}</Badge>
                    ))
                  ) : (
                    <Badge variant="destructive">No roles</Badge>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm font-medium text-destructive">❌ User not found in database!</p>
              {dbRoleInfo?.error && (
                <p className="text-xs text-muted-foreground mt-1">Error: {dbRoleInfo.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


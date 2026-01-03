"use client"

import { useSession } from "../contexts/SessionProvider"
import { useEffect, useState } from "react"
import { checkIsAdmin, checkIsOperationUser, checkIsBrandAdvisor, getUserRole } from "../actions/admin-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function DebugRolePage() {
  const { enhancedUser } = useSession()
  const [roleInfo, setRoleInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRoleInfo = async () => {
      if (!enhancedUser?.id) return

      try {
        const [isAdmin, isOperationUser, isBrandAdvisor, role] = await Promise.all([
          checkIsAdmin(enhancedUser.id),
          checkIsOperationUser(enhancedUser.id),
          checkIsBrandAdvisor(enhancedUser.id),
          getUserRole(enhancedUser.id)
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

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Role Debug Information</CardTitle>
          <CardDescription>Current user role and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">User ID (Supabase)</p>
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
    </div>
  )
}


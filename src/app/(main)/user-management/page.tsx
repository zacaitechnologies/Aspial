"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/PasswordInput"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Mail, User, Shield, Loader2, Edit, Key, Briefcase, Users, RefreshCw, AlertCircle, Ban, CheckCircle } from "lucide-react"
import { 
  getUsersPaginated, 
  createUserAccount, 
  deleteUserAccount, 
  updateUserAccount, 
  changeUserPassword, 
  getAllStaffRoles,
  createStaffRole,
  updateStaffRole,
  deleteStaffRole,
  getAllRoles,
  checkOrphanedAuthAccounts,
  linkOrphanedAccount,
  banUser,
  unbanUser,
  getUserBanStatus,
  UserWithRole, 
  StaffRole 
} from "./action"
import { checkIsAdmin, checkIsOperationUser } from "../actions/admin-actions"
import { useSession } from "../contexts/SessionProvider"
import AccessDenied from "../components/AccessDenied"
import { usePaginatedData } from "@/hooks/use-paginated-data"
import { ProjectPagination } from "../projects/components/ProjectPagination"
import { toast } from "@/components/ui/use-toast"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

export default function UserManagementPage() {
  const router = useRouter()
  const { enhancedUser } = useSession()
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([])
  const [availableRoles, setAvailableRoles] = useState<{ id: string; slug: string }[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOperationUser, setIsOperationUser] = useState<boolean | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  // Create form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [staffRoleId, setStaffRoleId] = useState<string>("none")
  const [roleSlug, setRoleSlug] = useState<string>("brand-advisor")
  const [error, setError] = useState("")

  // Edit form state
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const [editFirstName, setEditFirstName] = useState("")
  const [editLastName, setEditLastName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editStaffRoleId, setEditStaffRoleId] = useState<string>("none")
  const [editRoleSlug, setEditRoleSlug] = useState<string>("none")
  const [editError, setEditError] = useState("")

  // Password change state
  const [newPassword, setNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  // Tab state
  const [activeTab, setActiveTab] = useState("users")

  // Staff role management states
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false)
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false)
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null)
  const [roleName, setRoleName] = useState("")
  const [editRoleName, setEditRoleName] = useState("")
  const [roleError, setRoleError] = useState("")
  const [editRoleError, setEditRoleError] = useState("")
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [deleteUserName, setDeleteUserName] = useState<string>("")
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null)
  const [deleteRoleName, setDeleteRoleName] = useState<string>("")
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [isDeletingRole, setIsDeletingRole] = useState(false)

  // Orphaned accounts state
  const [orphanedAccounts, setOrphanedAccounts] = useState<any[]>([])
  const [isCheckingOrphans, setIsCheckingOrphans] = useState(false)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [linkingAccount, setLinkingAccount] = useState<any>(null)
  const [linkFirstName, setLinkFirstName] = useState("")
  const [linkLastName, setLinkLastName] = useState("")
  const [linkStaffRoleId, setLinkStaffRoleId] = useState<string>("none")
  const [linkRoleSlug, setLinkRoleSlug] = useState<string>("staff")
  const [linkError, setLinkError] = useState("")
  const [isLinking, setIsLinking] = useState(false)

  // Ban/unban state
  const [userBanStatuses, setUserBanStatuses] = useState<Record<string, boolean>>({})
  const [isBanningUser, setIsBanningUser] = useState<string | null>(null)
  const [isUnbanningUser, setIsUnbanningUser] = useState<string | null>(null)

  // Pagination for users
  const {
    data: users,
    isLoading: loading,
    page,
    pageSize,
    total,
    totalPages,
    goToPage,
    setPageSize,
    refresh: refreshUsers,
    invalidateCache,
  } = usePaginatedData<UserWithRole, any>({
    fetchFn: async (page, pageSize) => {
      return await getUsersPaginated(page, pageSize)
    },
    initialPage: 1,
    initialPageSize: 12,
  })

  const fetchStaffRoles = useCallback(async () => {
    try {
      const roles = await getAllStaffRoles()
      setStaffRoles(roles)
    } catch (error: any) {
      console.error("Failed to fetch staff roles:", error)
    }
  }, [])

  const fetchAvailableRoles = useCallback(async () => {
    try {
      const roles = await getAllRoles()
      setAvailableRoles(roles)
    } catch (error: any) {
      console.error("Failed to fetch roles:", error)
    }
  }, [])

  const fetchUserBanStatuses = useCallback(async () => {
    if (!users || users.length === 0) return
    
    try {
      const statusPromises = users.map(async (user) => {
        try {
          const status = await getUserBanStatus(user.id)
          return { userId: user.id, isBanned: status.isBanned }
        } catch (error) {
          console.error(`Failed to get ban status for user ${user.id}:`, error)
          return { userId: user.id, isBanned: false }
        }
      })
      
      const statuses = await Promise.all(statusPromises)
      const statusMap: Record<string, boolean> = {}
      statuses.forEach(({ userId, isBanned }) => {
        statusMap[userId] = isBanned
      })
      setUserBanStatuses(statusMap)
    } catch (error) {
      console.error("Error fetching user ban statuses:", error)
    }
  }, [users])

  const checkAdminAndFetchData = useCallback(async () => {
    if (!enhancedUser?.id) {
      router.push("/")
      return
    }

    try {
      const [adminStatus, operationUserStatus] = await Promise.all([
        checkIsAdmin(enhancedUser.id),
        checkIsOperationUser(enhancedUser.id)
      ])
      setIsAdmin(adminStatus)
      setIsOperationUser(operationUserStatus)

      // User management is admin-only
      if (!adminStatus) {
        return
      }

      await Promise.all([
        fetchStaffRoles(),
        fetchAvailableRoles(),
        checkForOrphanedAccounts()
      ])
    } catch (error) {
      console.error("Error checking admin status:", error)
    }
  }, [enhancedUser?.id, router, fetchStaffRoles, fetchAvailableRoles])

  const checkForOrphanedAccounts = useCallback(async () => {
    setIsCheckingOrphans(true)
    try {
      const orphaned = await checkOrphanedAuthAccounts()
      setOrphanedAccounts(orphaned)
    } catch (error: any) {
      console.error("Failed to check orphaned accounts:", error)
    } finally {
      setIsCheckingOrphans(false)
    }
  }, [])

  useEffect(() => {
    checkAdminAndFetchData()
  }, [checkAdminAndFetchData])

  useEffect(() => {
    if (users && users.length > 0) {
      fetchUserBanStatuses()
    }
  }, [users, fetchUserBanStatuses])

  // Show access denied for operation users or non-admins
  if (isOperationUser === null) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20 text-primary">
          <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-lg font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  if (isOperationUser || !isAdmin) {
    return <AccessDenied />
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsCreating(true)

    try {
      // Basic validation
      if (!firstName || !lastName || !email || !password) {
        setError("All fields are required")
        return
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters")
        return
      }

      // Validate role selection
      if (!roleSlug || roleSlug === "none") {
        setError("Please select a system role")
        return
      }

      const result = await createUserAccount({
        firstName,
        lastName,
        email,
        password,
        staffRoleId: staffRoleId && staffRoleId !== "none" ? staffRoleId : undefined,
        roleSlug: roleSlug,
      })

      if (result.success) {
        // Reset form
        setFirstName("")
        setLastName("")
        setEmail("")
        setPassword("")
        setStaffRoleId("none")
        setRoleSlug("brand-advisor")
        setIsCreateDialogOpen(false)
        
        // Refresh users list and check for orphaned accounts
        invalidateCache()
        await refreshUsers()
        await checkForOrphanedAccounts()
        
        toast({
          title: "Success",
          description: "User created successfully",
        })
      } else {
        setError(result.error || "Failed to create user")
        // If unauthorized or forbidden, redirect to home
        if (result.error?.includes("Unauthorized") || result.error?.includes("Forbidden")) {
          router.push("/")
        }
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  const handleLinkOrphanedAccount = (account: any) => {
    setLinkingAccount(account)
    setLinkFirstName("")
    setLinkLastName("")
    setLinkStaffRoleId("none")
    setLinkRoleSlug("brand-advisor")
    setLinkError("")
    setIsLinkDialogOpen(true)
  }

  const confirmLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkingAccount) return

    setLinkError("")
    setIsLinking(true)

    try {
      // Basic validation
      if (!linkFirstName || !linkLastName) {
        setLinkError("First name and last name are required")
        return
      }

      // Validate role selection
      if (!linkRoleSlug || linkRoleSlug === "none") {
        setLinkError("Please select a system role")
        return
      }

      const result = await linkOrphanedAccount({
        supabaseId: linkingAccount.id,
        email: linkingAccount.email,
        firstName: linkFirstName,
        lastName: linkLastName,
        staffRoleId: linkStaffRoleId && linkStaffRoleId !== "none" ? linkStaffRoleId : undefined,
        roleSlug: linkRoleSlug,
      })

      if (result.success) {
        setIsLinkDialogOpen(false)
        setLinkingAccount(null)
        
        // Refresh users list and check for orphaned accounts
        invalidateCache()
        await refreshUsers()
        await checkForOrphanedAccounts()
        
        toast({
          title: "Success",
          description: "Account linked successfully",
        })
      } else {
        setLinkError(result.error || "Failed to link account")
      }
    } catch (error) {
      setLinkError("An unexpected error occurred")
    } finally {
      setIsLinking(false)
    }
  }

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user)
    setEditFirstName(user.firstName)
    setEditLastName(user.lastName)
    setEditEmail(user.email)
    setEditStaffRoleId(user.staffRoleId || "none")
    // Set the current role slug (users typically have one role)
    const currentRoleSlug = user.roles && user.roles.length > 0 ? user.roles[0].role.slug : "none"
    setEditRoleSlug(currentRoleSlug)
    setEditError("")
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setEditError("")
    setIsUpdating(true)

    try {
      // Basic validation
      if (!editFirstName || !editLastName || !editEmail) {
        setEditError("First name, last name, and email are required")
        return
      }

      // Validate role selection
      if (!editRoleSlug || editRoleSlug === "none") {
        setEditError("Please select a system role")
        return
      }

      const result = await updateUserAccount({
        userId: editingUser.id,
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        staffRoleId: editStaffRoleId && editStaffRoleId !== "none" ? editStaffRoleId : null,
        roleSlug: editRoleSlug,
      })

      if (result.success) {
        setIsEditDialogOpen(false)
        setEditingUser(null)
        
        // Refresh users list
        invalidateCache()
        await refreshUsers()
        
        toast({
          title: "Success",
          description: "User updated successfully",
        })
      } else {
        setEditError(result.error || "Failed to update user")
        // If unauthorized or forbidden, redirect to home
        if (result.error?.includes("Unauthorized") || result.error?.includes("Forbidden")) {
          router.push("/")
        }
      }
    } catch (error) {
      setEditError("An unexpected error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleOpenPasswordDialog = (user: UserWithRole) => {
    setEditingUser(user)
    setNewPassword("")
    setPasswordError("")
    setIsPasswordDialogOpen(true)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setPasswordError("")
    setIsChangingPassword(true)

    try {
      if (!newPassword) {
        setPasswordError("Password is required")
        return
      }

      if (newPassword.length < 6) {
        setPasswordError("Password must be at least 6 characters")
        return
      }

      const result = await changeUserPassword({
        userId: editingUser.id,
        newPassword,
      })

      if (result.success) {
        setIsPasswordDialogOpen(false)
        setEditingUser(null)
        setNewPassword("")
      } else {
        setPasswordError(result.error || "Failed to change password")
        // If unauthorized or forbidden, redirect to home
        if (result.error?.includes("Unauthorized") || result.error?.includes("Forbidden")) {
          router.push("/")
        }
      }
    } catch (error) {
      setPasswordError("An unexpected error occurred")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    setDeleteUserId(userId)
    setDeleteUserName(userName)
  }

  const confirmDeleteUser = async () => {
    if (!deleteUserId) return
    
    setIsDeletingUser(true)
    try {
      const result = await deleteUserAccount(deleteUserId)
      
      if (result.success) {
        invalidateCache()
        await refreshUsers()
        setDeleteUserId(null)
        setDeleteUserName("")
        toast({
          title: "Success",
          description: "User deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete user",
          variant: "destructive",
        })
        // If unauthorized or forbidden, redirect to home
        if (result.error?.includes("Unauthorized") || result.error?.includes("Forbidden")) {
          router.push("/")
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeletingUser(false)
    }
  }

  // Staff role management handlers
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setRoleError("")
    setIsCreatingRole(true)

    try {
      if (!roleName.trim()) {
        setRoleError("Role name is required")
        return
      }

      const result = await createStaffRole({ roleName: roleName.trim() })

      if (result.success) {
        setRoleName("")
        setIsCreateRoleDialogOpen(false)
        await fetchStaffRoles()
      } else {
        setRoleError(result.error || "Failed to create role")
      }
    } catch (error) {
      setRoleError("An unexpected error occurred")
    } finally {
      setIsCreatingRole(false)
    }
  }

  const handleEditRole = (role: StaffRole) => {
    setEditingRole(role)
    setEditRoleName(role.roleName)
    setEditRoleError("")
    setIsEditRoleDialogOpen(true)
  }

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRole) return

    setEditRoleError("")
    setIsUpdatingRole(true)

    try {
      if (!editRoleName.trim()) {
        setEditRoleError("Role name is required")
        return
      }

      const result = await updateStaffRole({
        id: editingRole.id,
        roleName: editRoleName.trim(),
      })

      if (result.success) {
        setIsEditRoleDialogOpen(false)
        setEditingRole(null)
        await fetchStaffRoles()
        invalidateCache()
        await refreshUsers()
      } else {
        setEditRoleError(result.error || "Failed to update role")
      }
    } catch (error) {
      setEditRoleError("An unexpected error occurred")
    } finally {
      setIsUpdatingRole(false)
    }
  }

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    setDeleteRoleId(roleId)
    setDeleteRoleName(roleName)
  }

  const confirmDeleteRole = async () => {
    if (!deleteRoleId) return
    
    setIsDeletingRole(true)
    try {
      const result = await deleteStaffRole(deleteRoleId)
      
      if (result.success) {
        await fetchStaffRoles()
        invalidateCache()
        await refreshUsers()
        setDeleteRoleId(null)
        setDeleteRoleName("")
        toast({
          title: "Success",
          description: "Role deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete role",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeletingRole(false)
    }
  }

  const handleBanUser = async (userId: string) => {
    setIsBanningUser(userId)
    try {
      const result = await banUser(userId)
      
      if (result.success) {
        // Update local ban status
        setUserBanStatuses(prev => ({ ...prev, [userId]: true }))
        invalidateCache()
        await refreshUsers()
        toast({
          title: "Success",
          description: "User has been disabled.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to disable user",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsBanningUser(null)
    }
  }

  const handleUnbanUser = async (userId: string) => {
    setIsUnbanningUser(userId)
    try {
      const result = await unbanUser(userId)
      
      if (result.success) {
        // Update local ban status
        setUserBanStatuses(prev => ({ ...prev, [userId]: false }))
        invalidateCache()
        await refreshUsers()
        toast({
          title: "Success",
          description: "User has been reactivated.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reactivate user",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUnbanningUser(null)
    }
  }

  if (!isAdmin) {
    return null
  }


  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8" />
          User Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage staff accounts, permissions, and roles
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full" onValueChange={setActiveTab}>
        <div className="relative">
          <TabsList className="grid w-full grid-cols-2 bg-transparent border-primary border-1 transition-all duration-300 ease-in-out">
            <TabsTrigger 
              value="users" 
              className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
            >
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="staff-roles" 
              className="transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
            >
              Staff Roles
            </TabsTrigger>
          </TabsList>
          {/* Sliding indicator */}
          <div 
            className={`absolute top-1 h-[calc(100%-8px)] bg-secondary transition-all duration-300 ease-in-out rounded-md z-0 ${
              activeTab === "users" 
                ? "left-1 w-[calc(50%-4px)]" 
                : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
            }`}
          />
        </div>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Orphaned Accounts Alert */}
          {orphanedAccounts.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <AlertCircle className="w-5 h-5" />
                  Orphaned Auth Accounts Found
                </CardTitle>
                <CardDescription className="text-orange-700">
                  {orphanedAccounts.length} email(s) registered in authentication but not linked to user accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {orphanedAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between bg-white p-3 rounded-md">
                      <div>
                        <p className="font-medium">{account.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Registered: {new Date(account.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLinkOrphanedAccount(account)}
                      >
                        Link Account
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Staff Users</h2>
              <p className="text-sm text-muted-foreground">Manage user accounts and permissions</p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => checkForOrphanedAccounts()}
                disabled={isCheckingOrphans}
              >
                {isCheckingOrphans ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>

            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new staff account. Admin accounts cannot be created here.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">System Role *</Label>
                <Select value={roleSlug} onValueChange={setRoleSlug}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a system role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles
                      .filter((role) => role.slug !== "admin")
                      .map((role) => (
                        <SelectItem key={role.id} value={role.slug}>
                          {role.slug === "admin" ? "Admin" : role.slug === "brand-advisor" ? "Brand Advisor" : role.slug === "operation-user" ? "Operation User" : role.slug === "staff" ? "Staff" : role.slug}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  System roles control access permissions (brand-advisor, operation-user, staff)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staffRole">Staff Role</Label>
                <Select value={staffRoleId || "none"} onValueChange={setStaffRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {staffRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Staff roles are for organizational purposes (e.g., Photographer, Editor)
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    setError("")
                    setFirstName("")
                    setLastName("")
                    setEmail("")
                    setPassword("")
                    setStaffRoleId("none")
                    setRoleSlug("none")
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Grid with Loading Overlay */}
      <div className="relative">
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {users.map((user) => {
          const isBanned = userBanStatuses[user.id] || false
          const isBanning = isBanningUser === user.id
          const isUnbanning = isUnbanningUser === user.id
          
          return (
          <Card key={user.id} className={`card flex flex-col h-full ${isBanned ? 'opacity-60 border-red-200' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg flex items-center gap-2 mb-1">
                    <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="line-clamp-2" title={`${user.firstName} ${user.lastName}`}>{user.firstName} {user.lastName}</span>
                    {isBanned && (
                      <Badge variant="destructive" className="ml-2">
                        Disabled
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 break-all">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    {user.email}
                  </CardDescription>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                    title="Edit User"
                    disabled={isBanned}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenPasswordDialog(user)}
                    title="Change Password"
                    disabled={isBanned}
                  >
                    <Key className="w-4 h-4" />
                  </Button>
                  {isBanned ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnbanUser(user.id)}
                      title="Reactivate User"
                      disabled={isUnbanning}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      {isUnbanning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBanUser(user.id)}
                      title="Disable User"
                      disabled={isBanning}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isBanning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Role:</span>
                  {user.roles.map((userRole) => (
                    <Badge key={userRole.role.id} variant="secondary">
                      {userRole.role.slug}
                    </Badge>
                  ))}
                </div>
                {user.staffRole && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Staff Role:</span>
                    <Badge variant="outline">
                      {user.staffRole.roleName}
                    </Badge>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
          )
        })}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 text-primary">
              <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading users…</p>
            </div>
          </div>
        )}
      </div>

      {!loading && users.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No staff users found</p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First User
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      <ProjectPagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        total={total}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
      />
        </TabsContent>

        {/* Staff Roles Tab */}
        <TabsContent value="staff-roles" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Staff Roles</h2>
              <p className="text-sm text-muted-foreground">Manage staff role types</p>
            </div>

            <Dialog open={isCreateRoleDialogOpen} onOpenChange={setIsCreateRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Staff Role</DialogTitle>
                  <DialogDescription>
                    Add a new staff role type (e.g., Photographer, Editor)
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateRole} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="roleName">Role Name *</Label>
                    <Input
                      id="roleName"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      placeholder="e.g., Photographer"
                      required
                    />
                  </div>

                  {roleError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                      {roleError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateRoleDialogOpen(false)
                        setRoleError("")
                        setRoleName("")
                      }}
                      disabled={isCreatingRole}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreatingRole}>
                      {isCreatingRole ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Role"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffRoles.map((role) => {
              const usersCount = users.filter(u => u.staffRoleId === role.id).length
              
              return (
                <Card key={role.id} className="card flex flex-col h-full">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg flex items-center gap-2 mb-1">
                          <Briefcase className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          <span className="line-clamp-2" title={role.roleName}>{role.roleName}</span>
                        </CardTitle>
                        <CardDescription>
                          {usersCount} {usersCount === 1 ? 'user' : 'users'} assigned
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                          title="Edit Role"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRole(role.id, role.roleName)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete Role"
                          disabled={usersCount > 0}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>

          {staffRoles.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No staff roles found</p>
                <Button className="mt-4" onClick={() => setIsCreateRoleDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Role
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and staff role
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name *</Label>
                <Input
                  id="editFirstName"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name *</Label>
                <Input
                  id="editLastName"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">Email *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editRole">System Role *</Label>
              <Select 
                value={editRoleSlug} 
                onValueChange={setEditRoleSlug}
                disabled={editingUser?.roles?.some(r => r.role.slug === "admin")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a system role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    .filter((role) => {
                      // Show admin only if current user has it (for display purposes)
                      if (role.slug === "admin") {
                        return editingUser?.roles?.some(r => r.role.slug === "admin")
                      }
                      return true
                    })
                    .map((role) => (
                      <SelectItem 
                        key={role.id} 
                        value={role.slug}
                        disabled={role.slug === "admin"}
                      >
                        {role.slug === "admin" ? "Admin" : role.slug === "brand-advisor" ? "Brand Advisor" : role.slug === "operation-user" ? "Operation User" : role.slug}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {editingUser?.roles?.some(r => r.role.slug === "admin") && (
                <p className="text-xs text-amber-600">
                  This user has admin role. Admin role cannot be changed through this interface.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                System roles control access permissions (brand-advisor, operation-user)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStaffRole">Staff Role</Label>
              <Select value={editStaffRoleId || "none"} onValueChange={setEditStaffRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {staffRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Staff roles are for organizational purposes (e.g., Photographer, Editor)
              </p>
            </div>

            {editError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {editError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditError("")
                }}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update User"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {editingUser?.firstName} {editingUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password *</Label>
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
              />
            </div>

            {passwordError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {passwordError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPasswordDialogOpen(false)
                  setPasswordError("")
                }}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Role</DialogTitle>
            <DialogDescription>
              Update staff role name
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editRoleName">Role Name *</Label>
              <Input
                id="editRoleName"
                value={editRoleName}
                onChange={(e) => setEditRoleName(e.target.value)}
                placeholder="e.g., Photographer"
                required
              />
            </div>

            {editRoleError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {editRoleError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditRoleDialogOpen(false)
                  setEditRoleError("")
                }}
                disabled={isUpdatingRole}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingRole}>
                {isUpdatingRole ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Role"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={deleteRoleId !== null}
        onClose={() => setDeleteRoleId(null)}
        onConfirm={confirmDeleteRole}
        title="Delete Role"
        description={`Are you sure you want to delete the role "${deleteRoleName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingRole}
      />

      {/* Link Orphaned Account Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Registered Account</DialogTitle>
            <DialogDescription>
              This email ({linkingAccount?.email}) is registered in authentication but not linked to a user account. Fill in the details to complete the account setup.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={confirmLinkAccount} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkFirstName">First Name *</Label>
                <Input
                  id="linkFirstName"
                  value={linkFirstName}
                  onChange={(e) => setLinkFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkLastName">Last Name *</Label>
                <Input
                  id="linkLastName"
                  value={linkLastName}
                  onChange={(e) => setLinkLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkRole">System Role *</Label>
              <Select value={linkRoleSlug} onValueChange={setLinkRoleSlug}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a system role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    .filter((role) => role.slug !== "admin")
                    .map((role) => (
                      <SelectItem key={role.id} value={role.slug}>
                        {role.slug === "admin" ? "Admin" : role.slug === "brand-advisor" ? "Brand Advisor" : role.slug === "operation-user" ? "Operation User" : role.slug === "staff" ? "Staff" : role.slug}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkStaffRole">Staff Role</Label>
              <Select value={linkStaffRoleId} onValueChange={setLinkStaffRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {staffRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {linkError && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm">
                {linkError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsLinkDialogOpen(false)}
                disabled={isLinking}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLinking}>
                {isLinking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  "Link Account"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}


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
import { Plus, Trash2, Mail, User, Shield, Loader2, Edit, Key, Briefcase, Users } from "lucide-react"
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
  const [roleSlug, setRoleSlug] = useState<string>("none")
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
        fetchAvailableRoles()
      ])
    } catch (error) {
      console.error("Error checking admin status:", error)
    }
  }, [enhancedUser?.id, router, fetchStaffRoles, fetchAvailableRoles])

  useEffect(() => {
    checkAdminAndFetchData()
  }, [checkAdminAndFetchData])

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

      const result = await createUserAccount({
        firstName,
        lastName,
        email,
        password,
        staffRoleId: staffRoleId && staffRoleId !== "none" ? staffRoleId : undefined,
        roleSlug: roleSlug && roleSlug !== "none" ? roleSlug : undefined,
      })

      if (result.success) {
        // Reset form
        setFirstName("")
        setLastName("")
        setEmail("")
        setPassword("")
        setStaffRoleId("none")
        setRoleSlug("none")
        setIsCreateDialogOpen(false)
        
        // Refresh users list
        invalidateCache()
        await refreshUsers()
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

      const result = await updateUserAccount({
        userId: editingUser.id,
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        staffRoleId: editStaffRoleId && editStaffRoleId !== "none" ? editStaffRoleId : null,
        roleSlug: editRoleSlug && editRoleSlug !== "none" ? editRoleSlug : null,
      })

      if (result.success) {
        setIsEditDialogOpen(false)
        setEditingUser(null)
        
        // Refresh users list
        invalidateCache()
        await refreshUsers()
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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Staff Users</h2>
              <p className="text-sm text-muted-foreground">Manage user accounts and permissions</p>
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
                <Select value={roleSlug || "none"} onValueChange={setRoleSlug}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a system role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.slug}>
                        {role.slug === "admin" ? "Admin" : role.slug === "brand-advisor" ? "Brand Advisor" : role.slug === "operation-user" ? "Operation User" : role.slug === "staff" ? "Staff" : role.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  System roles control access permissions (admin, brand-advisor, operation-user, staff)
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
        {users.map((user) => (
          <Card key={user.id} className="card flex flex-col h-full">
            <CardHeader>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg flex items-center gap-2 mb-1">
                    <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="line-clamp-2" title={`${user.firstName} ${user.lastName}`}>{user.firstName} {user.lastName}</span>
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
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenPasswordDialog(user)}
                    title="Change Password"
                  >
                    <Key className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete User"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
        ))}
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
              <Select value={editRoleSlug || "none"} onValueChange={setEditRoleSlug}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a system role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Remove Role)</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.slug}>
                      {role.slug === "admin" ? "Admin" : role.slug === "brand-advisor" ? "Brand Advisor" : role.slug === "operation-user" ? "Operation User" : role.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                System roles control access permissions (admin, brand-advisor, operation-user)
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
        isOpen={deleteUserId !== null}
        onClose={() => setDeleteUserId(null)}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteUserName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingUser}
      />

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
    </div>
  )
}


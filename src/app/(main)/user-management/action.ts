"use server"

import { prisma } from "@/lib/prisma"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/server"
import { unstable_cache, revalidateTag } from "next/cache"
import { clearAdminCache } from "@/lib/admin-cache"

// Create admin client with service role key for admin operations
function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.")
  }
  return createSupabaseClient(
    
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin operations
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Helper function to validate user session and admin role
async function validateAdminUser() {
  try {
    // Get authenticated user from session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        valid: false,
        error: "Unauthorized: No valid session"
      }
    }

    // Get user from database with roles
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!dbUser) {
      return {
        valid: false,
        error: "User not found in database"
      }
    }

    // Check if user has admin role
    const isAdmin = dbUser.userRoles.some(ur => ur.role.slug === 'admin')

    if (!isAdmin) {
      return {
        valid: false,
        error: "Forbidden: Admin access required"
      }
    }

    return {
      valid: true,
      user: dbUser
    }
  } catch (error) {
    console.error("Error validating admin user:", error)
    return {
      valid: false,
      error: "Internal server error during authentication"
    }
  }
}

export type UserWithRole = {
  id: string
  firstName: string
  lastName: string
  email: string
  supabase_id: string
  staffRoleId: string | null
  staffRole: {
    id: string
    roleName: string
  } | null
  created_at: Date
  updated_at: Date
  roles: {
    role: {
      id: string
      slug: string
    }
  }[]
}

export type StaffRole = {
  id: string
  roleName: string
}

// Fetch all non-admin users
export async function getAllNonAdminUsers(): Promise<UserWithRole[]> {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        staffRole: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Filter out admin users
    const nonAdminUsers = users.filter(user => {
      const isAdmin = user.userRoles.some(ur => ur.role.slug === 'admin')
      return !isAdmin
    })

    return nonAdminUsers.map(user => ({
      ...user,
      roles: user.userRoles
    }))
  } catch (error) {
    console.error("Error fetching users:", error)
    throw error
  }
}

// Fetch non-admin users with pagination
// Internal function - not cached, used by cached version
async function _getUsersPaginatedInternal(
  page: number = 1,
  pageSize: number = 12
) {
  const skip = (page - 1) * pageSize

  // Get admin role ID first (more efficient than filtering in memory)
  const adminRole = await prisma.role.findFirst({
    where: { slug: 'admin' },
    select: { id: true }
  })

  // Build where clause to exclude users with admin role
  const where: any = {}
  if (adminRole) {
    where.NOT = {
      userRoles: {
        some: {
          roleId: adminRole.id
        }
      }
    }
  }

  // Execute count and findMany in parallel for better performance
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        staffRole: true
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: pageSize,
    })
  ])

  return {
    data: users.map(user => ({
      ...user,
      roles: user.userRoles
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

// Cached version of getUsersPaginated
const getCachedUsers = unstable_cache(
  async (page: number, pageSize: number) => {
    return await _getUsersPaginatedInternal(page, pageSize)
  },
  ["users-list"],
  {
    revalidate: 30, // Cache for 30 seconds
    tags: ["users"]
  }
)

export async function getUsersPaginated(
  page: number = 1,
  pageSize: number = 12
) {
  const validation = await validateAdminUser()
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  try {
    return await getCachedUsers(page, pageSize)
  } catch (error) {
    console.error("Error fetching paginated users:", error)
    throw error
  }
}

// Invalidate users cache after mutations
export async function invalidateUsersCache() {
  revalidateTag("users", { expire: 0 })
}

// Fetch all staff roles
export async function getAllStaffRoles(): Promise<StaffRole[]> {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  try {
    const staffRoles = await prisma.staffRole.findMany({
      orderBy: {
        roleName: 'asc'
      }
    })

    return staffRoles
  } catch (error) {
    console.error("Error fetching staff roles:", error)
    throw error
  }
}

// Create a new user account
export async function createUserAccount(data: {
  firstName: string
  lastName: string
  email: string
  password: string
  staffRoleId?: string
  roleSlug?: string
}) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    }
  }

  try {
    // Create user in Supabase Auth
    const supabase = createAdminClient()
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        firstName: data.firstName,
        lastName: data.lastName,
      }
    })

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error("No user returned from auth")
    }

    // Get the role to assign (use provided roleSlug or default to 'staff')
    const roleSlug = data.roleSlug || 'staff'
    const role = await prisma.role.findUnique({
      where: { slug: roleSlug }
    })

    if (!role) {
      throw new Error(`Role "${roleSlug}" not found`)
    }

    // Create user in public database
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        supabase_id: authData.user.id,
        staffRoleId: data.staffRoleId || null,
        userRoles: {
          create: {
            roleId: role.id
          }
        }
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        staffRole: true
      }
    })

    revalidateTag("users", { expire: 0 })
    
    return {
      success: true,
      user: {
        ...user,
        roles: user.userRoles
      }
    }
  } catch (error: any) {
    console.error("Error creating user:", error)
    return {
      success: false,
      error: error.message || "Failed to create user"
    }
  }
}

// Get all available roles
export async function getAllRoles() {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  try {
    const roles = await prisma.role.findMany({
      orderBy: {
        slug: 'asc'
      }
    })

    return roles
  } catch (error) {
    console.error("Error fetching roles:", error)
    throw error
  }
}

// Check for orphaned auth accounts (registered in auth but not in public.user)
export async function checkOrphanedAuthAccounts() {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  try {
    const supabase = createAdminClient()
    
    // Get all users from auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`)
    }
    
    if (!authUsers || !authUsers.users) {
      return []
    }
    
    // Get all public users
    const publicUsers = await prisma.user.findMany({
      select: { supabase_id: true }
    })
    
    const publicUserIds = new Set(publicUsers.map(u => u.supabase_id))
    
    // Find orphaned accounts
    const orphanedAccounts = authUsers.users
      .filter(authUser => !publicUserIds.has(authUser.id))
      .map(authUser => ({
        id: authUser.id,
        email: authUser.email || 'No email',
        created_at: authUser.created_at
      }))
    
    return orphanedAccounts
  } catch (error: any) {
    console.error("Error checking orphaned accounts:", error)
    throw error
  }
}

// Link orphaned auth account to public user table
export async function linkOrphanedAccount(data: {
  supabaseId: string
  email: string
  firstName: string
  lastName: string
  staffRoleId?: string
  roleSlug: string
}) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    }
  }

  try {
    // Get the role to assign
    const role = await prisma.role.findUnique({
      where: { slug: data.roleSlug }
    })

    if (!role) {
      throw new Error(`Role "${data.roleSlug}" not found`)
    }

    // Create user in public database with existing supabase_id
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        supabase_id: data.supabaseId,
        staffRoleId: data.staffRoleId || null,
        userRoles: {
          create: {
            roleId: role.id
          }
        }
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        staffRole: true
      }
    })

    revalidateTag("users", { expire: 0 })
    
    return {
      success: true,
      user: {
        ...user,
        roles: user.userRoles
      }
    }
  } catch (error: any) {
    console.error("Error linking orphaned account:", error)
    return {
      success: false,
      error: error.message || "Failed to link account"
    }
  }
}

// Update user account
export async function updateUserAccount(data: {
  userId: string
  firstName: string
  lastName: string
  email: string
  staffRoleId?: string | null
  roleSlug?: string | null
}) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    }
  }

  try {
    // Get user to find supabase_id
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { supabase_id: true, email: true }
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Update email in Supabase Auth if it changed
    if (user.email !== data.email) {
      const supabase = createAdminClient()
      const { error: authError } = await supabase.auth.admin.updateUserById(
        user.supabase_id,
        {
          email: data.email,
        }
      )

      if (authError) {
        throw new Error(`Failed to update auth email: ${authError.message}`)
      }
    }

    // Update user roles if roleSlug is provided
    if (data.roleSlug !== undefined) {
      // Get the role by slug
      const role = data.roleSlug ? await prisma.role.findUnique({
        where: { slug: data.roleSlug }
      }) : null

      if (data.roleSlug && !role) {
        throw new Error(`Role "${data.roleSlug}" not found`)
      }

      // Delete all existing user roles
      await prisma.userRole.deleteMany({
        where: { userId: data.userId }
      })

      // Add the new role if provided
      if (role) {
        await prisma.userRole.create({
          data: {
            userId: data.userId,
            roleId: role.id
          }
        })
      }
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        staffRoleId: data.staffRoleId || null,
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        staffRole: true
      }
    })

    revalidateTag("users", { expire: 0 })
    
    // Clear role cache for the updated user to reflect new permissions immediately
    await clearAdminCache(updatedUser.supabase_id)
    
    return {
      success: true,
      user: {
        ...updatedUser,
        roles: updatedUser.userRoles
      }
    }
  } catch (error: any) {
    console.error("Error updating user:", error)
    return {
      success: false,
      error: error.message || "Failed to update user"
    }
  }
}

// Change user password
export async function changeUserPassword(data: {
  userId: string
  newPassword: string
}) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    }
  }

  try {
    // Get user to find supabase_id
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { supabase_id: true }
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Update password in Supabase Auth
    const supabase = createAdminClient()
    const { error: authError } = await supabase.auth.admin.updateUserById(
      user.supabase_id,
      {
        password: data.newPassword,
      }
    )

    if (authError) {
      throw new Error(`Failed to update password: ${authError.message}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error changing password:", error)
    return {
      success: false,
      error: error.message || "Failed to change password"
    }
  }
}

// Delete a user account
export async function deleteUserAccount(userId: string) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    }
  }

  try {
    // Get user to find supabase_id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { supabase_id: true }
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Delete from Supabase Auth (handle case where user might not exist in auth)
    const supabase = createAdminClient()
    const { error: authError } = await supabase.auth.admin.deleteUser(user.supabase_id)

    if (authError) {
      // If user not found in auth, that's okay - continue to delete from database
      // Only log other errors
      if (authError.status !== 404) {
        console.error("Failed to delete from auth:", authError)
      }
    }

    // Delete related records that don't have cascade delete configured
    // Delete userRole records first (foreign key constraint)
    await prisma.userRole.deleteMany({
      where: { userId: userId }
    })

    // Delete from database
    await prisma.user.delete({
      where: { id: userId }
    })

    // SECURITY: Clear role cache for deleted user
    await clearAdminCache(user.supabase_id)

    revalidateTag("users", { expire: 0 })
    
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return {
      success: false,
      error: error.message || "Failed to delete user"
    }
  }
}

// Create a new staff role
export async function createStaffRole(data: {
  roleName: string
}) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    }
  }

  try {
    const role = await prisma.staffRole.create({
      data: {
        roleName: data.roleName
      }
    })

    revalidateTag("users", { expire: 0 })
    
    return {
      success: true,
      role
    }
  } catch (error: any) {
    console.error("Error creating staff role:", error)
    return {
      success: false,
      error: error.message || "Failed to create staff role"
    }
  }
}

// Update a staff role
export async function updateStaffRole(data: {
  id: string
  roleName: string
}) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    }
  }

  try {
    const role = await prisma.staffRole.update({
      where: { id: data.id },
      data: {
        roleName: data.roleName
      }
    })

    revalidateTag("users", { expire: 0 })
    
    return {
      success: true,
      role
    }
  } catch (error: any) {
    console.error("Error updating staff role:", error)
    return {
      success: false,
      error: error.message || "Failed to update staff role"
    }
  }
}

// Delete a staff role
export async function deleteStaffRole(roleId: string) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    }
  }

  try {
    // Check if any users have this role
    const usersWithRole = await prisma.user.count({
      where: { staffRoleId: roleId }
    })

    if (usersWithRole > 0) {
      return {
        success: false,
        error: `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.`
      }
    }

    await prisma.staffRole.delete({
      where: { id: roleId }
    })

    revalidateTag("users", { expire: 0 })
    
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting staff role:", error)
    return {
      success: false,
      error: error.message || "Failed to delete staff role"
    }
  }
}

// Ban/disable a user in Supabase Auth
export async function banUser(userId: string) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    }
  }

  try {
    // Get user to find supabase_id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { supabase_id: true }
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Ban user in Supabase Auth (set ban_duration to a very large number, effectively permanent)
    const supabase = createAdminClient()
    const { error: authError } = await supabase.auth.admin.updateUserById(
      user.supabase_id,
      {
        ban_duration: '876000h', // ~100 years, effectively permanent
      }
    )

    if (authError) {
      throw new Error(`Failed to ban user: ${authError.message}`)
    }

    // Clear role cache for banned user
    await clearAdminCache(user.supabase_id)

    revalidateTag("users", { expire: 0 })
    
    return { success: true }
  } catch (error: any) {
    console.error("Error banning user:", error)
    return {
      success: false,
      error: error.message || "Failed to ban user"
    }
  }
}

// Unban/reactivate a user in Supabase Auth
export async function unbanUser(userId: string) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    }
  }

  try {
    // Get user to find supabase_id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { supabase_id: true }
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Unban user in Supabase Auth (set ban_duration to 'none')
    const supabase = createAdminClient()
    const { error: authError } = await supabase.auth.admin.updateUserById(
      user.supabase_id,
      {
        ban_duration: 'none',
      }
    )

    if (authError) {
      throw new Error(`Failed to unban user: ${authError.message}`)
    }

    // Clear role cache for unbanned user
    await clearAdminCache(user.supabase_id)

    revalidateTag("users", { expire: 0 })
    
    return { success: true }
  } catch (error: any) {
    console.error("Error unbanning user:", error)
    return {
      success: false,
      error: error.message || "Failed to unban user"
    }
  }
}

// Get user ban status from Supabase Auth
export async function getUserBanStatus(userId: string) {
  // Validate admin access
  const validation = await validateAdminUser()
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  try {
    // Get user to find supabase_id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { supabase_id: true, email: true }
    })

    if (!user) {
      throw new Error(`User not found in database: userId=${userId}`)
    }

    // Get user from Supabase Auth to check ban status
    const supabase = createAdminClient()
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
      user.supabase_id
    )

    if (authError) {
      throw new Error(`Failed to get user status for userId=${userId}, supabase_id=${user.supabase_id}, email=${user.email || 'N/A'}: ${authError.message}`)
    }

    // Check if user is banned (banned_until is set and in the future)
    const isBanned = authUser.user.banned_until 
      ? new Date(authUser.user.banned_until) > new Date()
      : false

    return { isBanned }
  } catch (error: any) {
    console.error(`Error getting user ban status for userId=${userId}:`, error)
    throw error
  }
}


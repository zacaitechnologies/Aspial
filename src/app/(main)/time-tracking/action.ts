"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"

// Authentication functions
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return redirect("/login")
    }
    
    return user
  } catch (error: any) {
    // Handle redirect errors
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      // This is a redirect, not an error - don't log it
      throw error
    }
    console.error("Error in getCurrentUser:", error)
    throw new Error("Authentication failed")
  }
}

export async function getUserWithRole() {
  try {
    const user = await getCurrentUser()
    
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        supabase_id: true,
        profilePicture: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    if (!dbUser) {
      return redirect("/login")
    }
    
    const isAdmin = dbUser.userRoles.some(userRole => userRole.role.slug === "admin")
    
    return {
      user: dbUser,
      isAdmin
    }
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) throw error;
    console.error("Error in getUserWithRole:", error)
    throw new Error("Failed to get user with role")
  }
}

// Admin data fetching functions
export async function fetchAllUserTimeEntries() {
  const entries = await prisma.timeEntry.findMany({
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePicture: true,
        }
      },
      project: true
    },
    orderBy: {
      startTime: "desc"
    }
  })
  
  return entries
}

export async function fetchAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePicture: true,
      supabase_id: true,
      created_at: true,
      updated_at: true,
      staffRoleId: true,
      userRoles: {
        include: {
          role: true
        }
      }
    },
    orderBy: {
      firstName: "asc"
    }
  })
  
  return users
}

export async function fetchAllProjects() {
  const projects = await prisma.project.findMany({
    include: {
      quotations: true,
      createdByUser: true
    },
    orderBy: {
      created_at: "desc"
    }
  })
  
  return projects
}

// User-specific data fetching functions
export async function fetchUserTimeEntries(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: supabaseId }
  })
  
  if (!dbUser) {
    throw new Error("User not found")
  }
  
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: dbUser.id
    },
    include: {
      project: true
    },
    orderBy: {
      startTime: "desc"
    }
  })
  
  return entries
}

export async function fetchUserProjects(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: supabaseId }
  })
  
  if (!dbUser) {
    throw new Error("User not found")
  }
  
  // Check if user is admin
  const admin = await getCachedIsUserAdmin(supabaseId)
  
  if (admin) {
    // Admins can see all projects
    const projects = await prisma.project.findMany({
      include: {
        quotations: true
      },
      orderBy: {
        created_at: "desc"
      }
    })
    
    return projects
  }
  
  // Non-admins: only show projects they have permissions for
  const userPermissions = await prisma.projectPermission.findMany({
    where: { 
      userId: supabaseId, 
      OR: [
        { isOwner: true },
        { canView: true }
      ]
    },
    include: {
      project: {
        include: {
          quotations: true
        }
      }
    },
    orderBy: {
      project: {
        created_at: "desc"
      }
    }
  }) as any;
  
  return userPermissions.map((permission: any) => permission.project);
}

// Get active time entry for current user
export async function getActiveTimeEntry() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error("Unauthorized")
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id }
    })

    if (!dbUser) {
      throw new Error("User not found")
    }

    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: dbUser.id,
        isActive: true,
      },
      include: {
        project: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return activeEntry
  } catch (error: any) {
    // Handle redirect errors
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error("Error in getActiveTimeEntry:", error)
    throw error
  }
}

// CRUD operations for time entries
export async function createTimeEntry(data: {
  projectId: number
  startTime: Date
  endTime?: Date
  duration: number
  description?: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error("Unauthorized")
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id }
    })

    if (!dbUser) {
      throw new Error("User not found")
    }

    // Check if user already has an active time entry
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: dbUser.id,
        isActive: true,
      },
    })

    if (activeEntry) {
      throw new Error("User already has an active time entry")
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    })

    if (!project) {
      throw new Error("Project not found")
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: dbUser.id,
        projectId: data.projectId,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        description: data.description,
        isActive: true,
        isPause: false,
      },
      include: {
        project: true,
      },
    })

    revalidatePath("/time-tracking")
    return timeEntry
  } catch (error: any) {
    // Handle redirect errors
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      // This is a redirect, not an error - don't log it
      throw error
    }
    console.error("Error in createTimeEntry:", error)
    throw error
  }
}

export async function updateTimeEntry(id: number, data: {
  endTime?: Date
  duration: number
  description?: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error("Unauthorized")
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id }
    })

    if (!dbUser) {
      throw new Error("User not found")
    }

    // Verify the time entry belongs to the user
    const existingEntry = await prisma.timeEntry.findFirst({
      where: { id, userId: dbUser.id },
    })

    if (!existingEntry) {
      throw new Error("Time entry not found")
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        endTime: data.endTime,
        duration: data.duration,
        description: data.description,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    })

    revalidatePath("/time-tracking")
    return timeEntry
  } catch (error: any) {
    // Handle redirect errors
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      // This is a redirect, not an error - don't log it
      throw error
    }
    console.error("Error in updateTimeEntry:", error)
    throw error
  }
}

// Pause active time entry
export async function pauseTimeEntry(id: number, duration: number) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error("Unauthorized")
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id }
    })

    if (!dbUser) {
      throw new Error("User not found")
    }

    // Verify the time entry belongs to the user and is active
    const existingEntry = await prisma.timeEntry.findFirst({
      where: { id, userId: dbUser.id, isActive: true },
    })

    if (!existingEntry) {
      throw new Error("Active time entry not found")
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        isPause: true,
        duration: duration,
      },
      include: {
        project: true,
      },
    })

    revalidatePath("/time-tracking")
    return timeEntry
  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error("Error in pauseTimeEntry:", error)
    throw error
  }
}

// Resume paused time entry
export async function resumeTimeEntry(id: number) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error("Unauthorized")
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id }
    })

    if (!dbUser) {
      throw new Error("User not found")
    }

    // Verify the time entry belongs to the user and is active but paused
    const existingEntry = await prisma.timeEntry.findFirst({
      where: { id, userId: dbUser.id, isActive: true, isPause: true },
    })

    if (!existingEntry) {
      throw new Error("Paused time entry not found")
    }

    // Update startTime to now so elapsed time calculation works from resume point
    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        isPause: false,
        startTime: new Date(), // Update start time to now for resume calculation
      },
      include: {
        project: true,
      },
    })

    revalidatePath("/time-tracking")
    return timeEntry
  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error("Error in resumeTimeEntry:", error)
    throw error
  }
}

// Stop active time entry
export async function stopTimeEntry(id: number, duration: number) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error("Unauthorized")
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id }
    })

    if (!dbUser) {
      throw new Error("User not found")
    }

    // Verify the time entry belongs to the user and is active
    const existingEntry = await prisma.timeEntry.findFirst({
      where: { id, userId: dbUser.id, isActive: true },
    })

    if (!existingEntry) {
      throw new Error("Active time entry not found")
    }

    const endTime = new Date()

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        isActive: false,
        isPause: false,
        endTime: endTime,
        duration: duration,
      },
      include: {
        project: true,
      },
    })

    revalidatePath("/time-tracking")
    return timeEntry
  } catch (error: any) {
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error("Error in stopTimeEntry:", error)
    throw error
  }
}



// Get time entries for API calls (used by client components)
export async function getTimeEntries() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error("Unauthorized")
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id }
    })

    if (!dbUser) {
      throw new Error("User not found")
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: dbUser.id,
        isActive: true,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return timeEntries
  } catch (error: any) {
    // Handle redirect errors
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      // This is a redirect, not an error - don't log it
      throw error
    }
    console.error("Error in getTimeEntries:", error)
    throw error
  }
}

// Get all time entries (including stopped) for current user (used by client components)
export async function getAllUserTimeEntries() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error("Unauthorized")
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id }
    })

    if (!dbUser) {
      throw new Error("User not found")
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: dbUser.id,
      },
      include: {
        project: true,
      },
      orderBy: {
        startTime: "desc",
      },
    })

    return timeEntries
  } catch (error: any) {
    // Handle redirect errors
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      // This is a redirect, not an error - don't log it
      throw error
    }
    console.error("Error in getAllUserTimeEntries:", error)
    throw error
  }
} 
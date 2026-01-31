"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { 
  createTimeEntrySchema, 
  updateTimeEntrySchema,
  pauseTimeEntrySchema,
  resumeTimeEntrySchema,
  stopTimeEntrySchema,
  type CreateTimeEntryValues,
  type UpdateTimeEntryValues,
} from "@/lib/validation"
import type { TimeEntry, Project, User } from "@prisma/client"

// DTOs for time entries
export interface TimeEntryDTO {
  id: number
  userId: string
  projectId: number
  startTime: Date
  endTime: Date | null
  duration: number
  description: string | null
  isActive: boolean
  isPause: boolean
  createdAt: Date
  updatedAt: Date
  project: {
    id: number
    name: string
    description: string | null
  }
}

export interface TimeEntryWithUserDTO extends TimeEntryDTO {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    profilePicture: string | null
  }
}

// Authentication functions
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return redirect("/login")
    }
    
    return user
  } catch (error: unknown) {
    // Handle redirect errors
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw new Error("Authentication failed")
  }
}

export async function getUserWithRole() {
  try {
    const user = await getCurrentUser()
    const [isAdmin, dbUser] = await Promise.all([
      getCachedIsUserAdmin(user.id),
      prisma.user.findUnique({
        where: { supabase_id: user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          supabase_id: true,
          profilePicture: true,
        },
      }),
    ])
    if (!dbUser) return redirect("/login")
    return { user: dbUser, isAdmin }
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error
    throw new Error("Failed to get user with role")
  }
}

// Admin data fetching functions - optional limit and date range for faster initial load
const DEFAULT_ENTRIES_LIMIT = 100
const DEFAULT_ENTRIES_DAYS = 30

export async function fetchAllUserTimeEntries(
  limit: number = DEFAULT_ENTRIES_LIMIT,
  rangeDays: number = DEFAULT_ENTRIES_DAYS
): Promise<TimeEntryWithUserDTO[]> {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) throw new Error("Unauthorized: Admin access required")

  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - rangeDays)
  rangeStart.setHours(0, 0, 0, 0)

  const entries = await prisma.timeEntry.findMany({
    where: { startTime: { gte: rangeStart } },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePicture: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
    orderBy: { startTime: "desc" },
  })
  
  return entries.map(entry => ({
    id: entry.id,
    userId: entry.userId,
    projectId: entry.projectId,
    startTime: entry.startTime,
    endTime: entry.endTime,
    duration: entry.duration,
    description: entry.description,
    isActive: entry.isActive,
    isPause: entry.isPause,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    project: {
      id: entry.project.id,
      name: entry.project.name,
      description: entry.project.description,
    },
    user: {
      id: entry.user.id,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      email: entry.user.email,
      profilePicture: entry.user.profilePicture,
    }
  }))
}

export async function fetchAllUsers() {
  // Verify admin access
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }
  
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
  // Verify admin access
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }
  
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      created_at: true,
      updated_at: true,
      createdBy: true,
      clientId: true,
      clientName: true,
    },
    orderBy: {
      created_at: "desc"
    }
  })
  
  return projects
}

// User-specific data fetching functions
export async function fetchUserTimeEntries(
  supabaseId: string,
  limit: number = DEFAULT_ENTRIES_LIMIT,
  rangeDays: number = DEFAULT_ENTRIES_DAYS
): Promise<TimeEntryDTO[]> {
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin && user.id !== supabaseId) {
    throw new Error("Unauthorized: Cannot access other user's time entries")
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: supabaseId },
  })
  if (!dbUser) throw new Error("User not found")

  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - rangeDays)
  rangeStart.setHours(0, 0, 0, 0)

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: dbUser.id,
      startTime: { gte: rangeStart },
    },
    take: limit,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
    orderBy: { startTime: "desc" },
  })
  
  return entries.map(entry => ({
    id: entry.id,
    userId: entry.userId,
    projectId: entry.projectId,
    startTime: entry.startTime,
    endTime: entry.endTime,
    duration: entry.duration,
    description: entry.description,
    isActive: entry.isActive,
    isPause: entry.isPause,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    project: {
      id: entry.project.id,
      name: entry.project.name,
      description: entry.project.description,
    }
  }))
}

export async function fetchUserProjects(supabaseId: string) {
  // Verify the requesting user matches the target user or is admin
  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  
  if (!isAdmin && user.id !== supabaseId) {
    throw new Error("Unauthorized: Cannot access other user's projects")
  }
  
  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: supabaseId }
  })
  
  if (!dbUser) {
    throw new Error("User not found")
  }
  
  // Check if user is admin
  const targetUserIsAdmin = await getCachedIsUserAdmin(supabaseId)
  
  if (targetUserIsAdmin) {
    // Admins can see all projects
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        created_at: true,
        updated_at: true,
        createdBy: true,
        clientId: true,
        clientName: true,
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
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          created_at: true,
          updated_at: true,
          createdBy: true,
          clientId: true,
          clientName: true,
        }
      }
    },
    orderBy: {
      project: {
        created_at: "desc"
      }
    }
  })
  
  return userPermissions.map(permission => permission.project)
}

// Get active time entry for current user
export async function getActiveTimeEntry(): Promise<TimeEntryDTO | null> {
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
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!activeEntry) {
      return null
    }

    return {
      id: activeEntry.id,
      userId: activeEntry.userId,
      projectId: activeEntry.projectId,
      startTime: activeEntry.startTime,
      endTime: activeEntry.endTime,
      duration: activeEntry.duration,
      description: activeEntry.description,
      isActive: activeEntry.isActive,
      isPause: activeEntry.isPause,
      createdAt: activeEntry.createdAt,
      updatedAt: activeEntry.updatedAt,
      project: {
        id: activeEntry.project.id,
        name: activeEntry.project.name,
        description: activeEntry.project.description,
      }
    }
  } catch (error: unknown) {
    // Handle redirect errors
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw error
  }
}

// CRUD operations for time entries
export async function createTimeEntry(data: CreateTimeEntryValues): Promise<TimeEntryDTO> {
  try {
    // Validate input
    const validatedData = createTimeEntrySchema.parse(data)
    
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
      where: { id: validatedData.projectId },
    })

    if (!project) {
      throw new Error("Project not found")
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: dbUser.id,
        projectId: validatedData.projectId,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        duration: validatedData.duration,
        description: validatedData.description,
        isActive: true,
        isPause: false,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
      },
    })

    revalidatePath("/time-tracking")
    
    return {
      id: timeEntry.id,
      userId: timeEntry.userId,
      projectId: timeEntry.projectId,
      startTime: timeEntry.startTime,
      endTime: timeEntry.endTime,
      duration: timeEntry.duration,
      description: timeEntry.description,
      isActive: timeEntry.isActive,
      isPause: timeEntry.isPause,
      createdAt: timeEntry.createdAt,
      updatedAt: timeEntry.updatedAt,
      project: {
        id: timeEntry.project.id,
        name: timeEntry.project.name,
        description: timeEntry.project.description,
      }
    }
  } catch (error: unknown) {
    // Handle redirect errors
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw error
  }
}

export async function updateTimeEntry(id: number, data: UpdateTimeEntryValues): Promise<TimeEntryDTO> {
  try {
    // Validate input
    const validatedData = updateTimeEntrySchema.parse(data)
    
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
        endTime: validatedData.endTime,
        duration: validatedData.duration,
        description: validatedData.description,
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
    
    return {
      id: timeEntry.id,
      userId: timeEntry.userId,
      projectId: timeEntry.projectId,
      startTime: timeEntry.startTime,
      endTime: timeEntry.endTime,
      duration: timeEntry.duration,
      description: timeEntry.description,
      isActive: timeEntry.isActive,
      isPause: timeEntry.isPause,
      createdAt: timeEntry.createdAt,
      updatedAt: timeEntry.updatedAt,
      project: {
        id: timeEntry.project.id,
        name: timeEntry.project.name,
        description: timeEntry.project.description,
      }
    }
  } catch (error: unknown) {
    // Handle redirect errors
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw error
  }
}

// Pause active time entry
export async function pauseTimeEntry(id: number, duration: number): Promise<TimeEntryDTO> {
  try {
    // Validate input
    const validatedData = pauseTimeEntrySchema.parse({ id, duration })
    
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
      where: { id: validatedData.id, userId: dbUser.id, isActive: true },
    })

    if (!existingEntry) {
      throw new Error("Active time entry not found")
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id: validatedData.id },
      data: {
        isPause: true,
        duration: validatedData.duration,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
      },
    })

    revalidatePath("/time-tracking")
    
    return {
      id: timeEntry.id,
      userId: timeEntry.userId,
      projectId: timeEntry.projectId,
      startTime: timeEntry.startTime,
      endTime: timeEntry.endTime,
      duration: timeEntry.duration,
      description: timeEntry.description,
      isActive: timeEntry.isActive,
      isPause: timeEntry.isPause,
      createdAt: timeEntry.createdAt,
      updatedAt: timeEntry.updatedAt,
      project: {
        id: timeEntry.project.id,
        name: timeEntry.project.name,
        description: timeEntry.project.description,
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw error
  }
}

// Resume paused time entry
export async function resumeTimeEntry(id: number): Promise<TimeEntryDTO> {
  try {
    // Validate input
    const validatedData = resumeTimeEntrySchema.parse({ id })
    
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
      where: { id: validatedData.id, userId: dbUser.id, isActive: true, isPause: true },
    })

    if (!existingEntry) {
      throw new Error("Paused time entry not found")
    }

    // Update startTime to now so elapsed time calculation works from resume point
    const timeEntry = await prisma.timeEntry.update({
      where: { id: validatedData.id },
      data: {
        isPause: false,
        startTime: new Date(), // Update start time to now for resume calculation
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
      },
    })

    revalidatePath("/time-tracking")
    
    return {
      id: timeEntry.id,
      userId: timeEntry.userId,
      projectId: timeEntry.projectId,
      startTime: timeEntry.startTime,
      endTime: timeEntry.endTime,
      duration: timeEntry.duration,
      description: timeEntry.description,
      isActive: timeEntry.isActive,
      isPause: timeEntry.isPause,
      createdAt: timeEntry.createdAt,
      updatedAt: timeEntry.updatedAt,
      project: {
        id: timeEntry.project.id,
        name: timeEntry.project.name,
        description: timeEntry.project.description,
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw error
  }
}

// Stop active time entry
export async function stopTimeEntry(id: number, duration: number): Promise<TimeEntryDTO> {
  try {
    // Validate input
    const validatedData = stopTimeEntrySchema.parse({ id, duration })
    
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
      where: { id: validatedData.id, userId: dbUser.id, isActive: true },
    })

    if (!existingEntry) {
      throw new Error("Active time entry not found")
    }

    const endTime = new Date()

    const timeEntry = await prisma.timeEntry.update({
      where: { id: validatedData.id },
      data: {
        isActive: false,
        isPause: false,
        endTime: endTime,
        duration: validatedData.duration,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
      },
    })

    revalidatePath("/time-tracking")
    
    return {
      id: timeEntry.id,
      userId: timeEntry.userId,
      projectId: timeEntry.projectId,
      startTime: timeEntry.startTime,
      endTime: timeEntry.endTime,
      duration: timeEntry.duration,
      description: timeEntry.description,
      isActive: timeEntry.isActive,
      isPause: timeEntry.isPause,
      createdAt: timeEntry.createdAt,
      updatedAt: timeEntry.updatedAt,
      project: {
        id: timeEntry.project.id,
        name: timeEntry.project.name,
        description: timeEntry.project.description,
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw error
  }
}



// Get time entries for API calls (used by client components)
export async function getTimeEntries(): Promise<TimeEntryDTO[]> {
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

    return timeEntries.map(entry => ({
      id: entry.id,
      userId: entry.userId,
      projectId: entry.projectId,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration,
      description: entry.description,
      isActive: entry.isActive,
      isPause: entry.isPause,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      project: {
        id: entry.project.id,
        name: entry.project.name,
        description: entry.project.description,
      }
    }))
  } catch (error: unknown) {
    // Handle redirect errors
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw error
  }
}

// Get all time entries (including stopped) for current user (used by client components)
export async function getAllUserTimeEntries(): Promise<TimeEntryDTO[]> {
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
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
      },
      orderBy: {
        startTime: "desc",
      },
    })

    return timeEntries.map(entry => ({
      id: entry.id,
      userId: entry.userId,
      projectId: entry.projectId,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration,
      description: entry.description,
      isActive: entry.isActive,
      isPause: entry.isPause,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      project: {
        id: entry.project.id,
        name: entry.project.name,
        description: entry.project.description,
      }
    }))
  } catch (error: unknown) {
    // Handle redirect errors
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw error
  }
} 
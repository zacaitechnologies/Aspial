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
  updateTimeEntryDescriptionSchema,
  pauseTimeEntrySchema,
  resumeTimeEntrySchema,
  stopTimeEntrySchema,
  timeEntriesFilterSchema,
  type CreateTimeEntryValues,
  type UpdateTimeEntryValues,
  type TimeEntriesFilterValues,
} from "@/lib/validation"
import {
  NO_PROJECT_SENTINEL_NAME,
  getOrCreateNoProjectId,
  getNoProjectIdOrNull,
} from "@/lib/no-project"
import type { TimeEntry, TaskStatus } from "@prisma/client"

// DTOs for time entries
export interface TimeEntryDTO {
  id: number
  userId: string
  projectId: number
  taskId: number | null
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
  task: {
    id: number
    title: string
    status: TaskStatus
  } | null
  isPlaceholderProject: boolean
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

export interface ProjectTaskOption {
  id: number
  title: string
  status: TaskStatus
}

// Common Prisma include for time entries with project + task
const timeEntryInclude = {
  project: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  task: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
} as const

const timeEntryWithUserInclude = {
  ...timeEntryInclude,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePicture: true,
    },
  },
} as const

type RawTimeEntry = TimeEntry & {
  project: { id: number; name: string; description: string | null }
  task: { id: number; title: string; status: TaskStatus } | null
}

type RawTimeEntryWithUser = RawTimeEntry & {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    profilePicture: string | null
  }
}

function toTimeEntryDTO(entry: RawTimeEntry, placeholderProjectId: number | null): TimeEntryDTO {
  return {
    id: entry.id,
    userId: entry.userId,
    projectId: entry.projectId,
    taskId: entry.taskId,
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
    task: entry.task
      ? { id: entry.task.id, title: entry.task.title, status: entry.task.status }
      : null,
    isPlaceholderProject:
      placeholderProjectId !== null && entry.projectId === placeholderProjectId,
  }
}

function toTimeEntryWithUserDTO(
  entry: RawTimeEntryWithUser,
  placeholderProjectId: number | null
): TimeEntryWithUserDTO {
  return {
    ...toTimeEntryDTO(entry, placeholderProjectId),
    user: {
      id: entry.user.id,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      email: entry.user.email,
      profilePicture: entry.user.profilePicture,
    },
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

  const [entries, placeholderProjectId] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { startTime: { gte: rangeStart } },
      take: limit,
      include: timeEntryWithUserInclude,
      orderBy: { startTime: "desc" },
    }),
    getNoProjectIdOrNull(),
  ])

  return entries.map((e) => toTimeEntryWithUserDTO(e, placeholderProjectId))
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
    where: { NOT: { name: NO_PROJECT_SENTINEL_NAME } },
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

  const [entries, placeholderProjectId] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId: dbUser.id,
        startTime: { gte: rangeStart },
      },
      take: limit,
      include: timeEntryInclude,
      orderBy: { startTime: "desc" },
    }),
    getNoProjectIdOrNull(),
  ])

  return entries.map((e) => toTimeEntryDTO(e, placeholderProjectId))
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
      where: { NOT: { name: NO_PROJECT_SENTINEL_NAME } },
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
      ],
      project: { NOT: { name: NO_PROJECT_SENTINEL_NAME } },
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
      include: timeEntryInclude,
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!activeEntry) {
      return null
    }

    const placeholderProjectId = await getNoProjectIdOrNull()
    return toTimeEntryDTO(activeEntry, placeholderProjectId)
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

    // Resolve project: if none provided, fall back to the "No project" placeholder.
    let resolvedProjectId: number
    if (validatedData.projectId === undefined) {
      resolvedProjectId = await getOrCreateNoProjectId()
    } else {
      const project = await prisma.project.findUnique({
        where: { id: validatedData.projectId },
      })
      if (!project) {
        throw new Error("Project not found")
      }
      resolvedProjectId = validatedData.projectId
    }

    // If a task is provided, ensure it belongs to the same project
    if (validatedData.taskId !== undefined) {
      const task = await prisma.task.findUnique({
        where: { id: validatedData.taskId },
        select: { id: true, projectId: true },
      })
      if (!task) {
        throw new Error("Task not found")
      }
      if (task.projectId !== resolvedProjectId) {
        throw new Error("Task does not belong to the selected project")
      }
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: dbUser.id,
        projectId: resolvedProjectId,
        taskId: validatedData.taskId,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        duration: validatedData.duration,
        description: validatedData.description,
        isActive: true,
        isPause: false,
      },
      include: timeEntryInclude,
    })

    revalidatePath("/time-tracking")

    const placeholderProjectId = await getNoProjectIdOrNull()
    return toTimeEntryDTO(timeEntry, placeholderProjectId)
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
      include: timeEntryInclude,
    })

    revalidatePath("/time-tracking")

    const placeholderProjectId = await getNoProjectIdOrNull()
    return toTimeEntryDTO(timeEntry, placeholderProjectId)
  } catch (error: unknown) {
    // Handle redirect errors
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw error
  }
}

// Update only the description on an active time entry (used during live tracking)
export async function updateTimeEntryDescription(
  id: number,
  description: string
): Promise<TimeEntryDTO> {
  try {
    const validated = updateTimeEntryDescriptionSchema.parse({ id, description })

    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error("Unauthorized")
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
    })
    if (!dbUser) {
      throw new Error("User not found")
    }

    const existingEntry = await prisma.timeEntry.findFirst({
      where: { id: validated.id, userId: dbUser.id, isActive: true },
    })
    if (!existingEntry) {
      throw new Error("Active time entry not found")
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id: validated.id },
      data: { description: validated.description },
      include: timeEntryInclude,
    })

    revalidatePath("/time-tracking")

    const placeholderProjectId = await getNoProjectIdOrNull()
    return toTimeEntryDTO(timeEntry, placeholderProjectId)
  } catch (error: unknown) {
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
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

    const placeholderProjectId = await getNoProjectIdOrNull()
    if (
      placeholderProjectId !== null &&
      existingEntry.projectId === placeholderProjectId &&
      !existingEntry.description?.trim()
    ) {
      throw new Error("Description is required to pause a timer started without a project")
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id: validatedData.id },
      data: {
        isPause: true,
        duration: validatedData.duration,
      },
      include: timeEntryInclude,
    })

    revalidatePath("/time-tracking")

    return toTimeEntryDTO(timeEntry, placeholderProjectId)
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
      include: timeEntryInclude,
    })

    revalidatePath("/time-tracking")

    const placeholderProjectId = await getNoProjectIdOrNull()
    return toTimeEntryDTO(timeEntry, placeholderProjectId)
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

    const placeholderProjectId = await getNoProjectIdOrNull()
    if (
      placeholderProjectId !== null &&
      existingEntry.projectId === placeholderProjectId &&
      !existingEntry.description?.trim()
    ) {
      throw new Error("Description is required to stop a timer started without a project")
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
      include: timeEntryInclude,
    })

    revalidatePath("/time-tracking")

    return toTimeEntryDTO(timeEntry, placeholderProjectId)
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

    const [timeEntries, placeholderProjectId] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          userId: dbUser.id,
          isActive: true,
        },
        include: timeEntryInclude,
        orderBy: {
          createdAt: "desc",
        },
      }),
      getNoProjectIdOrNull(),
    ])

    return timeEntries.map((e) => toTimeEntryDTO(e, placeholderProjectId))
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

    const [timeEntries, placeholderProjectId] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          userId: dbUser.id,
        },
        include: timeEntryInclude,
        orderBy: {
          startTime: "desc",
        },
      }),
      getNoProjectIdOrNull(),
    ])

    return timeEntries.map((e) => toTimeEntryDTO(e, placeholderProjectId))
  } catch (error: unknown) {
    // Handle redirect errors
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    throw error
  }
}

// Fetch all tasks for a project (used by the task selector)
export async function fetchProjectTasks(projectId: number): Promise<ProjectTaskOption[]> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error("Unauthorized")
  }

  const isAdmin = await getCachedIsUserAdmin(user.id)

  if (!isAdmin) {
    const permission = await prisma.projectPermission.findFirst({
      where: {
        userId: user.id,
        projectId,
        OR: [{ isOwner: true }, { canView: true }],
      },
      select: { id: true },
    })
    if (!permission) {
      throw new Error("Unauthorized: Cannot access tasks for this project")
    }
  }

  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { id: true, title: true, status: true, order: true },
    orderBy: [{ status: "asc" }, { order: "asc" }, { title: "asc" }],
  })

  return tasks.map((t) => ({ id: t.id, title: t.title, status: t.status }))
}

// Admin-only: filterable list of all time entries (for the All Entries tab)
export interface FilteredTimeEntriesResult {
  entries: TimeEntryWithUserDTO[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAllTimeEntriesFiltered(
  filters: TimeEntriesFilterValues = {}
): Promise<FilteredTimeEntriesResult> {
  const validated = timeEntriesFilterSchema.parse(filters)

  const user = await getCurrentUser()
  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  const page = validated.page ?? 1
  const pageSize = validated.pageSize ?? 50

  const where: {
    startTime?: { gte?: Date; lt?: Date }
    userId?: string
    projectId?: number
  } = {}

  if (validated.startDate || validated.endDate) {
    where.startTime = {}
    if (validated.startDate) where.startTime.gte = validated.startDate
    if (validated.endDate) where.startTime.lt = validated.endDate
  }
  if (validated.userId) where.userId = validated.userId
  if (validated.projectId) where.projectId = validated.projectId

  const [total, entries, placeholderProjectId] = await Promise.all([
    prisma.timeEntry.count({ where }),
    prisma.timeEntry.findMany({
      where,
      include: timeEntryWithUserInclude,
      orderBy: { startTime: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    getNoProjectIdOrNull(),
  ])

  return {
    entries: entries.map((e) => toTimeEntryWithUserDTO(e, placeholderProjectId)),
    total,
    page,
    pageSize,
  }
}

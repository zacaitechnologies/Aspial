"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Authentication functions
export async function getCurrentUser() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect("/login")
  }
  
  return user
}

export async function getUserWithRole() {
  const user = await getCurrentUser()
  
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
    redirect("/login")
  }
  
  const isAdmin = dbUser.userRoles.some(userRole => userRole.role.slug === "admin")
  
  return {
    user: dbUser,
    isAdmin
  }
}

// Admin data fetching functions
export async function fetchAllUserTimeEntries() {
  const entries = await prisma.timeEntry.findMany({
    include: {
      user: true,
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
    include: {
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
      quotation: true,
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
  
  const projects = await prisma.project.findMany({
    // where: {
    //   OR: [
    //     { createdBy: dbUser.supabase_id },
    //     {
    //       permissions: {
    //         some: {
    //           userId: dbUser.supabase_id
    //         }
    //       }
    //     }
    //   ]
    // },
    include: {
      quotation: true
    },
    orderBy: {
      created_at: "desc"
    }
  })
  
  return projects
}

// CRUD operations for time entries
export async function createTimeEntry(data: {
  projectId: number
  startTime: Date
  endTime?: Date
  duration: number
  description?: string
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error("Unauthorized")
  }
  console.log("user", user.id)

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id }
  })
  

  if (!dbUser) {
    throw new Error("User not found")
  }

  console.log("dbUser", dbUser?.id)

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
    },
    include: {
      project: true,
    },
  })

  revalidatePath("/time-tracking")
  return timeEntry
}

export async function updateTimeEntry(id: number, data: {
  endTime?: Date
  duration: number
  description?: string
}) {
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
}

export async function deleteTimeEntry(id: number) {
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
  const timeEntry = await prisma.timeEntry.findFirst({
    where: { id, userId: dbUser.id },
  })

  if (!timeEntry) {
    throw new Error("Time entry not found")
  }

  await prisma.timeEntry.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath("/time-tracking")
  return { message: "Time entry deleted successfully" }
}

// Get time entries for API calls (used by client components)
export async function getTimeEntries() {
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
} 
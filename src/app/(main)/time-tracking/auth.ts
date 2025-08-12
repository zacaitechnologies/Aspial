"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

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

export async function fetchUserTimeEntries(userId: string) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: userId
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

export async function fetchUserProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { createdBy: userId },
        {
          permissions: {
            some: {
              userId: userId
            }
          }
        }
      ]
    },
    include: {
      quotation: true
    },
    orderBy: {
      created_at: "desc"
    }
  })
  
  return projects
}

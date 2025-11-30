"use server"

import { prisma } from "@/lib/prisma"
import { CreateMilestoneData, UpdateMilestoneData, Milestone } from "./types"

// Get all milestones for a project
export async function getProjectMilestones(projectId: number) {
  return await prisma.milestone.findMany({
    where: { projectId },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
        },
      },
      tasks: {
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              supabase_id: true,
            },
          },
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ],
      },
    },
    orderBy: [
      { order: 'asc' },
      { createdAt: 'asc' }
    ],
  })
}

// Get a single milestone by ID
export async function getMilestoneById(milestoneId: number): Promise<Milestone | null> {
  return await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
        },
      },
      tasks: {
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              supabase_id: true,
            },
          },
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ],
      },
    },
  })
}

// Create a new milestone
export async function createMilestone(data: CreateMilestoneData): Promise<Milestone> {
  // Get the highest order number for the project and add 1
  const maxOrder = await prisma.milestone.findFirst({
    where: { projectId: data.projectId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const newOrder = (maxOrder?.order ?? -1) + 1

  const milestoneData: any = {
    ...data,
    order: newOrder,
  }

  // Handle dueDate - if undefined, set to a default date
  if (!milestoneData.dueDate) {
    milestoneData.dueDate = new Date()
  }

  return await prisma.milestone.create({
    data: milestoneData,
    include: {
      service: {
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
        },
      },
      tasks: {
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              supabase_id: true,
            },
          },
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ],
      },
    },
  })
}

// Update a milestone
export async function updateMilestone(milestoneId: number, data: UpdateMilestoneData): Promise<Milestone> {
  const updateData: any = { ...data }
  
  // Handle dueDate - if null, set to undefined
  if (updateData.dueDate === null) {
    updateData.dueDate = undefined
  }

  return await prisma.milestone.update({
    where: { id: milestoneId },
    data: updateData,
    include: {
      service: {
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
        },
      },
      tasks: {
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              supabase_id: true,
            },
          },
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ],
      },
    },
  })
}

// Delete a milestone
export async function deleteMilestone(milestoneId: number): Promise<void> {
  await prisma.milestone.delete({
    where: { id: milestoneId },
  })
}

// Update milestone status based on task completion
export async function updateMilestoneStatus(milestoneId: number): Promise<Milestone> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      tasks: true,
    },
  })

  if (!milestone) {
    throw new Error('Milestone not found')
  }

  const totalTasks = milestone.tasks.length
  const completedTasks = milestone.tasks.filter(task => task.status === 'done').length
  const inProgressTasks = milestone.tasks.filter(task => task.status === 'in_progress').length

  let newStatus: 'not_started' | 'in_progress' | 'completed'

  if (totalTasks === 0) {
    newStatus = 'not_started'
  } else if (completedTasks === totalTasks) {
    newStatus = 'completed'
  } else if (completedTasks > 0 || inProgressTasks > 0) {
    // Milestone is in progress if any task is done OR in progress
    newStatus = 'in_progress'
  } else {
    newStatus = 'not_started'
  }

  return await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: newStatus },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
        },
      },
      tasks: {
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              supabase_id: true,
            },
          },
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ],
      },
    },
  })
}

// Get milestone progress percentage
export async function getMilestoneProgress(milestoneId: number): Promise<number> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      tasks: true,
    },
  })

  if (!milestone || milestone.tasks.length === 0) {
    return 0
  }

  const completedTasks = milestone.tasks.filter(task => task.status === 'done').length
  return Math.round((completedTasks / milestone.tasks.length) * 100)
}

// Get all services from project quotations
export async function getProjectServices(projectId: number) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      quotations: {
        include: {
          services: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  basePrice: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!project) {
    return []
  }

  // Extract unique services from all quotations
  const servicesMap = new Map()
  project.quotations.forEach(quotation => {
    quotation.services.forEach(qs => {
      if (!servicesMap.has(qs.service.id)) {
        servicesMap.set(qs.service.id, qs.service)
      }
    })
  })

  return Array.from(servicesMap.values())
}

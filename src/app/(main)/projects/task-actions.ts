"use server"

import { prisma } from "@/lib/prisma"
import { CreateTaskData, UpdateTaskData, TaskWithAssignee, TaskStatus } from "./types"
import { updateMilestoneStatus } from "./milestone-actions"

// Get all tasks for a project
export async function getProjectTasks(projectId: number): Promise<TaskWithAssignee[]> {
  return await prisma.task.findMany({
    where: { projectId },
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
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          supabase_id: true,
        },
      },
      milestone: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
    orderBy: [
      { order: 'asc' },
      { createdAt: 'asc' }
    ],
  }) as TaskWithAssignee[]
}

// Get a single task by ID
export async function getTask(taskId: number): Promise<TaskWithAssignee | null> {
  return await prisma.task.findUnique({
    where: { id: taskId },
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
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          supabase_id: true,
        },
      },
      milestone: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  }) as TaskWithAssignee | null
}

// Create a new task
export async function createTask(data: CreateTaskData): Promise<TaskWithAssignee> {
  // Get the highest order number for the project and add 1
  const maxOrder = await prisma.task.findFirst({
    where: { projectId: data.projectId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const newOrder = (maxOrder?.order ?? -1) + 1

  return await prisma.task.create({
    data: {
      ...data,
      order: newOrder,
    },
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
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          supabase_id: true,
        },
      },
      milestone: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  }) as TaskWithAssignee
}

// Update a task
export async function updateTask(taskId: number, data: UpdateTaskData): Promise<TaskWithAssignee> {
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data,
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
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          supabase_id: true,
        },
      },
      milestone: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  }) as TaskWithAssignee

  // Update milestone status if task has a milestone
  if (updatedTask.milestoneId) {
    await updateMilestoneStatus(updatedTask.milestoneId)
  }

  return updatedTask
}

// Delete a task
export async function deleteTask(taskId: number): Promise<void> {
  // Get the task's milestone before deleting
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { milestoneId: true },
  })
  
  await prisma.task.delete({
    where: { id: taskId },
  })
  
  // Update milestone status if task was part of a milestone
  if (task?.milestoneId) {
    await updateMilestoneStatus(task.milestoneId)
  }
}

// Update task status (for drag and drop functionality)
export async function updateTaskStatus(taskId: number, status: TaskStatus): Promise<TaskWithAssignee> {
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { status },
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
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          supabase_id: true,
        },
      },
      milestone: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  }) as TaskWithAssignee
  
  // Update milestone status if task has a milestone
  if (updatedTask.milestoneId) {
    await updateMilestoneStatus(updatedTask.milestoneId)
  }
  
  return updatedTask
}

// Reorder tasks (for drag and drop functionality)
export async function reorderTasks(taskIds: number[]): Promise<void> {
  const updates = taskIds.map((taskId, index) => ({
    where: { id: taskId },
    data: { order: index },
  }))

  await prisma.$transaction(
    updates.map(update => prisma.task.update(update))
  )
}

// Get tasks by status for a project
export async function getTasksByStatus(projectId: number, status: TaskStatus): Promise<TaskWithAssignee[]> {
  return await prisma.task.findMany({
    where: { 
      projectId,
      status,
    },
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
      assignee: {
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
  }) as TaskWithAssignee[]
}

// Get task statistics for a project
export async function getProjectTaskStats(projectId: number) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { status: true },
  })

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  return stats
}

// Get project collaborators (users with permissions for the project)
export async function getProjectCollaborators(projectId: number) {
  const permissions = await prisma.projectPermission.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          supabase_id: true,
        },
      },
    },
  })

  return permissions.map(permission => permission.user)
}

// Get all tasks for a user (across all projects they have access to). Optional date range filters by task overlap.
export async function getAllUserTasks(
  userId: string,
  dateRange?: { start: Date; end: Date }
): Promise<TaskWithAssignee[]> {
  try {
    if (!userId || userId.trim() === '') {
      return []
    }

    const userWithRoles = await prisma.user.findUnique({
      where: { supabase_id: userId },
      include: { userRoles: { include: { role: true } } },
    })

    const isAdmin = userWithRoles?.userRoles.some((userRole) => userRole.role.slug === "admin") || false

    let projectIds: number[]

    if (isAdmin) {
      const allProjects = await prisma.project.findMany({
        select: { id: true },
      })
      projectIds = allProjects.map(p => p.id)
    } else {
      const userPermissions = await prisma.projectPermission.findMany({
        where: {
          userId,
          OR: [
            { isOwner: true },
            { canView: true }
          ]
        },
        select: { projectId: true },
      })
      projectIds = userPermissions.map(p => p.projectId)
    }

    if (projectIds.length === 0) {
      return []
    }

    const whereClause: { projectId: { in: number[] }; dueDate?: unknown; startDate?: unknown } = {
      projectId: { in: projectIds },
    }
    if (dateRange) {
      whereClause.dueDate = { gte: dateRange.start }
      whereClause.startDate = { lte: dateRange.end }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause as { projectId: { in: number[] }; dueDate?: { gte: Date }; startDate?: { lte: Date } },
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
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            supabase_id: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'asc' }
      ],
    }) as TaskWithAssignee[]

    return tasks
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error in getAllUserTasks:", error)
    }
    throw error
  }
}

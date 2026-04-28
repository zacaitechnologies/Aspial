"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { CreateTaskData, UpdateTaskData, TaskWithAssignee, TaskStatus } from "./types"
import { updateMilestoneStatus } from "./milestone-actions"

const taskStatusSchema = z.enum(["todo", "in_progress", "done"])
const bulkUpdateTaskStatusSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1, "Select at least one task"),
  status: taskStatusSchema,
})

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

// Bulk update task statuses (for click-to-move multi-select).
// All tasks must belong to the same project; we de-dupe IDs and refresh
// affected milestone statuses once per milestone.
export async function bulkUpdateTaskStatus(
  taskIds: number[],
  status: TaskStatus
): Promise<TaskWithAssignee[]> {
  const parsed = bulkUpdateTaskStatusSchema.parse({ taskIds, status })
  const uniqueIds = Array.from(new Set(parsed.taskIds))

  // Look up the affected tasks first to gather milestone IDs (and to verify
  // they all belong to the same project).
  const existing = await prisma.task.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, projectId: true, milestoneId: true },
  })

  if (existing.length === 0) {
    return []
  }

  const projectIds = new Set(existing.map((t) => t.projectId))
  if (projectIds.size > 1) {
    throw new Error("All tasks must belong to the same project")
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: { id: { in: existing.map((t) => t.id) } },
      data: { status: parsed.status },
    })
  })

  // Refresh each affected milestone exactly once.
  const milestoneIds = Array.from(
    new Set(existing.map((t) => t.milestoneId).filter((id): id is number => id != null))
  )
  await Promise.all(milestoneIds.map((id) => updateMilestoneStatus(id)))

  // Return the freshly updated tasks with relations the UI expects.
  return (await prisma.task.findMany({
    where: { id: { in: existing.map((t) => t.id) } },
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
  })) as TaskWithAssignee[]
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

"use server"

import { prisma } from "@/lib/prisma"
import { CreateTaskData, UpdateTaskData, TaskWithAssignee } from "./types"
import { updateMilestoneStatus } from "./milestone-actions"

// Get all tasks for a project
export async function getProjectTasks(projectId: number): Promise<TaskWithAssignee[]> {
  return await prisma.task.findMany({
    where: { projectId },
    include: {
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
  await prisma.task.delete({
    where: { id: taskId },
  })
}

// Update task status (for drag and drop functionality)
export async function updateTaskStatus(taskId: number, status: string): Promise<TaskWithAssignee> {
  return await prisma.task.update({
    where: { id: taskId },
    data: { status: status as any },
    include: {
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
  }) as TaskWithAssignee
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
export async function getTasksByStatus(projectId: number, status: string): Promise<TaskWithAssignee[]> {
  return await prisma.task.findMany({
    where: { 
      projectId,
      status: status as any,
    },
    include: {
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

// Get all tasks for a user (across all projects they have access to)
export async function getAllUserTasks(userId: string): Promise<TaskWithAssignee[]> {
  try {
    console.log('getAllUserTasks called with userId:', userId)
    
    // First get all projects the user has access to
    const userWithRoles = await prisma.user.findUnique({
      where: { supabase_id: userId },
      include: { userRoles: { include: { role: true } } },
    })

    console.log('User with roles:', userWithRoles)

    const isAdmin = userWithRoles?.userRoles.some((userRole) => userRole.role.slug === "admin") || false
    console.log('Is admin:', isAdmin)

    let projectIds: number[]

    if (isAdmin) {
      // Admin can see all projects
      const allProjects = await prisma.project.findMany({
        select: { id: true },
      })
      projectIds = allProjects.map(p => p.id)
      console.log('Admin - all project IDs:', projectIds)
    } else {
      // Get projects user has permissions for
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
      console.log('Non-admin - accessible project IDs:', projectIds)
    }

    if (projectIds.length === 0) {
      console.log('No projects found for user')
      return []
    }

    // Get all tasks from these projects
    const tasks = await prisma.task.findMany({
      where: { 
        projectId: { in: projectIds },
        dueDate: { not: null } // Only tasks with due dates
      },
      include: {
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

    console.log('Found tasks with due dates:', tasks.length)
    console.log('Tasks:', tasks)

    return tasks
  } catch (error) {
    console.error('Error in getAllUserTasks:', error)
    throw error
  }
}

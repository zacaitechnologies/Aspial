"use server"

import { PrismaClient } from "@prisma/client"
import { CreateTaskData, UpdateTaskData, TaskWithAssignee } from "./types"

const prisma = new PrismaClient()

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
    },
  }) as TaskWithAssignee
}

// Update a task
export async function updateTask(taskId: number, data: UpdateTaskData): Promise<TaskWithAssignee> {
  return await prisma.task.update({
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
    },
  }) as TaskWithAssignee
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

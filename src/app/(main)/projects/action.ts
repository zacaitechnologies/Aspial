"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function getAllProjects(userId?: string) {
  if (!userId) {
    return []
  }

  // Get projects where user has permissions
  const userPermissions = await prisma.projectPermission.findMany({
    where: {
      userId,
    },
    include: {
      project: {
        include: {
          quotation: {
            include: {
              services: {
                include: {
                  service: true,
                },
              },
            },
          },
          createdByUser: true,
        },
      },
    },
    orderBy: {
      project: {
        created_at: "desc",
      },
    },
  })

  return userPermissions.map(permission => permission.project)
}

export async function createProject(data: {
  name: string
  description?: string
  quotationId: number
  createdBy: string
  startDate?: Date
  endDate?: Date
}) {
  const project = await prisma.project.create({
    data,
  })

  // Create owner permission for the project creator
  await prisma.projectPermission.create({
    data: {
      userId: data.createdBy,
      projectId: project.id,
      canView: true,
      canEdit: true,
      isOwner: true,
    },
  })

  return project
}

export async function updateProjectStatus(id: string, status: string) {
  return await prisma.project.update({
    where: { id: Number.parseInt(id) },
    data: { status },
  })
}

export async function updateProject(
  id: string,
  data: {
    name: string
    description?: string
    status: string
    startDate?: Date
    endDate?: Date
  }
) {
  return await prisma.project.update({
    where: { id: Number.parseInt(id) },
    data,
  })
} 
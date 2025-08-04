"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function inviteProjectCollaborator(
  projectId: number,
  userId: string,
  canView: boolean = true,
  canEdit: boolean = true,
  isOwner: boolean = false
) {
  return await prisma.projectPermission.create({
    data: {
      userId,
      projectId,
      canView,
      canEdit,
      isOwner,
    },
    include: {
      user: true,
      project: true,
    },
  })
}

export async function updateProjectPermission(
  projectId: number,
  userId: string,
  canView?: boolean,
  canEdit?: boolean,
  isOwner?: boolean
) {
  return await prisma.projectPermission.update({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    data: {
      ...(canView !== undefined && { canView }),
      ...(canEdit !== undefined && { canEdit }),
      ...(isOwner !== undefined && { isOwner }),
    },
    include: {
      user: true,
      project: true,
    },
  })
}

export async function removeProjectCollaborator(projectId: number, userId: string) {
  return await prisma.projectPermission.delete({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  })
}

export async function getProjectPermissions(projectId: number) {
  return await prisma.projectPermission.findMany({
    where: {
      projectId,
    },
    include: {
      user: true,
    },
    orderBy: [
      {
        isOwner: "desc",
      },
      {
        user: {
          firstName: "asc",
        },
      },
    ],
  })
}

export async function getUserProjectPermissions(userId: string) {
  return await prisma.projectPermission.findMany({
    where: {
      userId,
    },
    include: {
      project: {
        include: {
          quotation: true,
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
}

export async function canUserAccessProject(userId: string, projectId: number) {
  const permission = await prisma.projectPermission.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  })

  return permission !== null
}

export async function canUserEditProject(userId: string, projectId: number) {
  const permission = await prisma.projectPermission.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  })

  return permission?.canEdit || false
}

export async function isUserProjectOwner(userId: string, projectId: number) {
  const permission = await prisma.projectPermission.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  })

  return permission?.isOwner || false
}
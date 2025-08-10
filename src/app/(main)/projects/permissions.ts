"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function isUserAdmin(userSupabaseId: string) {
  const userWithRoles = await prisma.user.findUnique({
    where: { supabase_id: userSupabaseId },
    include: { userRoles: { include: { role: true } } },
  })

  if (!userWithRoles) return false
  return userWithRoles.userRoles.some((userRole) => userRole.role.slug === "admin")
}

export async function getVisibleProjectsForUser(userSupabaseId: string) {
  const isAdmin = await isUserAdmin(userSupabaseId)

  if (isAdmin) {
    return await prisma.project.findMany({
      include: {
        quotation: {
          include: {
            services: {
              include: { service: true },
            },
          },
        },
        createdByUser: true,
      },
      orderBy: { created_at: "desc" },
    })
  }

  const userPermissions = await prisma.projectPermission.findMany({
    where: { 
      userId: userSupabaseId, 
      OR: [
        { isOwner: true },
        { canView: true }
      ]
    },
    include: {
      project: {
        include: {
          quotation: {
            include: {
              services: {
                include: { service: true },
              },
            },
          },
          createdByUser: true,
        },
      },
    },
    orderBy: {
      project: { created_at: "desc" },
    },
  })

  return userPermissions.map((permission) => permission.project)
}

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
  if (await isUserAdmin(userId)) {
    return true
  }

  const permission = await prisma.projectPermission.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  })

  return permission?.isOwner || permission?.canView || false
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

// Invitation-related functions
export async function getAllUsers() {
  return await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      supabase_id: true,
    },
    orderBy: [
      { firstName: "asc" },
      { lastName: "asc" },
    ],
  })
}

export async function getAvailableUsersForProject(projectId: number) {
  // Get all users who are not already collaborators on this project
  const existingCollaborators = await prisma.projectPermission.findMany({
    where: { projectId },
    select: { userId: true },
  })
  
  const existingUserIds = existingCollaborators.map(c => c.userId)
  
  return await prisma.user.findMany({
    where: {
      supabase_id: {
        notIn: existingUserIds,
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      supabase_id: true,
    },
    orderBy: [
      { firstName: "asc" },
      { lastName: "asc" },
    ],
  })
}

export async function createProjectInvitation(
  projectId: number,
  invitedBy: string,
  invitedUser: string,
  canView: boolean = true,
  canEdit: boolean = true,
  isOwner: boolean = false
) {
  return await prisma.projectInvitation.create({
    data: {
      projectId,
      invitedBy,
      invitedUser,
      canView,
      canEdit,
      isOwner,
    },
    include: {
      project: true,
      inviter: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      invitee: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })
}

export async function getUserInvitations(userId: string) {
  return await prisma.projectInvitation.findMany({
    where: {
      invitedUser: userId,
      status: "pending",
    },
    include: {
      project: {
        include: {
          quotation: true,
          createdByUser: true,
        },
      },
      inviter: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function acceptProjectInvitation(invitationId: number) {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { id: invitationId },
    include: { project: true },
  })

  if (!invitation) {
    throw new Error("Invitation not found")
  }

  if (invitation.status !== "pending") {
    throw new Error("Invitation is no longer pending")
  }

  // Use a transaction to update invitation and create permission
  return await prisma.$transaction(async (tx) => {
    // Update invitation status
    await tx.projectInvitation.update({
      where: { id: invitationId },
      data: { status: "accepted" },
    })

    // Create project permission
    const permission = await tx.projectPermission.create({
      data: {
        userId: invitation.invitedUser,
        projectId: invitation.projectId,
        canView: invitation.canView,
        canEdit: invitation.canEdit,
        isOwner: invitation.isOwner,
      },
      include: {
        user: true,
        project: true,
      },
    })

    return permission
  })
}

export async function declineProjectInvitation(invitationId: number) {
  return await prisma.projectInvitation.update({
    where: { id: invitationId },
    data: { status: "declined" },
  })
}

export async function getProjectInvitations(projectId: number) {
  return await prisma.projectInvitation.findMany({
    where: { projectId },
    include: {
      inviter: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      invitee: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}
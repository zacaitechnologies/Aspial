"use server"

import { PrismaClient } from "@prisma/client"
import { getVisibleProjectsForUser, isUserAdmin } from "./permissions"
import { CreateProjectData, UpdateProjectData } from "./types"

const prisma = new PrismaClient()

export async function getAllProjects(userId?: string) {
  if (!userId) {
    return []
  }

  // Admins can see all projects
  if (await isUserAdmin(userId)) {
    return await getVisibleProjectsForUser(userId)
  }

  // Non-admins: only projects they own
  return await getVisibleProjectsForUser(userId)
}

export async function createProject(data: CreateProjectData) {
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
  data: UpdateProjectData
) {
  return await prisma.project.update({
    where: { id: Number.parseInt(id) },
    data,
  })
} 
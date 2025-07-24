"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function getAllProjects() {
  return await prisma.project.findMany({
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
    },
    orderBy: { created_at: "desc" },
  })
}

export async function createProject(data: {
  name: string
  description?: string
  quotationId: number
  startDate?: Date
  endDate?: Date
}) {
  return await prisma.project.create({
    data,
  })
}

export async function updateProjectStatus(id: string, status: string) {
  return await prisma.project.update({
    where: { id: Number.parseInt(id) },
    data: { status },
  })
} 
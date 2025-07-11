"use server"


import { revalidatePath } from "next/cache"
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// Studio Actions
export async function createStudio(formData: FormData) {
  const name = formData.get("name") as string
  const location = formData.get("location") as string
  const capacity = Number.parseInt(formData.get("capacity") as string)
  const description = formData.get("description") as string

  try {
    await prisma.studio.create({
      data: {
        name,
        location,
        capacity,
        description: description || null,
      },
    })
    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to create studio" }
  }
}

export async function updateStudio(id: number, formData: FormData) {
  const name = formData.get("name") as string
  const location = formData.get("location") as string
  const capacity = Number.parseInt(formData.get("capacity") as string)
  const description = formData.get("description") as string
  const isActive = formData.get("isActive") === "on"

  try {
    await prisma.studio.update({
      where: { id },
      data: {
        name,
        location,
        capacity,
        description: description || null,
        isActive,
      },
    })
    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to update studio" }
  }
}

export async function deleteStudio(id: number) {
  try {
    await prisma.studio.delete({
      where: { id },
    })
    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to delete studio" }
  }
}

// Equipment Actions
export async function createEquipment(formData: FormData) {
  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const brand = formData.get("brand") as string
  const model = formData.get("model") as string
  const serialNumber = formData.get("serialNumber") as string
  const condition = formData.get("condition") as string
  const studioId = formData.get("studioId") as string

  try {
    await prisma.equipment.create({
      data: {
        name,
        type,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        condition,
        studioId: studioId ? Number.parseInt(studioId) : null,
      },
    })
    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to create equipment" }
  }
}

export async function updateEquipment(id: number, formData: FormData) {
  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const brand = formData.get("brand") as string
  const model = formData.get("model") as string
  const serialNumber = formData.get("serialNumber") as string
  const condition = formData.get("condition") as string
  const isAvailable = formData.get("isAvailable") === "on"
  const studioId = formData.get("studioId") as string

  try {
    await prisma.equipment.update({
      where: { id },
      data: {
        name,
        type,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        condition,
        isAvailable,
        studioId: studioId ? Number.parseInt(studioId) : null,
      },
    })
    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to update equipment" }
  }
}

export async function deleteEquipment(id: number) {
  try {
    await prisma.equipment.delete({
      where: { id },
    })
    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to delete equipment" }
  }
}

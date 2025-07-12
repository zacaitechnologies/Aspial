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
    console.error(error)
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
    console.error(error)
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
    console.error(error)
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
    console.error(error)
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
    console.error(error)
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
    console.error(error)
    return { success: false, error: "Failed to delete equipment" }
  }
}

// Booking Actions
export async function createBooking(formData: FormData) {
  const equipmentId = Number.parseInt(formData.get("equipmentId") as string)
  const bookedBy = formData.get("bookedBy") as string
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)
  const purpose = formData.get("purpose") as string

  try {
    await prisma.booking.create({
      data: {
        equipmentId,
        bookedBy,
        startDate,
        endDate,
        purpose: purpose || null,
      },
    })

    // Update equipment availability
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: { isAvailable: false },
    })

    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to create booking" }
  }
}

export async function createStudioBooking(formData: FormData) {
  const studioId = Number.parseInt(formData.get("studioId") as string)
  const bookedBy = formData.get("bookedBy") as string
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)
  const purpose = formData.get("purpose") as string
  const attendees = Number.parseInt(formData.get("attendees") as string)

  try {
    await prisma.studioBooking.create({
      data: {
        studioId,
        bookedBy,
        startDate,
        endDate,
        purpose: purpose || null,
        attendees,
      },
    })

    revalidatePath("/equipment-bookings")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to create studio booking" }
  }
}
  
  export async function cancelBooking(id: number) {
  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: "Cancelled" },
      include: { equipment: true },
    })

    // Check if there are other active bookings for this equipment
    const activeBookings = await prisma.booking.count({
      where: {
        equipmentId: booking.equipmentId,
        status: "Active",
      },
    })

    // If no active bookings, make equipment available
    if (activeBookings === 0) {
      await prisma.equipment.update({
        where: { id: booking.equipmentId },
        data: { isAvailable: true },
      })
    }

    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to cancel booking" }
  }
}

export async function cancelStudioBooking(id: number) {
  try {
    await prisma.studioBooking.update({
      where: { id },
      data: { status: "cancelled" },
    })

    revalidatePath("/equipment-bookings")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to cancel studio booking" }
  }
}
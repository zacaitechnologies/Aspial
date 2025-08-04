import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  paramsPromise: Promise<{ params: { id: string } }>
) {
  try {
    const { params } = await paramsPromise
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const timeEntryId = parseInt(params.id)
    if (isNaN(timeEntryId)) {
      return NextResponse.json({ error: "Invalid time entry ID" }, { status: 400 })
    }

    // Check if time entry exists and belongs to the user
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: timeEntryId,
        userId: user.id,
      },
    })

    if (!timeEntry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: { isActive: false },
    })

    return NextResponse.json({ message: "Time entry deleted successfully" })
  } catch (error) {
    console.error("Error deleting time entry:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 
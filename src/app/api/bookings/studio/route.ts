import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const bookings = await prisma.studioBooking.findMany({
      where: {
        status: "active"
      },
      include: {
        studio: true
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching studio bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch studio bookings' }, { status: 500 })
  }
} 
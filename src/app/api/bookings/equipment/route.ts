import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: "active"
      },
      include: {
        equipment: {
          include: {
            studio: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching equipment bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch equipment bookings' }, { status: 500 })
  }
} 
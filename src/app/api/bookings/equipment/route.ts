import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const whereClause: any = {
      status: "active"
    }

    // Add date range filter if provided
    if (startDate && endDate) {
      whereClause.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        equipment: true
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
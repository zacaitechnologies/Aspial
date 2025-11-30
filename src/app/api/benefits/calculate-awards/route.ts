import { calculateAndCreateSuperPerformanceAwards } from "@/app/(main)/benefits/action"
import { NextResponse } from "next/server"

// This endpoint can be called by a cron job on January 1st each year
// Or manually by admins to trigger award calculation
// Vercel Cron will automatically call this endpoint with the "x-vercel-cron" header
export async function GET(request: Request) {
  try {
    // Check if this is a Vercel cron request or has proper authorization
    const cronHeader = request.headers.get("x-vercel-cron")
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    // Allow if it's a Vercel cron request, or if CRON_SECRET matches, or if no CRON_SECRET is set (dev mode)
    const isVercelCron = cronHeader === "1"
    const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`
    const isDevMode = !cronSecret
    
    if (!isVercelCron && !hasValidSecret && !isDevMode) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    
    const result = await calculateAndCreateSuperPerformanceAwards(
      year ? parseInt(year) : undefined
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        awardsCreated: result.awardsCreated,
        awardsActivated: result.awardsActivated,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in calculate-awards API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    )
  }
}

// Also support POST for cron services
export async function POST(request: Request) {
  return GET(request)
}


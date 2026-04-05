import { NextResponse } from "next/server"
import { ensureLeaveBalancesForYearForAllUsers } from "@/app/(main)/leave/action"
import { getMalaysiaYear } from "@/lib/malaysia-time"

/**
 * Runs at Malaysia midnight on 1 Jan (schedule in vercel.json: Dec 31 16:00 UTC).
 * Provisions fresh yearly leave balance rows for all users for the new calendar year.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    )
  }

  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const year = getMalaysiaYear()
  await ensureLeaveBalancesForYearForAllUsers(year)

  return NextResponse.json({
    ok: true,
    year,
    timezone: "Asia/Kuala_Lumpur",
  })
}

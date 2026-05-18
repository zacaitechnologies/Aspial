import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import { getCachedIsUserAdmin } from "@/lib/admin-cache";

export async function GET(request: NextRequest) {
  try {
    const includeHiddenParam = request.nextUrl.searchParams.get("includeHidden") === "true";
    let includeHidden = false;
    if (includeHiddenParam) {
      const user = await getCachedUser();
      if (user?.id && (await getCachedIsUserAdmin(user.id))) {
        includeHidden = true;
      }
    }

    const services = await prisma.services.findMany({
      where: includeHidden ? undefined : { hidden: false },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

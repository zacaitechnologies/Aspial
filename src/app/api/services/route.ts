import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const services = await prisma.services.findMany({
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

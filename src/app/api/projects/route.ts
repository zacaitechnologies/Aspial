import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: {
        status: {
          in: ["planning", "in_progress"],
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        quotations: {
          select: {
            name: true,
            createdBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }) as any;

    // Transform projects to include client information and generate colors
    const transformedProjects = projects.map((project: any, index: number) => {
      const colors = [
        "#3B82F6", // Blue
        "#10B981", // Green
        "#F59E0B", // Amber
        "#EF4444", // Red
        "#8B5CF6", // Purple
        "#06B6D4", // Cyan
        "#84CC16", // Lime
        "#F97316", // Orange
      ]
      
      return {
        id: project.id.toString(),
        name: project.name,
        description: project.description,
        status: project.status,
        color: colors[index % colors.length],
        client: project.quotations?.[0]?.createdBy 
          ? `${project.quotations[0].createdBy.firstName} ${project.quotations[0].createdBy.lastName}`
          : "Unknown Client",
      }
    })

    return NextResponse.json(transformedProjects)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 
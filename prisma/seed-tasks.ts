import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get the first project to add tasks to
  const project = await prisma.project.findFirst()
  
  if (!project) {
    console.log('No projects found. Please create a project first.')
    return
  }

  // Get project collaborators for assignment
  const permissions = await prisma.projectPermission.findMany({
    where: { projectId: project.id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          supabase_id: true,
        },
      },
    },
  })
  
  const collaborators = permissions.map(permission => permission.user)
  
  if (collaborators.length === 0) {
    console.log('No collaborators found for this project. Please add users to the project first.')
    return
  }

  const sampleTasks = [
    {
      title: "Design new homepage layout",
      description: "Create wireframes and mockups for the new homepage design",
      projectId: project.id,
      status: "in_progress" as const,
      priority: "high" as const,
      assigneeId: collaborators[0]?.supabase_id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      tags: ["Design", "UI/UX"],
      type: "task" as const,
      order: 0,
    },
    {
      title: "Homepage Design Complete",
      description: "Complete all homepage design elements and get approval",
      projectId: project.id,
      status: "todo" as const,
      priority: "high" as const,
      assigneeId: collaborators[0]?.supabase_id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      tags: ["Milestone"],
      type: "milestone" as const,
      order: 1,
    },
    {
      title: "Implement responsive navigation",
      description: "Code the responsive navigation component",
      projectId: project.id,
      status: "todo" as const,
      priority: "medium" as const,
      assigneeId: collaborators[1]?.supabase_id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      tags: ["Development", "Frontend"],
      type: "task" as const,
      order: 2,
    },
    {
      title: "Set up development environment",
      description: "Configure development environment and tools",
      projectId: project.id,
      status: "done" as const,
      priority: "high" as const,
      assigneeId: collaborators[2]?.supabase_id,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      tags: ["Setup", "Development"],
      type: "task" as const,
      order: 3,
    },
    {
      title: "User authentication flow",
      description: "Implement login and registration screens",
      projectId: project.id,
      status: "in_progress" as const,
      priority: "high" as const,
      assigneeId: collaborators[3]?.supabase_id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      tags: ["Authentication", "Frontend"],
      type: "task" as const,
      order: 4,
    },
    {
      title: "MVP Release",
      description: "Release minimum viable product to production",
      projectId: project.id,
      status: "backlog" as const,
      priority: "high" as const,
      assigneeId: collaborators[4]?.supabase_id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      tags: ["Milestone", "Release"],
      type: "milestone" as const,
      order: 5,
    },
  ]

  console.log('Creating sample tasks...')
  
  for (const taskData of sampleTasks) {
    await prisma.task.create({
      data: taskData,
    })
  }

  console.log('Sample tasks created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

"use server"

import { prisma } from "@/lib/prisma"
import { getVisibleProjectsForUser, isUserAdmin } from "./permissions"
import { CreateProjectData, UpdateProjectData } from "./types"

export async function getAllProjects(userId?: string) {
  if (!userId) {
    return []
  }

  // Admins can see all projects
  if (await isUserAdmin(userId)) {
    return await getVisibleProjectsForUser(userId)
  }

  // Non-admins: only projects they own
  return await getVisibleProjectsForUser(userId)
}

export async function getAllProjectsOptimized(userId?: string) {
  if (!userId) {
    return []
  }

  const isAdmin = await isUserAdmin(userId);
  
  if (isAdmin) {
    // For admins: load only essential data for list view
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        created_at: true,
        updated_at: true,
        createdByUser: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        Client: {
          select: {
            name: true,
          }
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Get ownership information for all projects in a single query
    const projectIds = projects.map(p => p.id);
    const userPermissions = await prisma.projectPermission.findMany({
      where: {
        userId,
        projectId: { in: projectIds },
        OR: [
          { isOwner: true },
          { canEdit: true }
        ]
      },
      select: {
        projectId: true,
        isOwner: true,
        canEdit: true
      }
    });

    // Create ownership map
    const ownershipMap: { [key: number]: boolean } = {};
    userPermissions.forEach(permission => {
      ownershipMap[permission.projectId] = permission.isOwner || permission.canEdit;
    });

    return projects.map(project => ({
      ...project,
      taskCount: project._count.tasks,
      isOwner: ownershipMap[project.id] || false
    }));
  }

  // For non-admins: load projects with permissions in single query
  const userPermissions = await prisma.projectPermission.findMany({
    where: { 
      userId, 
      OR: [
        { isOwner: true },
        { canView: true }
      ]
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          created_at: true,
          updated_at: true,
          createdByUser: {
            select: {
              firstName: true,
              lastName: true,
            }
          },
          Client: {
            select: {
              name: true,
            }
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      },
    },
    orderBy: {
      project: { created_at: "desc" },
    },
  });

  return userPermissions.map((permission) => ({
    ...permission.project,
    taskCount: permission.project._count.tasks,
    isOwner: permission.isOwner || permission.canEdit
  }));
}

export async function createProject(data: CreateProjectData) {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      createdBy: data.createdBy,
      startDate: data.startDate ?? new Date(),
      endDate: data.endDate ?? new Date(),
      clientName: data.clientName ?? "",
      clientId: data.clientId ?? "",
    },
  })

  // Create owner permission for the project creator
  await prisma.projectPermission.create({
    data: {
      userId: data.createdBy,
      projectId: project.id,
      canView: true,
      canEdit: true,
      isOwner: true,
    },
  })

  return project
}



export async function updateProjectStatus(id: string, status: string) {
  return await prisma.project.update({
    where: { id: Number.parseInt(id) },
    data: { status },
  })
}

export async function updateProject(
  id: string,
  data: UpdateProjectData
) {
  return await prisma.project.update({
    where: { id: Number.parseInt(id) },
    data,
  })
}

export async function deleteProject(id: string) {
  return await prisma.project.delete({
    where: { id: Number.parseInt(id) },
  })
}

export async function getProjectById(userId: string, projectId: string) {
  if (!userId || !projectId) {
    return null;
  }

  const isAdmin = await isUserAdmin(userId);
  
  // Check if user has access to this project
  const userPermission = await prisma.projectPermission.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: parseInt(projectId),
      },
    },
    select: {
      isOwner: true,
      canEdit: true,
      canView: true,
    },
  });

  // If not admin and no permission, return null
  if (!isAdmin && !userPermission) {
    return null;
  }

  // Fetch project with all necessary data in a single query
  const project = await prisma.project.findUnique({
    where: { id: parseInt(projectId) },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      created_at: true,
      updated_at: true,
      clientName: true,
      clientId: true,
      createdByUser: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      Client: {
        select: {
          name: true,
        },
      },
      quotations: {
        select: {
          id: true,
          totalPrice: true,
          status: true,
          services: {
            select: {
              service: {
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  // Get collaborators in the same query
  const collaborators = await prisma.projectPermission.findMany({
    where: { projectId: parseInt(projectId) },
    select: {
      isOwner: true,
      canEdit: true,
      canView: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Get task statistics
  const taskStats = await prisma.task.groupBy({
    by: ['status'],
    where: { projectId: parseInt(projectId) },
    _count: {
      status: true,
    },
  });

  // Transform task stats
  const stats = {
    total: 0,
    todo: 0,
    inProgress: 0,
    done: 0,
  };

  taskStats.forEach((stat) => {
    const count = stat._count.status;
    stats.total += count;
    
    switch (stat.status) {
      case 'todo':
        stats.todo = count;
        break;
      case 'in_progress':
        stats.inProgress = count;
        break;
      case 'done':
        stats.done = count;
        break;
    }
  });

      return {
      project: {
        ...project,
        taskCount: 0, // project._count.tasks, // Will work after migration
      },
    collaborators,
    taskStats: stats,
    userPermission: userPermission || { isOwner: false, canEdit: false, canView: false },
  };
} 
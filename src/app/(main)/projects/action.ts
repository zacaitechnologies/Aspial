"use server"

import { prisma } from "@/lib/prisma"
import { getVisibleProjectsForUser, isUserAdmin } from "./permissions"
import { CreateProjectData, UpdateProjectData } from "./types"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_cache } from "next/cache"

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

// Internal function - not cached, used by cached version
async function _getProjectsPaginatedInternal(
  userId: string,
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
  statusFilter?: string
) {
  if (!userId) {
    return {
      projects: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    }
  }

  const skip = (page - 1) * pageSize
  const isAdmin = await isUserAdmin(userId)

  // Build where clause for filtering
  const buildWhereClause = () => {
    const where: any = {}
    
    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { 
          createdByUser: { 
            OR: [
              { firstName: { contains: searchQuery, mode: 'insensitive' } },
              { lastName: { contains: searchQuery, mode: 'insensitive' } }
            ]
          } 
        }
      ]
    }

    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter
    }

    return where
  }

  if (isAdmin) {
    const whereClause = buildWhereClause()
    
    // Execute count, findMany, and permissions in parallel for better performance
    const [total, projects] = await Promise.all([
      prisma.project.count({ where: whereClause }),
      prisma.project.findMany({
        where: whereClause,
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
        skip,
        take: pageSize,
      })
    ])

    // Get ownership information (only if we have projects)
    const ownershipMap: { [key: number]: boolean } = {}
    if (projects.length > 0) {
      const projectIds = projects.map(p => p.id)
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
      })

      userPermissions.forEach(permission => {
        ownershipMap[permission.projectId] = permission.isOwner || permission.canEdit
      })
    }

    return {
      projects: projects.map(project => ({
        ...project,
        taskCount: project._count.tasks,
        isOwner: ownershipMap[project.id] || false
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  // For non-admins: count and fetch with permissions
  const whereClause: any = {
    userId,
    OR: [
      { isOwner: true },
      { canView: true }
    ]
  }

  const projectWhereClause = buildWhereClause()
  
  // Execute count and findMany in parallel for better performance
  const [total, userPermissions] = await Promise.all([
    prisma.projectPermission.count({
      where: {
        ...whereClause,
        project: projectWhereClause
      }
    }),
    prisma.projectPermission.findMany({
      where: {
        ...whereClause,
        project: projectWhereClause
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
      skip,
      take: pageSize,
    })
  ])

  return {
    projects: userPermissions.map((permission) => ({
      ...permission.project,
      taskCount: permission.project._count.tasks,
      isOwner: permission.isOwner || permission.canEdit
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

export async function getProjectsPaginated(
  userId?: string,
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
  statusFilter?: string
) {
  if (!userId) {
    return {
      projects: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    }
  }

  // Use cached auth - deduplicates within same request
  await getCachedUser()

  // Cache key based on all parameters
  const cacheKey = `projects-paginated-${userId}-${page}-${pageSize}-${searchQuery || ''}-${statusFilter || 'all'}`
  
  // Cache for 30 seconds - balances freshness with performance
  return await unstable_cache(
    async () => _getProjectsPaginatedInternal(userId, page, pageSize, searchQuery, statusFilter),
    [cacheKey],
    {
      revalidate: 30, // 30 seconds
      tags: ['projects'],
    }
  )()
}

// Helper function to check if project is cancelled
export async function isProjectCancelled(projectId: number): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true },
  });
  
  return project?.status === "cancelled";
}

// Helper function to check if user can modify project
export async function canModifyProject(userId: string, projectId: number): Promise<boolean> {
  // Cancelled projects cannot be modified
  if (await isProjectCancelled(projectId)) {
    return false;
  }
  
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    return true;
  }
  
  const permission = await prisma.projectPermission.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });
  
  return permission?.canEdit || permission?.isOwner || false;
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

  // If quotationId is provided, link the quotation to the project
  if (data.quotationId) {
    await prisma.quotation.update({
      where: { id: data.quotationId },
      data: { projectId: project.id },
    });
  }

  return project
}



export async function updateProjectStatus(
  id: string, 
  status: "planning" | "in_progress" | "on_hold" | "completed" | "cancelled", 
  userId: string
) {
  // Check if user can modify project (includes cancelled check)
  const canModify = await canModifyProject(userId, Number.parseInt(id));
  if (!canModify) {
    throw new Error("Cannot update cancelled projects or insufficient permissions");
  }
  
  return await prisma.project.update({
    where: { id: Number.parseInt(id) },
    data: { status },
  });
}

export async function updateProject(
  id: string,
  data: UpdateProjectData,
  userId: string
) {
  // Check if user can modify project (includes cancelled check)
  const canModify = await canModifyProject(userId, Number.parseInt(id));
  if (!canModify) {
    throw new Error("Cannot update cancelled projects or insufficient permissions");
  }
  
  return await prisma.project.update({
    where: { id: Number.parseInt(id) },
    data,
  });
}

// Soft delete: Cancel project (changes status to cancelled)
export async function cancelProject(id: string, userId: string) {
  // Check if user is admin or project owner
  const isAdmin = await isUserAdmin(userId);
  
  if (!isAdmin) {
    const permission = await prisma.projectPermission.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: Number.parseInt(id),
        },
      },
    });
    
    if (!permission?.isOwner) {
      throw new Error("Only project owners and admins can cancel projects");
    }
  }
  
  return await prisma.project.update({
    where: { id: Number.parseInt(id) },
    data: { status: "cancelled" },
  });
}

// Reactivate: Change cancelled project back to active (admin only)
export async function reactivateProject(
  id: string, 
  userId: string,
  newStatus: "planning" | "in_progress" | "on_hold" = "in_progress"
) {
  // Only admins can reactivate cancelled projects
  const isAdmin = await isUserAdmin(userId);
  
  if (!isAdmin) {
    throw new Error("Only administrators can reactivate cancelled projects");
  }
  
  // Verify the project is actually cancelled
  const project = await prisma.project.findUnique({
    where: { id: Number.parseInt(id) },
  });
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  if (project.status !== "cancelled") {
    throw new Error("Only cancelled projects can be reactivated");
  }
  
  return await prisma.project.update({
    where: { id: Number.parseInt(id) },
    data: { status: newStatus },
  });
}

// Hard delete: Permanently delete project (only for admins)
export async function deleteProject(id: string, userId: string) {
  // Only admins can hard delete projects
  const isAdmin = await isUserAdmin(userId);
  
  if (!isAdmin) {
    throw new Error("Only administrators can permanently delete projects");
  }
  
  return await prisma.project.delete({
    where: { id: Number.parseInt(id) },
  });
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
          name: true,
          totalPrice: true,
          workflowStatus: true,
          paymentStatus: true,
          services: {
            select: {
              id: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  basePrice: true,
                  ServiceToTag: {
                    include: {
                      service_tags: true
                    }
                  },
                },
              },
            },
          },
          customServices: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              status: true,
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
    userPermission: {
      ...userPermission,
      isAdmin,
      isOwner: userPermission?.isOwner || false,
      canEdit: userPermission?.canEdit || false,
      canView: userPermission?.canView || false,
    },
  };
} 

export async function createProjectComplaint(
	projectId: number,
	userId: string,
	reason: string,
	customer: string
) {
	try {
		const complaint = await prisma.complaint.create({
			data: {
				projectId,
				userId,
				reason,
				customer,
			},
			include: {
				user: {
					select: {
						firstName: true,
						lastName: true,
						email: true,
					},
				},
				project: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		})

		return {
			success: true,
			data: complaint,
		}
	} catch (error) {
		console.error("Error creating complaint:", error)
		return {
			success: false,
			error: "Failed to create complaint",
		}
	}
}

export async function getProjectComplaints(projectId: number) {
	try {
		const complaints = await prisma.complaint.findMany({
			where: {
				projectId,
			},
			include: {
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
			},
			orderBy: {
				created_at: "desc",
			},
		})

		return complaints
	} catch (error) {
		console.error("Error fetching complaints:", error)
		return []
	}
}

export async function getUserComplaintCount(userId: string): Promise<number> {
	try {
		const count = await prisma.complaint.findMany({
			where: {
				userId,
			},
		})

		return count.length
	} catch (error) {
		console.error("Error fetching complaint count:", error)
		return 0
	}
}

export async function updateComplaint(
	complaintId: number,
	reason: string,
	customer: string
) {
	try {
		const complaint = await prisma.complaint.update({
			where: { id: complaintId },
			data: {
				reason,
				customer,
				updated_at: new Date(),
			},
			include: {
				user: {
					select: {
						firstName: true,
						lastName: true,
						email: true,
					},
				},
			},
		})

		return {
			success: true,
			data: complaint,
		}
	} catch (error) {
		console.error("Error updating complaint:", error)
		return {
			success: false,
			error: "Failed to update complaint",
		}
	}
}

export async function deleteComplaint(complaintId: number) {
	try {
		await prisma.complaint.delete({
			where: { id: complaintId },
		})

		return {
			success: true,
		}
	} catch (error) {
		console.error("Error deleting complaint:", error)
		return {
			success: false,
			error: "Failed to delete complaint",
		}
	}
} 
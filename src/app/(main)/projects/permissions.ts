"use server"

import { prisma } from "@/lib/prisma"
import { revalidateTag } from "next/cache"

export async function isUserAdmin(userSupabaseId: string) {
  // Check if userSupabaseId is valid
  if (!userSupabaseId || userSupabaseId.trim() === '') {
    return false
  }

  const userWithRoles = await prisma.user.findUnique({
    where: { supabase_id: userSupabaseId },
    include: { userRoles: { include: { role: true } } },
  })

  if (!userWithRoles) return false
  return userWithRoles.userRoles.some((userRole) => userRole.role.slug === "admin")
}

export async function getVisibleProjectsForUser(userSupabaseId: string) {
  const isAdmin = await isUserAdmin(userSupabaseId)

  if (isAdmin) {
    const projects = await prisma.project.findMany({
      include: {
        quotations: {
          include: {
            services: {
              include: { service: true },
            },
          },
        },
        createdByUser: true,
        Client: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    })

    return projects.map(project => ({
      ...project,
      taskCount: project._count.tasks,
    }))
  }

  const userPermissions = await prisma.projectPermission.findMany({
    where: { 
      userId: userSupabaseId, 
      OR: [
        { isOwner: true },
        { canView: true }
      ]
    },
    include: {
              project: {
          include: {
            quotations: {
              include: {
                services: {
                  include: { service: true },
                },
              },
            },
            createdByUser: true,
            Client: true,
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
  })

  return userPermissions.map((permission) => ({
    ...permission.project,
    taskCount: permission.project._count.tasks,
  }))
}

export async function updateProjectPermission(
  projectId: number,
  userId: string,
  requestingUserId: string,
  newIsOwner: boolean
) {
  // 1. Check if requester is admin
  const isAdmin = await isUserAdmin(requestingUserId);
  
  if (!isAdmin) {
    // 2. Check if requester is an owner
    const requesterPermission = await prisma.projectPermission.findUnique({
      where: { userId_projectId: { userId: requestingUserId, projectId } }
    });
    
    if (!requesterPermission?.isOwner) {
      throw new Error("Only project owners can update permissions");
    }
    
    // 3. Check if target is the creator (cannot demote creator)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true }
    });
    
    if (userId === project?.createdBy && !newIsOwner) {
      throw new Error("Cannot demote the project creator from owner status");
    }
    
    // 4. Check if demoting the last owner
    if (!newIsOwner) {
      const currentPermission = await prisma.projectPermission.findUnique({
        where: { userId_projectId: { userId, projectId } }
      });
      
      if (currentPermission?.isOwner) {
        const ownerCount = await prisma.projectPermission.count({
          where: { projectId, isOwner: true }
        });
        
        if (ownerCount <= 1) {
          throw new Error("Cannot demote the last owner. Promote another collaborator to owner first");
        }
      }
    }
  }
  
  // Proceed with update - always keep canView and canEdit as true
  return await prisma.projectPermission.update({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    data: {
      canView: true, // Always true
      canEdit: true, // Always true
      isOwner: newIsOwner,
    },
    include: {
      user: true,
      project: true,
    },
  });
}

export async function removeProjectCollaborator(
  projectId: number, 
  userId: string, 
  requestingUserId: string
) {
  // 1. Check if requester is admin
  const isAdmin = await isUserAdmin(requestingUserId);
  
  if (!isAdmin) {
    // 2. Check if requester is an owner
    const requesterPermission = await prisma.projectPermission.findUnique({
      where: { userId_projectId: { userId: requestingUserId, projectId } }
    });
    
    if (!requesterPermission?.isOwner) {
      throw new Error("Only project owners can remove collaborators");
    }
    
    // 3. Check if target is the creator
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true }
    });
    
    if (userId === project?.createdBy) {
      throw new Error("Cannot remove the project creator");
    }
    
    // 4. Check if this would remove the last owner
    const targetPermission = await prisma.projectPermission.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });
    
    if (targetPermission?.isOwner) {
      const ownerCount = await prisma.projectPermission.count({
        where: { projectId, isOwner: true }
      });
      
      if (ownerCount <= 1) {
        throw new Error("Cannot remove the last owner. Promote another collaborator to owner first");
      }
    }
  }
  
  // Get project and user info before removal for notification
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });

  const requester = await prisma.user.findUnique({
    where: { supabase_id: requestingUserId },
    select: { firstName: true, lastName: true },
  });

  // Proceed with removal
  const result = await prisma.projectPermission.delete({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  // Create notification for the removed user
  try {
    await prisma.projectInvitation.upsert({
      where: {
        projectId_invitedUser: {
          projectId,
          invitedUser: userId,
        },
      },
      update: {
        status: 'removed',
        invitedBy: requestingUserId,
        canView: false,
        canEdit: false,
        isOwner: false,
        updatedAt: new Date(),
      },
      create: {
        projectId,
        invitedBy: requestingUserId,
        invitedUser: userId,
        status: 'removed',
        canView: false,
        canEdit: false,
        isOwner: false,
      },
    });
  } catch (error) {
    // If notification creation fails, log but don't fail the removal
    console.error('Failed to create removal notification:', error);
  }

  return result;
}

export async function getProjectCreator(projectId: number): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdBy: true }
  });
  
  return project?.createdBy || null;
}

export async function getProjectPermissions(projectId: number) {
  return await prisma.projectPermission.findMany({
    where: {
      projectId,
    },
    include: {
      user: true,
    },
    orderBy: [
      {
        isOwner: "desc",
      },
      {
        user: {
          firstName: "asc",
        },
      },
    ],
  })
}

export async function getUserProjectPermissions(userId: string) {
  return await prisma.projectPermission.findMany({
    where: {
      userId,
    },
    include: {
      project: {
        include: {
          quotations: true,
          createdByUser: true,
        },
      },
    },
    orderBy: {
      project: {
        created_at: "desc",
      },
    },
  })
}

export async function canUserAccessProject(userId: string, projectId: number) {
  if (await isUserAdmin(userId)) {
    return true
  }

  const permission = await prisma.projectPermission.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  })

  return permission?.isOwner || permission?.canView || false
}

export async function canUserEditProject(userId: string, projectId: number) {
  const permission = await prisma.projectPermission.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  })

  return permission?.canEdit || false
}

export async function isUserProjectOwner(userId: string, projectId: number) {
  const permission = await prisma.projectPermission.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  })

  return permission?.isOwner || false
}

// Invitation-related functions
export async function getAllUsers() {
  return await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      supabase_id: true,
    },
    orderBy: [
      { firstName: "asc" },
      { lastName: "asc" },
    ],
  })
}

export async function getAvailableUsersForProject(projectId: number) {
  // Get all users who are not already collaborators on this project
  const existingCollaborators = await prisma.projectPermission.findMany({
    where: { projectId },
    select: { userId: true },
  })
  
  const existingUserIds = existingCollaborators.map(c => c.userId)
  
  return await prisma.user.findMany({
    where: {
      supabase_id: {
        notIn: existingUserIds,
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      supabase_id: true,
    },
    orderBy: [
      { firstName: "asc" },
      { lastName: "asc" },
    ],
  })
}

export async function createProjectInvitation(
	projectId: number,
	invitedBy: string,
	invitedUser: string,
	canView: boolean = true,
	canEdit: boolean = true,
	isOwner: boolean = false
) {
	// Check if the inviter is an admin or project owner
	const isAdmin = await isUserAdmin(invitedBy);
	
	if (!isAdmin) {
		// For non-admins, check if they are a project owner
		const permission = await prisma.projectPermission.findUnique({
			where: {
				userId_projectId: {
					userId: invitedBy,
					projectId: projectId,
				},
			},
		});
		
		if (!permission?.isOwner) {
			throw new Error("Only project owners or admins can invite collaborators");
		}
	}
	
	// Use upsert to update existing invitation or create new one
	return await prisma.projectInvitation.upsert({
		where: {
			projectId_invitedUser: {
				projectId,
				invitedUser,
			},
		},
		update: {
			// Reset to pending status and update permissions
			status: 'pending',
			invitedBy,
			canView,
			canEdit,
			isOwner,
			updatedAt: new Date(),
		},
		create: {
			projectId,
			invitedBy,
			invitedUser,
			canView,
			canEdit,
			isOwner,
		},
		include: {
			project: true,
			inviter: {
				select: {
					firstName: true,
					lastName: true,
					email: true,
				},
			},
			invitee: {
				select: {
					firstName: true,
					lastName: true,
					email: true,
				},
			},
		},
	})
}

// Regular user function - Get their own invitations (all statuses for history)
export async function getUserInvitations(userId: string) {
  return await prisma.projectInvitation.findMany({
    where: { 
      invitedUser: userId,
    },
    include: {
      project: {
        include: {
          quotations: true,
          createdByUser: true,
        },
      },
      inviter: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

// Admin function - Get all invitations for all users (including accepted/declined)
export async function getAllInvitationsForAdmin() {
  return await prisma.projectInvitation.findMany({
    include: {
      project: {
        include: {
          quotations: true,
          createdByUser: true,
        },
      },
      inviter: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      invitee: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function acceptProjectInvitation(invitationId: number) {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { id: invitationId },
    include: { project: true },
  })

  if (!invitation) {
    throw new Error("Invitation not found")
  }

  if (invitation.status !== "pending") {
    throw new Error("Invitation is no longer pending")
  }

  // Use a transaction to update invitation and create permission
  const permission = await prisma.$transaction(async (tx) => {
    // Update invitation status
    await tx.projectInvitation.update({
      where: { id: invitationId },
      data: { status: "accepted" },
    })

    // Create project permission
    const permission = await tx.projectPermission.create({
      data: {
        userId: invitation.invitedUser,
        projectId: invitation.projectId,
        canView: invitation.canView,
        canEdit: invitation.canEdit,
        isOwner: invitation.isOwner,
      },
      include: {
        user: true,
        project: true,
      },
    })

    return permission
  })

  // Invalidate project cache to reflect the new collaborator
  revalidateTag('projects', "max")

  return permission
}

export async function declineProjectInvitation(invitationId: number) {
  return await prisma.projectInvitation.update({
    where: { id: invitationId },
    data: { status: "declined" },
  })
}

export async function getProjectInvitations(projectId: number) {
  return await prisma.projectInvitation.findMany({
    where: { projectId },
    include: {
      inviter: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      invitee: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

// Admin-specific can see all invitations and help accept/decline
export async function getAllPendingInvitations() {
  return await prisma.projectInvitation.findMany({
    where: { status: "pending" },
    include: {
      project: {
        include: {
          quotations: true,
          createdByUser: true,
        },
      },
      inviter: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      invitee: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function getAllInvitations() {
  return await prisma.projectInvitation.findMany({
    include: {
      project: {
        include: {
          quotations: true,
          createdByUser: true,
        },
      },
      inviter: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      invitee: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}
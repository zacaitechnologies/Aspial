"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { createClient } from "@/utils/supabase/server"
import { CreateServiceData, UpdateServiceData, CreateServiceTagData, UpdateServiceTagData, Service, ServiceTag } from "./types"

const SERVICE_IMAGES_BUCKET = "service"

// Helper function to transform Prisma service data to match our Service type
function transformService(service: any): Service {
  return {
    ...service,
    tags: service.ServiceToTag?.map((st: any) => st.service_tags) || []
  }
}

// Helper function to transform Prisma service tag data to match our ServiceTag type
function transformServiceTag(tag: any): ServiceTag {
  return {
    ...tag,
    services: tag.ServiceToTag?.map((st: any) => st.Services) || []
  }
}

// Service Tag Actions
export async function createServiceTag(data: CreateServiceTagData): Promise<ServiceTag> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  const tag = await prisma.serviceTag.create({
    data: {
      name: data.name,
      color: data.color || "#3B82F6",
    },
    include: {
      ServiceToTag: {
        include: {
          Services: true
        }
      }
    },
  })
  
  return transformServiceTag(tag)
}

export async function getAllServiceTags(): Promise<ServiceTag[]> {
  const tags = await prisma.serviceTag.findMany({
    include: {
      ServiceToTag: {
        include: {
          Services: true
        }
      }
    },
    orderBy: { name: 'asc' },
  })
  
  return tags.map(transformServiceTag)
}

export async function getServiceTagById(id: number): Promise<ServiceTag | null> {
  const tag = await prisma.serviceTag.findUnique({
    where: { id },
    include: {
      ServiceToTag: {
        include: {
          Services: true
        }
      }
    },
  })
  
  return tag ? transformServiceTag(tag) : null
}

export async function updateServiceTag(id: number, data: UpdateServiceTagData): Promise<ServiceTag> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  const tag = await prisma.serviceTag.update({
    where: { id },
    data,
    include: {
      ServiceToTag: {
        include: {
          Services: true
        }
      }
    },
  })
  
  return transformServiceTag(tag)
}

export interface DeletionImpactItem {
	label: string
	count: number
	examples?: string[]
}

export interface DeletionImpact {
	items: DeletionImpactItem[]
}

export async function getServiceTagDeletionImpact(id: number): Promise<DeletionImpact> {
	try {
		const services = await prisma.services.findMany({
			where: {
				ServiceToTag: {
					some: {
						A: id,
					},
				},
			},
			select: { id: true, name: true },
			take: 5,
		})

		const servicesCount = await prisma.services.count({
			where: {
				ServiceToTag: {
					some: {
						A: id,
					},
				},
			},
		})

		const items: DeletionImpactItem[] = []

		if (servicesCount > 0) {
			items.push({
				label: "services",
				count: servicesCount,
				examples: services.map((s) => s.name),
			})
		}

		return { items }
	} catch (error: any) {
		console.error("Error in getServiceTagDeletionImpact:", error)
		throw new Error("Failed to get deletion impact")
	}
}

export async function getServiceDeletionImpact(id: number): Promise<DeletionImpact> {
	try {
		// Get quotations via QuotationService
		const quotationServices = await prisma.quotationService.findMany({
			where: { serviceId: id },
			include: {
				quotation: {
					select: { id: true, name: true },
				},
			},
			take: 5,
		})

		// Get projects via Milestone
		const milestones = await prisma.milestone.findMany({
			where: { serviceId: id },
			include: {
				project: {
					select: { id: true, name: true },
				},
			},
			take: 5,
		})

		// Get invoices via Quotation -> Invoice
		const invoices = await prisma.invoice.findMany({
			where: {
				quotation: {
					services: {
						some: {
							serviceId: id,
						},
					},
				},
			},
			select: { id: true, invoiceNumber: true },
			take: 5,
		})

		// Get receipts via Invoice -> Receipt
		const receipts = await prisma.receipt.findMany({
			where: {
				invoice: {
					quotation: {
						services: {
							some: {
								serviceId: id,
							},
						},
					},
				},
			},
			select: { id: true, receiptNumber: true },
			take: 5,
		})

		const [quotationsCount, projectsCount, invoicesCount, receiptsCount] = await Promise.all([
			prisma.quotationService.count({ where: { serviceId: id } }),
			prisma.milestone.count({ where: { serviceId: id } }),
			prisma.invoice.count({
				where: {
					quotation: {
						services: {
							some: {
								serviceId: id,
							},
						},
					},
				},
			}),
			prisma.receipt.count({
				where: {
					invoice: {
						quotation: {
							services: {
								some: {
									serviceId: id,
								},
							},
						},
					},
				},
			}),
		])

		const items: DeletionImpactItem[] = []

		if (quotationsCount > 0) {
			items.push({
				label: "quotation services",
				count: quotationsCount,
				examples: quotationServices.map((qs) => qs.quotation.name),
			})
		}

		if (projectsCount > 0) {
			items.push({
				label: "projects",
				count: projectsCount,
				examples: milestones.map((m) => m.project.name),
			})
		}

		if (invoicesCount > 0) {
			items.push({
				label: "invoices",
				count: invoicesCount,
				examples: invoices.map((i) => i.invoiceNumber),
			})
		}

		if (receiptsCount > 0) {
			items.push({
				label: "receipts",
				count: receiptsCount,
				examples: receipts.map((r) => r.receiptNumber),
			})
		}

		return { items }
	} catch (error: any) {
		console.error("Error in getServiceDeletionImpact:", error)
		throw new Error("Failed to get deletion impact")
	}
}

export async function deleteServiceTag(id: number): Promise<void> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  await prisma.serviceTag.delete({
    where: { id },
  })
}

// Service Actions
export async function createService(data: CreateServiceData): Promise<Service> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  const { tagIds, imageUrl, ...serviceData } = data
  
  const service = await prisma.services.create({
    data: {
      ...serviceData,
      imageUrl: imageUrl || null,
      ServiceToTag: tagIds && tagIds.length > 0 ? {
        create: tagIds.map(tagId => ({
          A: tagId  // A is the ServiceTag id in the join table
        }))
      } : undefined,
    },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
  })
  
  return transformService(service)
}

export async function getAllServices(): Promise<Service[]> {
  const services = await prisma.services.findMany({
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
    orderBy: { name: 'asc' },
  })
  
  return services.map(transformService)
}

export async function getServiceById(id: number): Promise<Service | null> {
  const service = await prisma.services.findUnique({
    where: { id },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
  })
  
  return service ? transformService(service) : null
}

export async function updateService(id: number, data: UpdateServiceData): Promise<Service> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  const { tagIds, imageUrl, ...serviceData } = data
  
  // Update the service with new tags
  // First delete all existing tag relations, then create new ones
  const service = await prisma.services.update({
    where: { id },
    data: {
      ...serviceData,
      ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
      ServiceToTag: {
        deleteMany: {}, // Delete all existing tag relations for this service
        create: tagIds && tagIds.length > 0 
          ? tagIds.map(tagId => ({
              A: tagId  // A is the ServiceTag id in the join table
            }))
          : [],
      },
    },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
  })
  
  return transformService(service)
}

export async function deleteService(id: number): Promise<void> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  await prisma.services.delete({
    where: { id },
  })
}

// Get services by tag
export async function getServicesByTag(tagId: number): Promise<Service[]> {
  const services = await prisma.services.findMany({
    where: {
      ServiceToTag: {
        some: {
          A: tagId,
        },
      },
    },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
    orderBy: { name: 'asc' },
  })
  
  return services.map(transformService)
}

// Search services by name or description
export async function searchServices(query: string): Promise<Service[]> {
  const services = await prisma.services.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      ServiceToTag: {
        include: {
          service_tags: true
        }
      }
    },
    orderBy: { name: 'asc' },
  })
  
  return services.map(transformService)
}

// Check if current user is admin
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const user = await getCachedUser()
    
    const userWithRoles = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    if (!userWithRoles) {
      return false
    }
    
    return userWithRoles.userRoles.some((userRole) => userRole.role.slug === "admin")
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}

/**
 * Upload a service image to Supabase storage
 */
export async function uploadServiceImage(
  serviceId: number,
  formData: FormData
): Promise<{ success: boolean; error?: string; imageUrl?: string }> {
  try {
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      return { success: false, error: "Unauthorized: Admin access required" }
    }

    const supabase = await createClient()
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !supabaseUser) {
      return { success: false, error: "User not authenticated. Please log in again." }
    }

    const user = await getCachedUser()
    if (!user) {
      return { success: false, error: "User not found in database" }
    }

    if (user.id !== supabaseUser.id) {
      return { success: false, error: "User ID mismatch" }
    }

    const file = formData.get("file") as File
    if (!file) {
      return { success: false, error: "No file provided" }
    }

    // Validate file type - accept images and PDFs
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    const isImage = allowedImageTypes.includes(file.type)
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    
    if (!isImage && !isPDF) {
      return { success: false, error: "Invalid file type. Only JPEG, PNG, GIF, WebP images, or PDF files are allowed." }
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: "File size exceeds 5MB limit" }
    }

    // Generate unique filename: service-{serviceId}-{timestamp}.{ext}
    const fileExtension = file.name.split('.').pop() || (file.type === "application/pdf" ? "pdf" : "jpg")
    const timestamp = Date.now()
    const fileName = `service-${serviceId}-${timestamp}.${fileExtension}`

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(SERVICE_IMAGES_BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      if (uploadError.message.includes("Bucket not found")) {
        return {
          success: false,
          error: `Bucket '${SERVICE_IMAGES_BUCKET}' not found. Please create it in Supabase Dashboard > Storage.`
        }
      }
      return { success: false, error: `Failed to upload image: ${uploadError.message}` }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(SERVICE_IMAGES_BUCKET)
      .getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    // If service already has an image, delete the old one
    const existingService = await prisma.services.findUnique({
      where: { id: serviceId },
      select: { imageUrl: true }
    })

    if (existingService?.imageUrl) {
      // Extract filename from URL
      const oldFileName = existingService.imageUrl.split('/').pop()?.split('?')[0]
      if (oldFileName) {
        // Delete old file (best effort, don't fail if it doesn't exist)
        await supabase.storage
          .from(SERVICE_IMAGES_BUCKET)
          .remove([oldFileName])
          .catch(err => console.warn("Failed to delete old image:", err))
      }
    }

    // Update service with new image URL
    await prisma.services.update({
      where: { id: serviceId },
      data: { imageUrl: publicUrl }
    })

    return { success: true, imageUrl: publicUrl }
  } catch (error: any) {
    console.error("Error uploading service image:", error)
    return { success: false, error: error.message || "Failed to upload image" }
  }
}

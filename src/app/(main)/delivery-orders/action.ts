"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore, unstable_cache, revalidateTag, revalidatePath } from "next/cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { ensureClientAdvisors } from "@/lib/client-advisors"
import { formatLocalDateTime, parseDocumentDateInputOrNow } from "@/lib/date-utils"
import { Prisma } from "@prisma/client"
import {
  createDeliveryOrderSchema,
  updateDeliveryOrderSchema,
  sendDeliveryOrderEmailSchema,
  deliveryOrderIdSchema,
  deliveryOrderListFiltersSchema,
  type CreateDeliveryOrderValues,
  type UpdateDeliveryOrderValues,
  type SendDeliveryOrderEmailValues,
  type DeliveryOrderListFilters,
} from "@/lib/validation"
import { computeSubtotal, computeFinalAmount } from "./utils/totals"

// ==================== Listing ====================

async function _getDeliveryOrdersPaginatedInternal(
  page: number = 1,
  pageSize: number = 10,
  filters: DeliveryOrderListFilters = {},
) {
  const skip = (page - 1) * pageSize
  const parsed = deliveryOrderListFiltersSchema.safeParse(filters)
  const raw = parsed.success ? parsed.data : {}
  const { searchQuery, clientId, advisorFilter, status } = raw
  const monthYear = raw.monthYear && /^\d{4}-\d{2}$/.test(raw.monthYear) ? raw.monthYear : undefined

  const where: Prisma.DeliveryOrderWhereInput = {}
  if (clientId && clientId !== "all") where.clientId = clientId
  if (status) where.status = status
  if (advisorFilter && advisorFilter !== "all") {
    where.advisors = { some: { userId: advisorFilter } }
  }
  if (monthYear) {
    const [y, m] = monthYear.split("-").map(Number)
    if (!Number.isNaN(y) && m >= 1 && m <= 12) {
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0, 23, 59, 59, 999)
      where.deliveryOrderDate = { gte: start, lte: end }
    }
  }
  const term = searchQuery?.trim()
  if (term) {
    where.OR = [
      { deliveryOrderNumber: { contains: term, mode: "insensitive" } },
      { client: { name: { contains: term, mode: "insensitive" } } },
      { client: { company: { contains: term, mode: "insensitive" } } },
      { client: { email: { contains: term, mode: "insensitive" } } },
    ]
  }

  const [total, deliveryOrders] = await Promise.all([
    prisma.deliveryOrder.count({ where }),
    prisma.deliveryOrder.findMany({
      where,
      select: {
        id: true,
        deliveryOrderNumber: true,
        clientId: true,
        totalAmount: true,
        finalAmount: true,
        discountType: true,
        discountValue: true,
        status: true,
        deliveryOrderDate: true,
        created_at: true,
        updated_at: true,
        client: {
          select: { id: true, name: true, email: true, company: true, phone: true },
        },
        createdBy: {
          select: { supabase_id: true, firstName: true, lastName: true, email: true },
        },
        advisors: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: pageSize,
    }),
  ])

  const data = deliveryOrders.map((d) => ({
    ...d,
    advisors: d.advisors.map((a) => a.user),
  }))

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

const getCachedDeliveryOrdersPaginated = unstable_cache(
  _getDeliveryOrdersPaginatedInternal,
  ["delivery-orders-paginated"],
  { revalidate: 30, tags: ["delivery-orders"] },
)

export async function getDeliveryOrdersPaginated(
  page: number = 1,
  pageSize: number = 10,
  filters: DeliveryOrderListFilters = {},
  useCache: boolean = false,
) {
  if (useCache) return getCachedDeliveryOrdersPaginated(page, pageSize, filters)
  unstable_noStore()
  return _getDeliveryOrdersPaginatedInternal(page, pageSize, filters)
}

export async function getDeliveryOrdersPaginatedFresh(
  page: number = 1,
  pageSize: number = 10,
  filters: DeliveryOrderListFilters = {},
) {
  unstable_noStore()
  return _getDeliveryOrdersPaginatedInternal(page, pageSize, filters)
}

export async function getDeliveryOrderAdvisors() {
  unstable_noStore()
  const rows = await prisma.deliveryOrderAdvisor.findMany({
    distinct: ["userId"],
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })
  return rows
    .map((r) => r.user)
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
}

export async function invalidateDeliveryOrdersCache() {
  revalidateTag("delivery-orders", "max")
}

// ==================== Detail fetch ====================

export async function getDeliveryOrderFullById(id: unknown) {
  unstable_noStore()
  const validatedId = deliveryOrderIdSchema.parse(id)

  const row = await prisma.deliveryOrder.findUnique({
    where: { id: validatedId },
    include: {
      client: true,
      createdBy: {
        select: {
          supabase_id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      services: {
        include: { service: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
      advisors: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      emails: {
        include: {
          sentBy: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { sentAt: "desc" },
      },
    },
  })

  if (!row) return null

  return {
    ...row,
    advisors: row.advisors.map((a) => a.user),
  }
}

export type FullDeliveryOrder = NonNullable<Awaited<ReturnType<typeof getDeliveryOrderFullById>>>

// ==================== Number generator ====================

async function generateDeliveryOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const result = await tx.$queryRaw<Array<{ generate_gapless_delivery_order_number: string }>>`
    SELECT generate_gapless_delivery_order_number() as "generate_gapless_delivery_order_number"
  `
  if (!result || result.length === 0 || !result[0]?.generate_gapless_delivery_order_number) {
    throw new Error("Failed to generate delivery order number")
  }
  return result[0].generate_gapless_delivery_order_number
}

// ==================== Create ====================

export async function createDeliveryOrder(data: unknown) {
  const validatedData = createDeliveryOrderSchema.parse(data) satisfies CreateDeliveryOrderValues

  const user = await getCachedUser()
  if (!user) throw new Error("User must be authenticated to create a delivery order")

  const [dbUser, isAdmin, client, dbServices] = await Promise.all([
    prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }),
    getCachedIsUserAdmin(user.id),
    prisma.client.findUnique({ where: { id: validatedData.clientId }, select: { id: true } }),
    prisma.services.findMany({
      where: { id: { in: validatedData.services.map((s) => s.serviceId) } },
      select: { id: true, description: true },
    }),
  ])

  if (!dbUser) throw new Error("User not found in database")
  if (!client) throw new Error("Client not found")
  const serviceById = new Map(dbServices.map((s) => [s.id, s]))
  for (const item of validatedData.services) {
    if (!serviceById.has(item.serviceId)) {
      throw new Error(`Service ${item.serviceId} not found`)
    }
  }

  let advisorIds = [...new Set(validatedData.advisorIds)]
  if (!isAdmin && !advisorIds.includes(dbUser.id)) {
    advisorIds = [...advisorIds, dbUser.id]
  }
  const deliveryOrderDate = parseDocumentDateInputOrNow(validatedData.deliveryOrderDate)
  const subtotal = computeSubtotal(validatedData.services)
  const finalAmount = computeFinalAmount(
    subtotal,
    validatedData.discountType,
    validatedData.discountValue,
  )

  const maxRetries = 3
  let lastError: unknown = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const created = await prisma.$transaction(
        async (tx) => {
          const deliveryOrderNumber = await generateDeliveryOrderNumber(tx)

          await ensureClientAdvisors(validatedData.clientId, advisorIds, tx)

          const order = await tx.deliveryOrder.create({
            data: {
              deliveryOrderNumber,
              clientId: validatedData.clientId,
              notes: validatedData.notes ?? null,
              discountType: validatedData.discountType ?? null,
              discountValue: validatedData.discountValue ?? null,
              totalAmount: subtotal,
              finalAmount,
              status: "active",
              deliveryOrderDate,
              createdById: user.id,
              services: {
                create: validatedData.services.map((s, idx) => ({
                  serviceId: s.serviceId,
                  descriptionOverride:
                    s.descriptionOverride.trim().length > 0
                      ? s.descriptionOverride
                      : (serviceById.get(s.serviceId)?.description ?? ""),
                  price: s.price,
                  quantity: s.quantity,
                  sortOrder: s.sortOrder ?? idx,
                })),
              },
              advisors: { create: advisorIds.map((id) => ({ userId: id })) },
            },
            select: { id: true, deliveryOrderNumber: true },
          })
          return order
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        },
      )

      revalidateTag("delivery-orders", { expire: 0 })
      revalidatePath("/delivery-orders")
      return created
    } catch (error: unknown) {
      lastError = error
      const code = (error as { code?: string })?.code
      const retryable =
        code === "P2002" ||
        code === "P2034" ||
        (error instanceof Error &&
          (error.message.includes("Unique constraint failed") ||
            error.message.includes("duplicate key value") ||
            error.message.includes("could not serialize")))
      if (!retryable || attempt === maxRetries - 1) {
        if (process.env.NODE_ENV === "development") {
          console.error(`Error creating delivery order (attempt ${attempt + 1}/${maxRetries}):`, error)
        }
        throw error
      }
      const delay = Math.min(50 * 2 ** attempt + Math.random() * 100, 500)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError || new Error("Failed to create delivery order after multiple attempts")
}

// ==================== Update ====================

export async function updateDeliveryOrder(id: unknown, data: unknown) {
  const validatedId = deliveryOrderIdSchema.parse(id)
  const validatedData = updateDeliveryOrderSchema.parse(data) satisfies UpdateDeliveryOrderValues

  const user = await getCachedUser()
  if (!user) throw new Error("User must be authenticated")

  const [existing, dbUser, isAdmin] = await Promise.all([
    prisma.deliveryOrder.findUnique({
      where: { id: validatedId },
      select: {
        id: true,
        clientId: true,
        createdById: true,
        discountType: true,
        discountValue: true,
        services: { select: { price: true, quantity: true } },
        advisors: { select: { userId: true } },
      },
    }),
    prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }),
    getCachedIsUserAdmin(user.id),
  ])

  if (!existing) throw new Error("Delivery order not found")
  if (!dbUser) throw new Error("User not found in database")

  const isCreator = existing.createdById === user.id
  const isAdvisorOnDO = existing.advisors.some((a) => a.userId === dbUser.id)
  if (!isAdmin && !isCreator && !isAdvisorOnDO) {
    throw new Error("Not authorized to edit this delivery order")
  }

  // Resolve services + recompute totals if services or discount changed
  const willChangeServices = Array.isArray(validatedData.services)
  const willChangeDiscount =
    validatedData.discountType !== undefined || validatedData.discountValue !== undefined

  let nextSubtotal = existing.services.reduce((s, x) => s + x.price * x.quantity, 0)
  let nextFinal = computeFinalAmount(
    nextSubtotal,
    existing.discountType,
    existing.discountValue,
  )

  // Validate service catalog ids when services are provided
  let serviceById = new Map<number, { id: number; description: string }>()
  if (willChangeServices && validatedData.services) {
    const dbServices = await prisma.services.findMany({
      where: { id: { in: validatedData.services.map((s) => s.serviceId) } },
      select: { id: true, description: true },
    })
    serviceById = new Map(dbServices.map((s) => [s.id, s]))
    for (const item of validatedData.services) {
      if (!serviceById.has(item.serviceId)) {
        throw new Error(`Service ${item.serviceId} not found`)
      }
    }
    nextSubtotal = computeSubtotal(validatedData.services)
  }

  if (willChangeServices || willChangeDiscount) {
    const discType =
      validatedData.discountType !== undefined ? validatedData.discountType : existing.discountType
    const discVal =
      validatedData.discountValue !== undefined
        ? validatedData.discountValue
        : existing.discountValue
    nextFinal = computeFinalAmount(nextSubtotal, discType ?? null, discVal ?? null)
  }

  const deliveryOrderDate =
    validatedData.deliveryOrderDate !== undefined
      ? parseDocumentDateInputOrNow(validatedData.deliveryOrderDate)
      : undefined

  const updated = await prisma.$transaction(async (tx) => {
    if (willChangeServices && validatedData.services) {
      await tx.deliveryOrderService.deleteMany({ where: { deliveryOrderId: validatedId } })
    }
    if (validatedData.advisorIds) {
      await tx.deliveryOrderAdvisor.deleteMany({ where: { deliveryOrderId: validatedId } })
    }
    let nextAdvisorIds = validatedData.advisorIds
      ? [...new Set(validatedData.advisorIds)]
      : undefined
    if (nextAdvisorIds && !isAdmin && !nextAdvisorIds.includes(dbUser.id)) {
      nextAdvisorIds = [...nextAdvisorIds, dbUser.id]
    }

    const targetClientId = validatedData.clientId ?? existing.clientId
    if (nextAdvisorIds && nextAdvisorIds.length > 0) {
      await ensureClientAdvisors(targetClientId, nextAdvisorIds, tx)
    }

    const result = await tx.deliveryOrder.update({
      where: { id: validatedId },
      data: {
        clientId: validatedData.clientId,
        notes: validatedData.notes,
        discountType: validatedData.discountType,
        discountValue: validatedData.discountValue,
        deliveryOrderDate,
        status: validatedData.status,
        ...(willChangeServices ? { totalAmount: nextSubtotal, finalAmount: nextFinal } : {}),
        ...(willChangeDiscount && !willChangeServices ? { finalAmount: nextFinal } : {}),
        ...(willChangeServices && validatedData.services
          ? {
              services: {
                create: validatedData.services.map((s, idx) => ({
                  serviceId: s.serviceId,
                  descriptionOverride:
                    s.descriptionOverride.trim().length > 0
                      ? s.descriptionOverride
                      : (serviceById.get(s.serviceId)?.description ?? ""),
                  price: s.price,
                  quantity: s.quantity,
                  sortOrder: s.sortOrder ?? idx,
                })),
              },
            }
          : {}),
        ...(nextAdvisorIds
          ? { advisors: { create: nextAdvisorIds.map((uid) => ({ userId: uid })) } }
          : {}),
      },
      select: { id: true },
    })
    return result
  })

  revalidateTag("delivery-orders", { expire: 0 })
  revalidatePath("/delivery-orders")
  revalidatePath(`/delivery-orders/${validatedId}`)
  return updated
}

// ==================== Delete / cancel ====================

export async function deleteDeliveryOrder(id: unknown) {
  const validatedId = deliveryOrderIdSchema.parse(id)
  const user = await getCachedUser()
  if (!user) throw new Error("User must be authenticated")

  const isAdmin = await getCachedIsUserAdmin(user.id)
  if (!isAdmin) {
    throw new Error("Only admins can delete delivery orders")
  }

  await prisma.deliveryOrder.delete({ where: { id: validatedId } })

  revalidateTag("delivery-orders", { expire: 0 })
  revalidatePath("/delivery-orders")
  return { success: true }
}

// ==================== Email send ====================

export async function sendDeliveryOrderEmail(
  deliveryOrderId: unknown,
  recipientEmail: unknown,
): Promise<{ success: boolean; error?: string }> {
  try {
    const validatedData = sendDeliveryOrderEmailSchema.parse({
      deliveryOrderId,
      recipientEmail,
    }) satisfies SendDeliveryOrderEmailValues

    const user = await getCachedUser()
    if (!user) throw new Error("User must be authenticated to send delivery order")

    const order = await getDeliveryOrderFullById(validatedData.deliveryOrderId)
    if (!order) return { success: false, error: "Delivery order not found" }

    const { generateDeliveryOrderPDFBase64FromFull } = await import("./utils/pdfExport")
    const pdfBase64 = await generateDeliveryOrderPDFBase64FromFull(order)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: "Supabase configuration missing" }
    }

    const functionUrl = `${supabaseUrl}/functions/v1/send-delivery-order`
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        deliveryOrderId: order.id,
        deliveryOrderNumber: order.deliveryOrderNumber,
        customerName: order.client?.name || "Valued Customer",
        customerEmail: validatedData.recipientEmail,
        clientCompany: order.client?.company || "",
        amount: order.finalAmount,
        pdfBase64,
        deliveryOrderDate: formatLocalDateTime(new Date(order.deliveryOrderDate)),
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      if (process.env.NODE_ENV === "development") {
        console.error("Error sending delivery order email:", text)
      }
      return { success: false, error: "Failed to send email. Please try again." }
    }

    await prisma.deliveryOrderEmail.create({
      data: {
        deliveryOrderId: order.id,
        recipientEmail: validatedData.recipientEmail,
        sentById: user.id,
      },
    })

    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error sending delivery order email:", error)
    }
    const message = error instanceof Error ? error.message : "Failed to send email"
    return { success: false, error: message }
  }
}

export async function getDeliveryOrderEmailHistory(deliveryOrderId: unknown) {
  const validatedId = deliveryOrderIdSchema.parse(deliveryOrderId)
  const emails = await prisma.deliveryOrderEmail.findMany({
    where: { deliveryOrderId: validatedId },
    include: {
      sentBy: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { sentAt: "desc" },
  })
  return emails.map((e) => ({
    id: e.id,
    recipientEmail: e.recipientEmail,
    sentAt: e.sentAt,
    sentBy: { ...e.sentBy },
  }))
}

// ==================== Misc helpers for forms ====================

export async function getClientsForSelect() {
  unstable_noStore()
  return prisma.client.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      phone: true,
      address: true,
      companyRegistrationNumber: true,
      ic: true,
    },
    orderBy: { name: "asc" },
  })
}

export async function getServicesForSelect() {
  unstable_noStore()
  return prisma.services.findMany({
    select: { id: true, name: true, description: true, basePrice: true },
    orderBy: { name: "asc" },
  })
}

export async function getStaffForSelect() {
  unstable_noStore()
  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
  return users
}

import { notFound } from "next/navigation"
import { getCachedUser } from "@/lib/auth-cache"
import { prisma } from "@/lib/prisma"
import {
  getDeliveryOrderFullById,
  getServicesForSelect,
  getStaffForSelect,
} from "../action"
import { checkIsOperationUser, checkHasFullAccess } from "../../actions/admin-actions"
import AccessDenied from "../../components/AccessDenied"
import DeliveryOrderDetailClient from "./DeliveryOrderDetailClient"

export const dynamic = "force-dynamic"

export default async function DeliveryOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCachedUser()
  if (!user) return null

  const [isOperationUser, isAdmin, dbUser] = await Promise.all([
    checkIsOperationUser(user.id),
    checkHasFullAccess(user.id),
    prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }),
  ])
  if (isOperationUser) return <AccessDenied />

  const [order, services, staff] = await Promise.all([
    getDeliveryOrderFullById(id),
    getServicesForSelect(),
    getStaffForSelect(),
  ])
  if (!order) notFound()

  return (
    <DeliveryOrderDetailClient
      order={order}
      services={services}
      staff={staff}
      currentUserId={dbUser?.id ?? user.id}
      isAdmin={isAdmin}
    />
  )
}

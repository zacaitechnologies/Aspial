import { notFound } from "next/navigation"
import { getCachedUser } from "@/lib/auth-cache"
import {
  getDeliveryOrderFullById,
  getClientsForSelect,
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

  const [isOperationUser, isAdmin] = await Promise.all([
    checkIsOperationUser(user.id),
    checkHasFullAccess(user.id),
  ])
  if (isOperationUser) return <AccessDenied />

  const [order, clients, services, staff] = await Promise.all([
    getDeliveryOrderFullById(id),
    getClientsForSelect(),
    getServicesForSelect(),
    getStaffForSelect(),
  ])
  if (!order) notFound()

  return (
    <DeliveryOrderDetailClient
      order={order}
      clients={clients}
      services={services}
      staff={staff}
      currentUserId={user.id}
      isAdmin={isAdmin}
    />
  )
}

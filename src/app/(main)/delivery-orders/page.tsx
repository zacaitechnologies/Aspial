import { getCachedUser } from "@/lib/auth-cache"
import { prisma } from "@/lib/prisma"
import {
  getDeliveryOrdersPaginated,
  getDeliveryOrderAdvisors,
  getServicesForSelect,
  getStaffForSelect,
} from "./action"
import { checkIsOperationUser, checkHasFullAccess } from "../actions/admin-actions"
import AccessDenied from "../components/AccessDenied"
import DeliveryOrdersClient from "./components/DeliveryOrdersClient"

export const dynamic = "force-dynamic"

export default async function DeliveryOrdersPage() {
  const user = await getCachedUser()
  if (!user) return null

  const [isOperationUser, isAdmin, dbUser] = await Promise.all([
    checkIsOperationUser(user.id),
    checkHasFullAccess(user.id),
    prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }),
  ])

  if (isOperationUser) return <AccessDenied />

  const [initialData, advisors, services, staff] = await Promise.all([
    getDeliveryOrdersPaginated(1, 10, {}, true),
    getDeliveryOrderAdvisors(),
    getServicesForSelect(),
    getStaffForSelect(),
  ])

  return (
    <DeliveryOrdersClient
      initialData={initialData}
      userId={dbUser?.id ?? user.id}
      isAdmin={isAdmin}
      advisors={advisors}
      services={services}
      staff={staff}
    />
  )
}

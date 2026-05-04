import { getCachedUser } from "@/lib/auth-cache"
import {
  getDeliveryOrdersPaginated,
  getDeliveryOrderAdvisors,
  getClientsForSelect,
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

  const [isOperationUser, isAdmin] = await Promise.all([
    checkIsOperationUser(user.id),
    checkHasFullAccess(user.id),
  ])

  if (isOperationUser) return <AccessDenied />

  const [initialData, advisors, clients, services, staff] = await Promise.all([
    getDeliveryOrdersPaginated(1, 10, {}, true),
    getDeliveryOrderAdvisors(),
    getClientsForSelect(),
    getServicesForSelect(),
    getStaffForSelect(),
  ])

  return (
    <DeliveryOrdersClient
      initialData={initialData}
      userId={user.id}
      isAdmin={isAdmin}
      advisors={advisors}
      clients={clients}
      services={services}
      staff={staff}
    />
  )
}

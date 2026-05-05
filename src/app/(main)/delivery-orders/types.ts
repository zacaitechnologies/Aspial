import type {
  getDeliveryOrdersPaginated,
  getDeliveryOrderFullById,
} from "./action"

export type PaginatedDeliveryOrders = Awaited<ReturnType<typeof getDeliveryOrdersPaginated>>
export type DeliveryOrderListItem = PaginatedDeliveryOrders["data"][number]
export type DeliveryOrderFull = NonNullable<Awaited<ReturnType<typeof getDeliveryOrderFullById>>>

export type StaffOption = {
  id: string
  firstName: string
  lastName: string
  email: string
}

export type ClientOption = {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  address: string | null
  companyRegistrationNumber: string | null
  ic: string | null
}

export type ServiceOption = {
  id: number
  name: string
  description: string
  basePrice: number
}

export type ServiceFormItem = {
  serviceId: number
  name: string
  baseDescription: string
  descriptionOverride: string
  price: number
  quantity: number
  expanded: boolean
}

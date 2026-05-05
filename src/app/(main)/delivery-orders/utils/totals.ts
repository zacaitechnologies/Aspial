import type { DiscountType } from "@prisma/client"

export type DeliveryOrderLineItem = {
  price: number
  quantity: number
}

export function computeLineTotal(item: DeliveryOrderLineItem): number {
  return Math.max(0, item.price) * Math.max(0, item.quantity)
}

export function computeSubtotal(items: DeliveryOrderLineItem[]): number {
  return items.reduce((sum, item) => sum + computeLineTotal(item), 0)
}

export function computeDiscountAmount(
  subtotal: number,
  discountType?: DiscountType | null,
  discountValue?: number | null,
): number {
  if (!discountValue || discountValue <= 0) return 0
  if (discountType === "percentage") {
    return Math.min(subtotal, (subtotal * discountValue) / 100)
  }
  if (discountType === "fixed") {
    return Math.min(subtotal, discountValue)
  }
  return 0
}

export function computeFinalAmount(
  subtotal: number,
  discountType?: DiscountType | null,
  discountValue?: number | null,
): number {
  const discount = computeDiscountAmount(subtotal, discountType, discountValue)
  return Math.max(0, subtotal - discount)
}

"use client"

import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/format-number"
import type { DeliveryOrderListItem } from "../types"

export default function DeliveryOrderCard({ order }: { order: DeliveryOrderListItem }) {
  const date = new Date(order.deliveryOrderDate)
  return (
    <div className="rounded-lg border bg-card p-4 hover:bg-muted/40 transition-colors">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{order.deliveryOrderNumber}</span>
            <Badge variant={order.status === "active" ? "default" : "secondary"}>
              {order.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {order.client?.company || order.client?.name || "—"}
            {order.client?.email ? ` · ${order.client.email}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            DO date {date.toLocaleDateString("en-GB")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">RM{formatNumber(order.finalAmount)}</p>
          {order.advisors.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Advisor: {order.advisors.map((a) => `${a.firstName} ${a.lastName}`).join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

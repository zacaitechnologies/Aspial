"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { formatNumber } from "@/lib/format-number"
import { getDeliveryOrdersPaginatedFresh } from "../action"
import DeliveryOrderForm from "./DeliveryOrderForm"
import DeliveryOrderCard from "./DeliveryOrderCard"
import type {
  PaginatedDeliveryOrders,
  ClientOption,
  ServiceOption,
  StaffOption,
} from "../types"

interface Props {
  initialData: PaginatedDeliveryOrders
  userId: string
  isAdmin: boolean
  advisors: StaffOption[]
  clients: ClientOption[]
  services: ServiceOption[]
  staff: StaffOption[]
}

export default function DeliveryOrdersClient({
  initialData,
  userId,
  isAdmin,
  advisors,
  clients,
  services,
  staff,
}: Props) {
  const router = useRouter()
  const [data, setData] = useState<PaginatedDeliveryOrders>(initialData)
  const [search, setSearch] = useState("")
  const [advisorFilter, setAdvisorFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled">("all")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const refresh = (overrides?: { page?: number; search?: string; advisorFilter?: string; status?: typeof statusFilter }) => {
    const nextPage = overrides?.page ?? page
    const nextSearch = overrides?.search ?? search
    const nextAdvisor = overrides?.advisorFilter ?? advisorFilter
    const nextStatus = overrides?.status ?? statusFilter

    startTransition(async () => {
      const fresh = await getDeliveryOrdersPaginatedFresh(nextPage, 10, {
        searchQuery: nextSearch.trim() || undefined,
        advisorFilter: nextAdvisor === "all" ? undefined : nextAdvisor,
        status: nextStatus === "all" ? undefined : nextStatus,
      })
      setData(fresh)
    })
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Delivery Orders</h1>
        <span className="text-sm text-muted-foreground">
          {data.total} total · RM{formatNumber(
            data.data.reduce((s, d) => s + d.finalAmount, 0)
          )}{" "}
          (page)
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Delivery Order
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by DO #, client, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1)
              refresh({ page: 1, search })
            }
          }}
          className="max-w-xs"
        />
        <Button
          variant="secondary"
          onClick={() => {
            setPage(1)
            refresh({ page: 1, search })
          }}
        >
          Search
        </Button>
        <Select
          value={advisorFilter}
          onValueChange={(v) => {
            setAdvisorFilter(v)
            setPage(1)
            refresh({ page: 1, advisorFilter: v })
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Advisor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All advisors</SelectItem>
            {advisors.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v: typeof statusFilter) => {
            setStatusFilter(v)
            setPage(1)
            refresh({ page: 1, status: v })
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {data.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
            No delivery orders yet.
          </div>
        ) : (
          data.data.map((d) => (
            <Link href={`/delivery-orders/${d.id}`} key={d.id} className="block">
              <DeliveryOrderCard order={d} />
            </Link>
          ))
        )}
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || pending}
            onClick={() => {
              const next = page - 1
              setPage(next)
              refresh({ page: next })
            }}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages || pending}
            onClick={() => {
              const next = page + 1
              setPage(next)
              refresh({ page: next })
            }}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Delivery Order</DialogTitle>
            <DialogDescription>
              Pick a client, add services, and set the DO date. The DO number is generated
              automatically.
            </DialogDescription>
          </DialogHeader>
          <DeliveryOrderForm
            mode="create"
            clients={clients}
            services={services}
            staff={staff}
            currentUserId={userId}
            isAdmin={isAdmin}
            onSuccess={(id) => {
              setCreateOpen(false)
              router.push(`/delivery-orders/${id}`)
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

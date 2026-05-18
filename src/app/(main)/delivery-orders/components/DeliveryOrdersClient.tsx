"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
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
import { Plus, FileText, Filter, Search, Calendar, Briefcase } from "lucide-react"
import { getDeliveryOrdersPaginatedFresh, getProjectsForDeliveryOrder } from "../action"
import DeliveryOrderForm from "./DeliveryOrderForm"
import DeliveryOrderCard from "./DeliveryOrderCard"
import type {
  PaginatedDeliveryOrders,
  ServiceOption,
  StaffOption,
} from "../types"
import type { DeliveryOrderListFilters } from "@/lib/validation"
import { ProjectPagination } from "../../projects/components/ProjectPagination"

const LIST_BORDER = "#BDC4A5"

interface Props {
  initialData: PaginatedDeliveryOrders
  userId: string
  isAdmin: boolean
  advisors: StaffOption[]
  services: ServiceOption[]
  staff: StaffOption[]
}

export default function DeliveryOrdersClient({
  initialData,
  userId,
  isAdmin,
  advisors,
  services,
  staff,
}: Props) {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [data, setData] = useState<PaginatedDeliveryOrders>(initialData)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(initialData.page)
  const [pageSize, setPageSizeState] = useState(initialData.pageSize)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [advisorFilter, setAdvisorFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled">("all")
  const [monthYearFilter, setMonthYearFilter] = useState<string>("all")
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [projectOptions, setProjectOptions] = useState<
    { id: number; name: string }[]
  >([])
  const [createOpen, setCreateOpen] = useState(false)

  const orders = data.data
  const total = data.total
  const totalPages = data.totalPages

  const monthYearOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: "all", label: "All months" }]
    const now = new Date()
    for (let i = 0; i < 36; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const value = `${y}-${String(m).padStart(2, "0")}`
      const label = d.toLocaleString("en-GB", { month: "long", year: "numeric" })
      options.push({ value, label })
    }
    return options
  }, [])

  const buildFilters = useCallback((): DeliveryOrderListFilters => {
    const projectIdNum =
      projectFilter !== "all" ? Number.parseInt(projectFilter, 10) : NaN
    return {
      searchQuery: searchQuery || undefined,
      advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
      projectId: Number.isFinite(projectIdNum) ? projectIdNum : undefined,
    }
  }, [searchQuery, advisorFilter, statusFilter, monthYearFilter, projectFilter])

  const fetchPage = useCallback(
    async (nextPage: number, nextSize: number, filters: DeliveryOrderListFilters) => {
      setLoading(true)
      try {
        const result = await getDeliveryOrdersPaginatedFresh(nextPage, nextSize, filters)
        setData(result)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const projects = await getProjectsForDeliveryOrder(userId)
        if (cancelled) return
        setProjectOptions(
          projects.map((p) => ({ id: p.id, name: p.name })).sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        )
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const prevSearchQueryRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!isMounted) return
    if (prevSearchQueryRef.current === undefined) {
      prevSearchQueryRef.current = searchQuery
      return
    }
    if (prevSearchQueryRef.current === searchQuery) return
    prevSearchQueryRef.current = searchQuery
    setPage(1)
    void fetchPage(1, pageSize, {
      ...buildFilters(),
      searchQuery: searchQuery || undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch list when debounced search changes; filters handled elsewhere
  }, [searchQuery, isMounted, pageSize])

  const handleStatusFilterChange = useCallback(
    async (value: string) => {
      const nextStatus: "all" | "active" | "cancelled" =
        value === "active" || value === "cancelled" ? value : "all"
      setStatusFilter(nextStatus)
      setPage(1)
      setLoading(true)
      try {
        const projectIdNum =
          projectFilter !== "all" ? Number.parseInt(projectFilter, 10) : NaN
        const result = await getDeliveryOrdersPaginatedFresh(1, pageSize, {
          searchQuery: searchQuery || undefined,
          advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
          status: nextStatus === "all" ? undefined : nextStatus,
          monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
          projectId: Number.isFinite(projectIdNum) ? projectIdNum : undefined,
        })
        setData(result)
      } finally {
        setLoading(false)
      }
    },
    [pageSize, searchQuery, advisorFilter, monthYearFilter, projectFilter],
  )

  const handleAdvisorFilterChange = useCallback(
    async (value: string) => {
      setAdvisorFilter(value)
      setPage(1)
      setLoading(true)
      try {
        const projectIdNum =
          projectFilter !== "all" ? Number.parseInt(projectFilter, 10) : NaN
        const result = await getDeliveryOrdersPaginatedFresh(1, pageSize, {
          searchQuery: searchQuery || undefined,
          advisorFilter: value !== "all" ? value : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
          projectId: Number.isFinite(projectIdNum) ? projectIdNum : undefined,
        })
        setData(result)
      } finally {
        setLoading(false)
      }
    },
    [pageSize, searchQuery, statusFilter, monthYearFilter, projectFilter],
  )

  const handleMonthYearFilterChange = useCallback(
    async (value: string) => {
      setMonthYearFilter(value)
      setPage(1)
      setLoading(true)
      try {
        const projectIdNum =
          projectFilter !== "all" ? Number.parseInt(projectFilter, 10) : NaN
        const result = await getDeliveryOrdersPaginatedFresh(1, pageSize, {
          searchQuery: searchQuery || undefined,
          advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          monthYear: value !== "all" ? value : undefined,
          projectId: Number.isFinite(projectIdNum) ? projectIdNum : undefined,
        })
        setData(result)
      } finally {
        setLoading(false)
      }
    },
    [pageSize, searchQuery, advisorFilter, statusFilter, projectFilter],
  )

  const handleProjectFilterChange = useCallback(
    async (value: string) => {
      setProjectFilter(value)
      setPage(1)
      setLoading(true)
      try {
        const projectIdNum = value !== "all" ? Number.parseInt(value, 10) : NaN
        const result = await getDeliveryOrdersPaginatedFresh(1, pageSize, {
          searchQuery: searchQuery || undefined,
          advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
          projectId: Number.isFinite(projectIdNum) ? projectIdNum : undefined,
        })
        setData(result)
      } finally {
        setLoading(false)
      }
    },
    [pageSize, searchQuery, advisorFilter, statusFilter, monthYearFilter],
  )

  const goToPage = useCallback(
    async (newPage: number) => {
      setPage(newPage)
      await fetchPage(newPage, pageSize, buildFilters())
    },
    [fetchPage, pageSize, buildFilters],
  )

  const setPageSize = useCallback(
    async (size: number) => {
      setPageSizeState(size)
      setPage(1)
      setLoading(true)
      try {
        const result = await getDeliveryOrdersPaginatedFresh(1, size, buildFilters())
        setData(result)
      } finally {
        setLoading(false)
      }
    },
    [buildFilters],
  )

  const hasActiveFilters =
    statusFilter !== "all" ||
    advisorFilter !== "all" ||
    monthYearFilter !== "all" ||
    projectFilter !== "all"

  const clearNonSearchFilters = useCallback(async () => {
    setStatusFilter("all")
    setAdvisorFilter("all")
    setMonthYearFilter("all")
    setProjectFilter("all")
    setPage(1)
    setLoading(true)
    try {
      const result = await getDeliveryOrdersPaginatedFresh(1, pageSize, {
        searchQuery: searchQuery || undefined,
      })
      setData(result)
    } finally {
      setLoading(false)
    }
  }, [pageSize, searchQuery])

  const refreshList = useCallback(() => {
    void fetchPage(page, pageSize, buildFilters())
  }, [fetchPage, page, pageSize, buildFilters])

  return (
    <>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Delivery Orders Management</h1>
            <p className="text-muted-foreground">
              Create and manage delivery orders. Export PDFs and email clients from the detail page.
            </p>
          </div>

          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Create Delivery Order
          </Button>
        </div>

        {isMounted && (
          <div className="mb-6 flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search delivery orders, client…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full border-2 bg-white pl-9"
                style={{ borderColor: LIST_BORDER }}
                aria-label="Search delivery orders"
              />
            </div>
            <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
              <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="shrink-0 text-sm font-medium">Filters</span>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger
                  className="h-9 w-[min(12rem,100%)] shrink-0 border-2 bg-white sm:w-48"
                  style={{ borderColor: LIST_BORDER }}
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {advisors.length > 0 && (
                <Select value={advisorFilter} onValueChange={handleAdvisorFilterChange}>
                  <SelectTrigger
                    className="h-9 w-[min(12rem,100%)] shrink-0 border-2 bg-white sm:w-48"
                    style={{ borderColor: LIST_BORDER }}
                  >
                    <SelectValue placeholder="All advisors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All advisors</SelectItem>
                    {advisors.map((advisor) => (
                      <SelectItem key={advisor.id} value={advisor.id}>
                        {advisor.firstName} {advisor.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {projectOptions.length > 0 && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <Select value={projectFilter} onValueChange={handleProjectFilterChange}>
                    <SelectTrigger
                      className="h-9 w-[min(14rem,100%)] shrink-0 border-2 bg-white sm:w-56"
                      style={{ borderColor: LIST_BORDER }}
                    >
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">All projects</SelectItem>
                      {projectOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex shrink-0 items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
                <Select value={monthYearFilter} onValueChange={handleMonthYearFilterChange}>
                  <SelectTrigger
                    className="h-9 w-[min(12.5rem,85vw)] border-2 bg-white sm:w-[200px]"
                    style={{ borderColor: LIST_BORDER }}
                  >
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {monthYearOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void clearNonSearchFilters()}
                  className="shrink-0 border-2 bg-white"
                  style={{ borderColor: LIST_BORDER }}
                >
                  Clear Filters
                </Button>
              )}
              <span className="ml-auto shrink-0 pl-2 text-sm whitespace-nowrap text-muted-foreground">
                Showing {orders.length} of {total} delivery orders
              </span>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="space-y-2">
            {orders.map((order) => (
              <DeliveryOrderCard
                key={order.id}
                order={order}
                services={services}
                staff={staff}
                currentUserId={userId}
                isAdmin={isAdmin}
                onRefresh={refreshList}
              />
            ))}
          </div>

          {loading && orders.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                <span>Loading...</span>
              </div>
            </div>
          )}

          {loading && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-primary">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <p className="text-lg font-medium">Loading delivery orders…</p>
            </div>
          )}
        </div>

        {!loading && orders.length === 0 && total === 0 && !hasActiveFilters && !searchQuery && (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No delivery orders available.</p>
          </div>
        )}

        {!loading && orders.length === 0 && hasActiveFilters && (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No delivery orders match the selected filters.</p>
            <Button variant="outline" className="mt-4" onClick={() => void clearNonSearchFilters()}>
              Clear Filters
            </Button>
          </div>
        )}

        {!loading && orders.length === 0 && !hasActiveFilters && searchQuery && (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No delivery orders match your search.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchInput("")
                setSearchQuery("")
              }}
            >
              Clear Search
            </Button>
          </div>
        )}

        <ProjectPagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
          itemLabel="delivery orders"
        />

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="w-[85vw]! max-w-[85vw]! sm:max-w-[85vw]! max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Delivery Order</DialogTitle>
              <DialogDescription>
                Pick a client, add services, and set the DO date. The DO number is generated
                automatically.
              </DialogDescription>
            </DialogHeader>
            <DeliveryOrderForm
              mode="create"
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
    </>
  )
}

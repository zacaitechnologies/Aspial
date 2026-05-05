"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  User,
  MoreVertical,
  Eye,
  Download,
  Loader2,
  Send,
  History,
  Pencil,
  Ban,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { formatNumber } from "@/lib/format-number"
import { toast } from "@/components/ui/use-toast"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import type { DeliveryOrderListItem, DeliveryOrderFull, ServiceOption, StaffOption } from "../types"
import {
  deleteDeliveryOrder,
  getDeliveryOrderFullById,
  getDeliveryOrderEmailHistory,
  updateDeliveryOrder,
} from "../action"
import SendDeliveryOrderDialog from "./SendDeliveryOrderDialog"
import DeliveryOrderForm from "./DeliveryOrderForm"

interface DeliveryOrderCardProps {
  order: DeliveryOrderListItem
  services: ServiceOption[]
  staff: StaffOption[]
  currentUserId: string
  isAdmin: boolean
  onRefresh?: () => void
}

export default function DeliveryOrderCard({
  order,
  services,
  staff,
  currentUserId,
  isAdmin,
  onRefresh,
}: DeliveryOrderCardProps) {
  const router = useRouter()
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [emailHistory, setEmailHistory] = useState<
    Awaited<ReturnType<typeof getDeliveryOrderEmailHistory>> | null
  >(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editOrder, setEditOrder] = useState<DeliveryOrderFull | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const isActive = order.status === "active"
  const isCancelled = order.status === "cancelled"
  const grandTotal = order.finalAmount
  const date = new Date(order.deliveryOrderDate)

  const handleRefresh = useCallback(() => {
    onRefresh?.()
    router.refresh()
  }, [onRefresh, router])

  const handleExportPdf = useCallback(async () => {
    setIsExportingPDF(true)
    try {
      const { generateDeliveryOrderPDFWithFetch } = await import("../utils/pdfExport")
      await generateDeliveryOrderPDFWithFetch(order.id)
      toast({ title: "Success", description: "PDF exported successfully." })
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("Error exporting PDF:", error)
      }
      toast({
        title: "Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExportingPDF(false)
    }
  }, [order.id])

  const openEmailHistory = useCallback(async () => {
    try {
      const history = await getDeliveryOrderEmailHistory(order.id)
      setEmailHistory(history)
      setHistoryOpen(true)
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("Error loading email history:", error)
      }
      toast({
        title: "Error",
        description: "Could not load email history.",
        variant: "destructive",
      })
    }
  }, [order.id])

  const openEdit = useCallback(async () => {
    setEditLoading(true)
    try {
      const full = await getDeliveryOrderFullById(order.id)
      if (!full) {
        toast({
          variant: "destructive",
          title: "Not found",
          description: "Could not load this delivery order.",
        })
        return
      }
      setEditOrder(full)
      setEditOpen(true)
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("Error loading delivery order:", error)
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load delivery order for editing.",
      })
    } finally {
      setEditLoading(false)
    }
  }, [order.id])

  const handleToggleStatus = useCallback(async () => {
    setStatusBusy(true)
    try {
      await updateDeliveryOrder(order.id, {
        status: isCancelled ? "active" : "cancelled",
      })
      toast({ title: isCancelled ? "Reactivated" : "Cancelled" })
      handleRefresh()
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: e instanceof Error ? e.message : "Could not update status.",
      })
    } finally {
      setStatusBusy(false)
    }
  }, [order.id, isCancelled, handleRefresh])

  const handleDelete = useCallback(async () => {
    setDeleteBusy(true)
    try {
      await deleteDeliveryOrder(order.id)
      toast({ title: "Delivery order deleted" })
      setConfirmDeleteOpen(false)
      handleRefresh()
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Could not delete.",
      })
    } finally {
      setDeleteBusy(false)
    }
  }, [order.id, handleRefresh])

  return (
    <Card
      className="hover:shadow-md transition-shadow duration-200 border-l-2 pt-0 pb-0"
      style={{ borderLeftColor: isActive ? "#10b981" : "#64748b" }}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle
                className={`text-base font-semibold truncate ${isActive ? "text-gray-700" : "text-gray-900"}`}
                title={order.deliveryOrderNumber}
              >
                {order.deliveryOrderNumber}
              </CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant={isActive ? "default" : "secondary"}>
                  {order.status === "active" ? "Active" : "Cancelled"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
              {order.client && (
                <>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="font-medium text-gray-900">
                      {order.client.company || order.client.name}
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                </>
              )}
              {order.discountValue != null &&
                order.discountValue > 0 &&
                order.discountType != null && (
                  <>
                    <span>
                      Disc:{" "}
                      <span className="font-medium">
                        {order.discountType === "percentage"
                          ? `${order.discountValue}%`
                          : `RM${formatNumber(order.discountValue)}`}
                      </span>
                    </span>
                    <span className="text-gray-400">•</span>
                  </>
                )}
              <span>
                {date.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {order.advisors.length > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>
                    Advisors:{" "}
                    {order.advisors.map((a) => `${a.firstName} ${a.lastName}`).join(", ")}
                  </span>
                </>
              )}
              {order.photographers.length > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>
                    Photo:{" "}
                    {order.photographers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
                  </span>
                </>
              )}
            </div>
          </div>

          <div
            className="flex items-center gap-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="text-right">
              <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded px-3 py-1.5 border border-blue-200">
                <p className="text-[10px] text-gray-600 mb-0.5">Total</p>
                <p className="text-lg font-bold text-blue-700">RM{formatNumber(grandTotal)}</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    router.push(`/delivery-orders/${order.id}`)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View delivery order
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setSendOpen(true)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    void openEmailHistory()
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                >
                  <History className="w-4 h-4 mr-2" />
                  Email History
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    void handleExportPdf()
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                  disabled={isExportingPDF}
                >
                  {isExportingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export as PDF
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    void openEdit()
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    void handleToggleStatus()
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                  disabled={statusBusy}
                >
                  {statusBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating…
                    </>
                  ) : isCancelled ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reactivate
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  )}
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setConfirmDeleteOpen(true)
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>

      <SendDeliveryOrderDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        deliveryOrderId={order.id}
        defaultEmail={order.client?.email}
        onSent={handleRefresh}
      />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email history</DialogTitle>
            <DialogDescription>Emails sent for this delivery order</DialogDescription>
          </DialogHeader>
          {!emailHistory || emailHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No emails sent yet.</p>
          ) : (
            <ul className="space-y-2 text-sm max-h-80 overflow-y-auto">
              {emailHistory.map((entry) => (
                <li key={entry.id} className="rounded-lg border p-3">
                  <p className="font-medium">{entry.recipientEmail}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent {new Date(entry.sentAt).toLocaleString("en-GB")} by{" "}
                    {entry.sentBy.firstName} {entry.sentBy.lastName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditOrder(null)
        }}
      >
        <DialogContent className="w-[85vw]! max-w-[85vw]! sm:max-w-[85vw]! max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Delivery Order</DialogTitle>
            <DialogDescription>
              Service descriptions edited here only affect this DO.
            </DialogDescription>
          </DialogHeader>
          {editOrder && (
            <DeliveryOrderForm
              mode="edit"
              initial={editOrder}
              services={services}
              staff={staff}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onSuccess={() => {
                setEditOpen(false)
                setEditOrder(null)
                handleRefresh()
              }}
              onCancel={() => {
                setEditOpen(false)
                setEditOrder(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
        title="Delete delivery order?"
        description={`This permanently removes ${order.deliveryOrderNumber}. This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteBusy}
      />
    </Card>
  )
}

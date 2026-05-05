"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Download,
  Mail,
  Pencil,
  Trash2,
  Ban,
  RotateCcw,
  User,
  Building2,
  Package,
  DollarSign,
  Calendar,
  Loader2,
  Send,
  History,
  Phone,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { formatNumber } from "@/lib/format-number"
import { FormattedDescription } from "@/components/FormattedDescription"
import {
  deleteDeliveryOrder,
  updateDeliveryOrder,
  getDeliveryOrderEmailHistory,
} from "../action"
import DeliveryOrderForm from "../components/DeliveryOrderForm"
import SendDeliveryOrderDialog from "../components/SendDeliveryOrderDialog"
import type {
  DeliveryOrderFull,
  ServiceOption,
  StaffOption,
} from "../types"

interface Props {
  order: DeliveryOrderFull
  services: ServiceOption[]
  staff: StaffOption[]
  currentUserId: string
  isAdmin: boolean
}

export default function DeliveryOrderDetailClient({
  order,
  services,
  staff,
  currentUserId,
  isAdmin,
}: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [emailHistory, setEmailHistory] = useState<
    Awaited<ReturnType<typeof getDeliveryOrderEmailHistory>> | null
  >(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  const isCancelled = order.status === "cancelled"

  const subtotal = order.totalAmount
  const finalAmount = order.finalAmount
  const hasDiscount =
    order.discountValue != null && order.discountValue > 0 && order.discountType != null

  const handleDownload = async () => {
    setIsExportingPDF(true)
    try {
      const { generateDeliveryOrderPDFWithFetch } = await import("../utils/pdfExport")
      await generateDeliveryOrderPDFWithFetch(order.id)
      toast({
        title: "Success",
        description: "PDF exported successfully.",
      })
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: e instanceof Error ? e.message : "Could not generate PDF",
      })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteDeliveryOrder(order.id)
      toast({ title: "Delivery order deleted" })
      router.push("/delivery-orders")
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Could not delete",
      })
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  const handleToggleStatus = async () => {
    setBusy(true)
    try {
      await updateDeliveryOrder(order.id, {
        status: isCancelled ? "active" : "cancelled",
      })
      toast({ title: isCancelled ? "Reactivated" : "Cancelled" })
      router.refresh()
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: e instanceof Error ? e.message : "Could not update",
      })
    } finally {
      setBusy(false)
    }
  }

  const openEmailHistory = async () => {
    const history = await getDeliveryOrderEmailHistory(order.id)
    setEmailHistory(history)
    setHistoryOpen(true)
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push("/delivery-orders")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Delivery Orders
        </Button>
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{order.deliveryOrderNumber}</h1>
              <Badge variant={isCancelled ? "secondary" : "default"}>
                {order.status === "active" ? "Active" : "Cancelled"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2">
              Delivery order for{" "}
              {order.client?.company || order.client?.name || "client"}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setSendOpen(true)}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Email
            </Button>
            <Button
              variant="outline"
              onClick={() => void openEmailHistory()}
              className="flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Email History
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleDownload()}
              className="flex items-center gap-2"
              disabled={isExportingPDF}
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleToggleStatus()}
              disabled={busy}
              className="flex items-center gap-2"
            >
              {isCancelled ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              {isCancelled ? "Reactivate" : "Cancel"}
            </Button>
            {isAdmin && (
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {order.client && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="font-medium">{order.client.name}</p>
                  </div>
                  {order.client.company && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p className="font-medium flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {order.client.company}
                      </p>
                    </div>
                  )}
                  {order.client.companyRegistrationNumber && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Registration No.</p>
                      <p className="font-medium">{order.client.companyRegistrationNumber}</p>
                    </div>
                  )}
                  {order.client.email && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {order.client.email}
                      </p>
                    </div>
                  )}
                  {order.client.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {order.client.phone}
                      </p>
                    </div>
                  )}
                </div>
                {order.client.address && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="font-medium whitespace-pre-line">{order.client.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {order.services && order.services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Services
                </CardTitle>
                <CardDescription>Line items on this delivery order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.services.map((s) => (
                    <div
                      key={s.id}
                      className="flex justify-between items-start p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{s.service.name}</p>
                        <FormattedDescription
                          text={s.descriptionOverride}
                          className="text-sm text-muted-foreground"
                        />
                      </div>
                      <div className="ml-4 text-right shrink-0">
                        <div className="text-xs text-muted-foreground">
                          RM{formatNumber(s.price)} × {s.quantity}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          RM{formatNumber(s.price * s.quantity)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Internal notes</CardTitle>
                <CardDescription>Not shown on the PDF</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Delivery Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">RM{formatNumber(subtotal)}</span>
              </div>
              {hasDiscount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-semibold">
                    {order.discountType === "percentage"
                      ? `${order.discountValue}%`
                      : `RM${formatNumber(order.discountValue ?? 0)}`}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-blue-800">Total:</p>
                </div>
                <span className="text-2xl font-bold text-blue-800">
                  RM{formatNumber(finalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">DO date</p>
                <p className="font-medium">
                  {new Date(order.deliveryOrderDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Record created</p>
                <p className="font-medium">
                  {new Date(order.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created by</p>
                <p className="font-medium">
                  {order.createdBy.firstName} {order.createdBy.lastName}
                </p>
              </div>
              {order.advisors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Advisors</p>
                  <p className="font-medium">
                    {order.advisors.map((a) => `${a.firstName} ${a.lastName}`).join(", ")}
                  </p>
                </div>
              )}
              {order.photographers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Photographers</p>
                  <p className="font-medium">
                    {order.photographers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[85vw]! max-w-[85vw]! sm:max-w-[85vw]! max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Delivery Order</DialogTitle>
            <DialogDescription>
              Service descriptions edited here only affect this DO.
            </DialogDescription>
          </DialogHeader>
          <DeliveryOrderForm
            mode="edit"
            initial={order}
            services={services}
            staff={staff}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onSuccess={() => {
              setEditOpen(false)
              router.refresh()
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <SendDeliveryOrderDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        deliveryOrderId={order.id}
        defaultEmail={order.client?.email}
        onSent={() => router.refresh()}
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
              {emailHistory.map((e) => (
                <li key={e.id} className="rounded-lg border p-3">
                  <p className="font-medium">{e.recipientEmail}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent {new Date(e.sentAt).toLocaleString("en-GB")} by {e.sentBy.firstName}{" "}
                    {e.sentBy.lastName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete delivery order?</DialogTitle>
            <DialogDescription>
              This permanently removes {order.deliveryOrderNumber}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={busy}>
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

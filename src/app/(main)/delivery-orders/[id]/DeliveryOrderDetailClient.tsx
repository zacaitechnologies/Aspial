"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { formatNumber } from "@/lib/format-number"
import {
  deleteDeliveryOrder,
  updateDeliveryOrder,
  getDeliveryOrderEmailHistory,
} from "../action"
import DeliveryOrderForm from "../components/DeliveryOrderForm"
import SendDeliveryOrderDialog from "../components/SendDeliveryOrderDialog"
import type {
  ClientOption,
  DeliveryOrderFull,
  ServiceOption,
  StaffOption,
} from "../types"

interface Props {
  order: DeliveryOrderFull
  clients: ClientOption[]
  services: ServiceOption[]
  staff: StaffOption[]
  currentUserId: string
  isAdmin: boolean
}

export default function DeliveryOrderDetailClient({
  order,
  clients,
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

  const isCancelled = order.status === "cancelled"

  const handleDownload = async () => {
    setBusy(true)
    try {
      const { generateDeliveryOrderPDFWithFetch } = await import("../utils/pdfExport")
      await generateDeliveryOrderPDFWithFetch(order.id)
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: e instanceof Error ? e.message : "Could not generate PDF",
      })
    } finally {
      setBusy(false)
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

  const subtotal = order.totalAmount
  const finalAmount = order.finalAmount
  const discount = Math.max(0, subtotal - finalAmount)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/delivery-orders">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{order.deliveryOrderNumber}</h1>
        <Badge variant={isCancelled ? "secondary" : "default"}>{order.status}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={busy} className="gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
          <Button variant="outline" onClick={() => setSendOpen(true)} className="gap-2">
            <Mail className="w-4 h-4" /> Send email
          </Button>
          <Button variant="outline" onClick={openEmailHistory}>
            History
          </Button>
          <Button onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleToggleStatus}
            disabled={busy}
            className="gap-2"
          >
            {isCancelled ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            {isCancelled ? "Reactivate" : "Cancel"}
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground">Client</h3>
          <p className="font-semibold">
            {order.client?.company || order.client?.name}
          </p>
          {order.client?.companyRegistrationNumber && (
            <p className="text-sm">{order.client.companyRegistrationNumber}</p>
          )}
          {order.client?.address && (
            <p className="text-sm whitespace-pre-line">{order.client.address}</p>
          )}
          {order.client?.name && (
            <p className="text-sm">ATTN TO: {order.client.name}</p>
          )}
          {order.client?.phone && <p className="text-sm">TEL: {order.client.phone}</p>}
          {order.client?.email && <p className="text-sm">EMAIL: {order.client.email}</p>}
        </div>

        <div className="rounded-lg border p-4 space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
          <p>
            <span className="text-sm text-muted-foreground">DO Date:</span>{" "}
            {new Date(order.deliveryOrderDate).toLocaleDateString("en-GB")}
          </p>
          <p>
            <span className="text-sm text-muted-foreground">Created:</span>{" "}
            {new Date(order.created_at).toLocaleString("en-GB")}
          </p>
          <p>
            <span className="text-sm text-muted-foreground">Advisor:</span>{" "}
            {order.advisors.map((a) => `${a.firstName} ${a.lastName}`).join(", ") || "—"}
          </p>
          <p>
            <span className="text-sm text-muted-foreground">Photographer:</span>{" "}
            {order.photographers.map((p) => `${p.firstName} ${p.lastName}`).join(", ") || "—"}
          </p>
          <p>
            <span className="text-sm text-muted-foreground">Total:</span>{" "}
            <span className="font-semibold">RM{formatNumber(finalAmount)}</span>
            {discount > 0 && (
              <span className="text-sm text-muted-foreground">
                {" "}
                (subtotal RM{formatNumber(subtotal)}, discount RM{formatNumber(discount)})
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 w-12">No</th>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3 w-24">Package</th>
              <th className="text-right p-3 w-32">Price/Package</th>
              <th className="text-right p-3 w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.services.map((s, idx) => (
              <tr key={s.id} className="border-t align-top">
                <td className="p-3">{idx + 1}</td>
                <td className="p-3">
                  <p className="font-semibold">{s.service.name}</p>
                  <pre className="font-sans text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                    {s.descriptionOverride}
                  </pre>
                </td>
                <td className="p-3 text-right">{formatNumber(s.quantity)}</td>
                <td className="p-3 text-right">{formatNumber(s.price)}</td>
                <td className="p-3 text-right">{formatNumber(s.price * s.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.notes && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Internal notes</h3>
          <p className="text-sm whitespace-pre-line">{order.notes}</p>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Delivery Order</DialogTitle>
            <DialogDescription>
              Service descriptions edited here only affect this DO.
            </DialogDescription>
          </DialogHeader>
          <DeliveryOrderForm
            mode="edit"
            initial={order}
            clients={clients}
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
          </DialogHeader>
          {!emailHistory || emailHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emails sent yet.</p>
          ) : (
            <ul className="space-y-2 text-sm max-h-80 overflow-y-auto">
              {emailHistory.map((e) => (
                <li key={e.id} className="rounded-md border p-3">
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
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

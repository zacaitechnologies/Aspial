"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelectAdvisors } from "@/components/ui/multi-select-advisors"
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { formatNumber } from "@/lib/format-number"
import {
  createDeliveryOrder,
  updateDeliveryOrder,
} from "../action"
import type {
  ClientOption,
  ServiceOption,
  StaffOption,
  ServiceFormItem,
  DeliveryOrderFull,
} from "../types"
import { computeFinalAmount, computeSubtotal } from "../utils/totals"

type Mode = "create" | "edit"

interface DeliveryOrderFormProps {
  mode: Mode
  initial?: DeliveryOrderFull
  clients: ClientOption[]
  services: ServiceOption[]
  staff: StaffOption[]
  currentUserId: string
  isAdmin: boolean
  onSuccess: (id: string) => void
  onCancel: () => void
}

export default function DeliveryOrderForm({
  mode,
  initial,
  clients,
  services,
  staff,
  currentUserId,
  isAdmin,
  onSuccess,
  onCancel,
}: DeliveryOrderFormProps) {
  const [clientId, setClientId] = useState<string>(initial?.clientId ?? "")
  const [deliveryOrderDate, setDeliveryOrderDate] = useState<string>(() => {
    if (initial?.deliveryOrderDate) {
      return new Date(initial.deliveryOrderDate).toISOString().slice(0, 10)
    }
    return new Date().toISOString().slice(0, 10)
  })
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">(
    initial?.discountType ?? "none",
  )
  const [discountValue, setDiscountValue] = useState<number>(initial?.discountValue ?? 0)
  const [notes, setNotes] = useState<string>(initial?.notes ?? "")

  const initialItems: ServiceFormItem[] = useMemo(() => {
    if (!initial) return []
    return initial.services.map((s) => ({
      serviceId: s.serviceId,
      name: s.service.name,
      baseDescription: s.service.description,
      descriptionOverride: s.descriptionOverride,
      price: s.price,
      quantity: s.quantity,
      expanded: false,
    }))
  }, [initial])

  const [items, setItems] = useState<ServiceFormItem[]>(initialItems)
  const [serviceSearch, setServiceSearch] = useState("")

  const [advisorIds, setAdvisorIds] = useState<string[]>(
    initial?.advisors.map((a) => a.id) ??
      (isAdmin ? [] : [currentUserId]),
  )
  const [photographerIds, setPhotographerIds] = useState<string[]>(
    initial?.photographers.map((p) => p.id) ?? [],
  )

  const [submitting, setSubmitting] = useState(false)

  const subtotal = computeSubtotal(items)
  const finalAmount = computeFinalAmount(
    subtotal,
    discountType === "none" ? null : discountType,
    discountValue,
  )

  const addService = (serviceId: number) => {
    if (items.some((i) => i.serviceId === serviceId)) return
    const svc = services.find((s) => s.id === serviceId)
    if (!svc) return
    setItems([
      ...items,
      {
        serviceId,
        name: svc.name,
        baseDescription: svc.description,
        descriptionOverride: svc.description,
        price: svc.basePrice,
        quantity: 1,
        expanded: false,
      },
    ])
  }

  const removeService = (serviceId: number) =>
    setItems(items.filter((i) => i.serviceId !== serviceId))

  const updateItem = (serviceId: number, patch: Partial<ServiceFormItem>) =>
    setItems(items.map((i) => (i.serviceId === serviceId ? { ...i, ...patch } : i)))

  const handleSubmit = async () => {
    if (!clientId) {
      toast({ variant: "destructive", title: "Client required", description: "Please select a client." })
      return
    }
    if (items.length === 0) {
      toast({ variant: "destructive", title: "Services required", description: "Add at least one service." })
      return
    }
    if (advisorIds.length === 0) {
      toast({ variant: "destructive", title: "Advisor required", description: "Select at least one advisor." })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        clientId,
        deliveryOrderDate,
        discountType: discountType === "none" ? undefined : discountType,
        discountValue: discountType === "none" || !discountValue ? undefined : discountValue,
        notes: notes.trim() ? notes.trim() : undefined,
        services: items.map((i, idx) => ({
          serviceId: i.serviceId,
          descriptionOverride: i.descriptionOverride,
          price: i.price,
          quantity: i.quantity,
          sortOrder: idx,
        })),
        advisorIds,
        photographerIds,
      }

      if (mode === "create") {
        const created = await createDeliveryOrder(payload)
        toast({ title: "Delivery order created", description: created.deliveryOrderNumber })
        onSuccess(created.id)
      } else if (initial) {
        await updateDeliveryOrder(initial.id, payload)
        toast({ title: "Delivery order updated" })
        onSuccess(initial.id)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save delivery order"
      toast({ variant: "destructive", title: "Save failed", description: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="do-client">Client *</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger id="do-client">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.company ? `${c.company} — ${c.name}` : c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="do-date">DO Date *</Label>
          <Input
            id="do-date"
            type="date"
            value={deliveryOrderDate}
            onChange={(e) => setDeliveryOrderDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Date shown on the printed DO.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Advisors *</Label>
        <MultiSelectAdvisors
          users={staff}
          selectedIds={advisorIds}
          onChange={setAdvisorIds}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          placeholder="Select advisors"
        />
      </div>

      <div className="space-y-2">
        <Label>Photographer (optional)</Label>
        <MultiSelectAdvisors
          users={staff}
          selectedIds={photographerIds}
          onChange={setPhotographerIds}
          currentUserId={currentUserId}
          isAdmin={true}
          placeholder="Select photographer(s)"
        />
      </div>

      <div className="space-y-3">
        <Label>Services *</Label>
        <div className="space-y-1">
          <Input
            placeholder="Search service..."
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2 bg-background">
            {services
              .filter(
                (s) =>
                  !items.some((i) => i.serviceId === s.id) &&
                  (!serviceSearch.trim() ||
                    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                    s.description.toLowerCase().includes(serviceSearch.toLowerCase())),
              )
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                  onClick={() => {
                    addService(s.id)
                    setServiceSearch("")
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      RM{formatNumber(s.basePrice)}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="ghost">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            {services.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No services available
              </p>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1">
              <span className="col-span-1"></span>
              <span className="col-span-4">Service</span>
              <span className="col-span-2">Price (RM)</span>
              <span className="col-span-2">Qty</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1"></span>
            </div>
            {items.map((it) => (
              <div key={it.serviceId} className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-2 items-center p-2">
                  <div className="col-span-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateItem(it.serviceId, { expanded: !it.expanded })
                      }
                      className="h-8 w-8 p-0"
                      aria-label={it.expanded ? "Collapse description" : "Expand description"}
                    >
                      {it.expanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="col-span-4">
                    <p className="font-medium text-sm">{it.name}</p>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.price}
                      onChange={(e) =>
                        updateItem(it.serviceId, { price: parseFloat(e.target.value) || 0 })
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(it.serviceId, {
                          quantity: parseInt(e.target.value) || 1,
                        })
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium">
                    RM{formatNumber(it.price * it.quantity)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeService(it.serviceId)}
                      className="h-8 w-8 p-0 text-destructive"
                      aria-label="Remove service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {it.expanded && (
                  <div className="border-t bg-muted/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs">
                        Description (this DO only — won&apos;t change the catalog)
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() =>
                          updateItem(it.serviceId, {
                            descriptionOverride: it.baseDescription,
                          })
                        }
                      >
                        Reset to default
                      </Button>
                    </div>
                    <Textarea
                      value={it.descriptionOverride}
                      onChange={(e) =>
                        updateItem(it.serviceId, { descriptionOverride: e.target.value })
                      }
                      rows={4}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use new lines and dashes (e.g.{" "}
                      <code className="font-mono">- STUDIO SHOOTING</code>) to format the bullet
                      list shown on the PDF.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="do-discount-type">Discount type</Label>
          <Select
            value={discountType}
            onValueChange={(v: "none" | "percentage" | "fixed") => setDiscountType(v)}
          >
            <SelectTrigger id="do-discount-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No discount</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="do-discount-value">Discount value</Label>
          <Input
            id="do-discount-value"
            type="number"
            min="0"
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            disabled={discountType === "none"}
            onWheel={(e) => e.currentTarget.blur()}
          />
        </div>
        <div className="space-y-2">
          <Label>Total</Label>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span>Subtotal RM{formatNumber(subtotal)}</span>
            <span className="font-semibold">RM{formatNumber(finalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="do-notes">Internal notes (not on PDF)</Label>
        <Textarea
          id="do-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
        <Badge variant="outline" className="mr-auto">
          {items.length} service{items.length === 1 ? "" : "s"}
        </Badge>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting
            ? "Saving..."
            : mode === "create"
              ? "Create Delivery Order"
              : "Save changes"}
        </Button>
      </div>
    </div>
  )
}

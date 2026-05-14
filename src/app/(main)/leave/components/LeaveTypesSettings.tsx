"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pencil, Plus, Lock, Power, RotateCcw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createLeaveType, updateLeaveType } from "../action"
import type { LeaveTypeDTO } from "../types"

type LeaveTypeRow = LeaveTypeDTO & { _count: { applications: number; balances: number } }

interface LeaveTypesSettingsProps {
  types: LeaveTypeRow[]
  onSuccess?: () => void
}

interface DraftType {
  id?: number
  code: string
  name: string
  defaultEntitlement: string
  isUnpaid: boolean
  requiresReplacementDate: boolean
  requiresAttachment: boolean
  isActive: boolean
  isDeletable: boolean
}

const emptyDraft: DraftType = {
  code: "",
  name: "",
  defaultEntitlement: "0",
  isUnpaid: false,
  requiresReplacementDate: false,
  requiresAttachment: false,
  isActive: true,
  isDeletable: true,
}

export default function LeaveTypesSettings({ types, onSuccess }: LeaveTypesSettingsProps) {
  const [draft, setDraft] = useState<DraftType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const isEdit = draft?.id !== undefined

  const openCreate = () => setDraft({ ...emptyDraft })
  const openEdit = (t: LeaveTypeRow) =>
    setDraft({
      id: t.id,
      code: t.code,
      name: t.name,
      defaultEntitlement: String(t.defaultEntitlement),
      isUnpaid: t.isUnpaid,
      requiresReplacementDate: t.requiresReplacementDate,
      requiresAttachment: t.requiresAttachment,
      isActive: t.isActive,
      isDeletable: t.isDeletable,
    })

  const closeDraft = () => {
    setDraft(null)
  }

  async function handleSave() {
    if (!draft) return
    const days = parseFloat(draft.defaultEntitlement || "0")
    if (Number.isNaN(days) || days < 0) {
      toast({
        title: "Invalid value",
        description: "Default entitlement must be 0 or more.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      if (isEdit) {
        await updateLeaveType({
          id: draft.id!,
          name: draft.name,
          defaultEntitlement: days,
          isUnpaid: draft.isUnpaid,
          requiresReplacementDate: draft.requiresReplacementDate,
          requiresAttachment: draft.requiresAttachment,
          isActive: draft.isActive,
        })
        toast({ title: "Leave type updated" })
      } else {
        await createLeaveType({
          code: draft.code,
          name: draft.name,
          defaultEntitlement: days,
          isUnpaid: draft.isUnpaid,
          requiresReplacementDate: draft.requiresReplacementDate,
          requiresAttachment: draft.requiresAttachment,
        })
        toast({ title: "Leave type created" })
      }
      closeDraft()
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleToggleActive(t: LeaveTypeRow) {
    setIsLoading(true)
    try {
      await updateLeaveType({
        id: t.id,
        name: t.name,
        defaultEntitlement: t.defaultEntitlement,
        isUnpaid: t.isUnpaid,
        requiresReplacementDate: t.requiresReplacementDate,
        requiresAttachment: t.requiresAttachment,
        isActive: !t.isActive,
      })
      toast({ title: t.isActive ? "Leave type deactivated" : "Leave type reactivated" })
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update leave type",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold">Leave Types</h3>
            <p className="text-sm text-muted-foreground">
              Annual Leave and Unpaid Leave are protected and cannot be deleted. Adding a custom
              type makes it available in the application form and balance overrides.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Leave Type
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Default Days</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    No leave types yet.
                  </TableCell>
                </TableRow>
              )}
              {types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.code}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {t.name}
                      {!t.isDeletable && (
                        <Lock className="h-3 w-3 text-muted-foreground" aria-label="Protected" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{t.isUnpaid ? "Unlimited" : `${t.defaultEntitlement} days`}</TableCell>
                  <TableCell className="space-x-1">
                    {t.isUnpaid && <Badge variant="outline">Unpaid</Badge>}
                    {t.requiresReplacementDate && <Badge variant="outline">Replacement date</Badge>}
                    {t.requiresAttachment && <Badge variant="outline">Attachment</Badge>}
                    {!t.isActive && <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t._count.applications} apps · {t._count.balances} bal
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(t)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={
                        t.isActive
                          ? "h-8 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                          : "h-8 border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                      }
                      onClick={() => handleToggleActive(t)}
                      disabled={isLoading}
                    >
                      {t.isActive ? (
                        <>
                          <Power className="mr-1 h-3.5 w-3.5" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Reactivate
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit dialog */}
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open) closeDraft()
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Leave Type" : "Add Leave Type"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the configuration for this leave type."
                : "Create a custom leave type. The code is uppercase only and cannot be changed once saved."}
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="lt-code">Code</Label>
                <Input
                  id="lt-code"
                  value={draft.code}
                  onChange={(e) =>
                    setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })
                  }
                  placeholder="e.g. COMPASSIONATE"
                  disabled={isEdit}
                  className="mt-1 font-mono"
                />
                {!isEdit && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Uppercase letters, digits, and underscores only.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="lt-name">Display Name</Label>
                <Input
                  id="lt-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Compassionate Leave"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lt-days">Default Days Per Year</Label>
                <Input
                  id="lt-days"
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.defaultEntitlement}
                  onChange={(e) => setDraft({ ...draft, defaultEntitlement: e.target.value })}
                  className="mt-1"
                  disabled={draft.isUnpaid}
                />
                {draft.isUnpaid && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Unpaid leave types do not consume an entitled balance.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="lt-unpaid" className="cursor-pointer">Unpaid leave</Label>
                  <p className="text-xs text-muted-foreground">
                    Days are recorded but never deducted from a paid balance.
                  </p>
                </div>
                <Switch
                  id="lt-unpaid"
                  checked={draft.isUnpaid}
                  onCheckedChange={(v) => setDraft({ ...draft, isUnpaid: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="lt-replacement" className="cursor-pointer">
                    Requires replacement date in reason
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Shows a hint asking the user to state which date they are replacing.
                  </p>
                </div>
                <Switch
                  id="lt-replacement"
                  checked={draft.requiresReplacementDate}
                  onCheckedChange={(v) => setDraft({ ...draft, requiresReplacementDate: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/5 p-3 transition-colors duration-200 hover:border-primary/25 hover:bg-muted/25">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="lt-attachment" className="cursor-pointer">
                    Requires supporting document
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Users must upload an image or PDF (e.g. MC) when applying for this leave type.
                  </p>
                </div>
                <Switch
                  id="lt-attachment"
                  checked={draft.requiresAttachment}
                  onCheckedChange={(v) => setDraft({ ...draft, requiresAttachment: v })}
                />
              </div>
              {isEdit && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label htmlFor="lt-active" className="cursor-pointer">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Inactive types are hidden from the application form but kept for history.
                    </p>
                  </div>
                  <Switch
                    id="lt-active"
                    checked={draft.isActive}
                    onCheckedChange={(v) => setDraft({ ...draft, isActive: v })}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDraft} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isLoading ||
                !draft?.name?.trim() ||
                (!isEdit && !draft?.code?.trim())
              }
            >
              {isLoading ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}

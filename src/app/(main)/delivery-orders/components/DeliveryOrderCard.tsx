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
  DialogFooter,
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
  Briefcase,
  Unlink,
  AlertTriangle,
} from "lucide-react"
import { formatNumber } from "@/lib/format-number"
import { formatLocalDate } from "@/lib/date-utils"
import { toast } from "@/components/ui/use-toast"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import type { DeliveryOrderListItem, DeliveryOrderFull, ServiceOption, StaffOption } from "../types"
import {
  deleteDeliveryOrder,
  getDeliveryOrderFullById,
  getDeliveryOrderEmailHistory,
  getProjectsForDeliveryOrder,
  updateDeliveryOrder,
  updateDeliveryOrderProjectId,
} from "../action"
import SendDeliveryOrderDialog from "./SendDeliveryOrderDialog"
import DeliveryOrderForm from "./DeliveryOrderForm"
import ProjectSelection from "../../quotations/components/ProjectSelection"

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

  const [linkedProject, setLinkedProject] = useState<DeliveryOrderListItem["project"]>(order.project)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState(false)
  const [projectMode, setProjectMode] = useState<"existing" | "new">("existing")
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [selectedProjectName, setSelectedProjectName] = useState<string>("")
  const [selectedProjectData, setSelectedProjectData] = useState<{
    id: number
    name: string
    description?: string | null
    status?: string
    startDate?: Date | null
    endDate?: Date | null
  } | null>(null)
  const [newProjectData, setNewProjectData] = useState<{
    name: string
    description?: string
    startDate?: string
    endDate?: string
    priority: "low" | "medium" | "high"
  }>({
    name: order.deliveryOrderNumber,
    description: "",
    startDate: formatLocalDate(new Date(order.deliveryOrderDate)),
    endDate: formatLocalDate(new Date(order.deliveryOrderDate)),
    priority: "low",
  })
  const [isLinkingProject, setIsLinkingProject] = useState(false)

  const isActive = order.status === "active"
  const isCancelled = order.status === "cancelled"
  const grandTotal = order.finalAmount
  const date = new Date(order.deliveryOrderDate)
  const hasProject = linkedProject !== null && linkedProject !== undefined
  const isProjectCancelled = linkedProject?.status === "cancelled"

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

  const openLinkProjectDialog = useCallback(() => {
    setSelectedProjectId("")
    setSelectedProjectName("")
    setSelectedProjectData(null)
    setProjectMode("existing")
    setNewProjectData({
      name: order.deliveryOrderNumber,
      description: "",
      startDate: formatLocalDate(new Date(order.deliveryOrderDate)),
      endDate: formatLocalDate(new Date(order.deliveryOrderDate)),
      priority: "low",
    })
    setIsProjectDialogOpen(true)
  }, [order.deliveryOrderNumber, order.deliveryOrderDate])

  const handleProjectSelection = useCallback(
    (
      projectId: number,
      projectName: string,
      projectData?: {
        id: number
        name: string
        description?: string | null
        status?: string
        startDate?: Date | null
        endDate?: Date | null
      },
    ) => {
      setSelectedProjectId(projectId.toString())
      setSelectedProjectName(projectName)
      setSelectedProjectData(projectData ?? null)
    },
    [],
  )

  const handleLinkProject = useCallback(async () => {
    setIsLinkingProject(true)
    try {
      let projectId: number
      let linked: NonNullable<DeliveryOrderListItem["project"]> | null = null

      if (projectMode === "new") {
        if (!newProjectData.name) {
          toast({
            title: "Validation Error",
            description: "Please enter a project name.",
            variant: "destructive",
          })
          return
        }
        if (!order.clientId) {
          toast({
            title: "Validation Error",
            description: "Cannot create project: Delivery order has no client.",
            variant: "destructive",
          })
          return
        }
        const { createProject } = await import("../../projects/action")
        const newProject = await createProject({
          name: newProjectData.name,
          description: newProjectData.description,
          createdBy: currentUserId,
          startDate: newProjectData.startDate ? new Date(newProjectData.startDate) : undefined,
          endDate: newProjectData.endDate ? new Date(newProjectData.endDate) : undefined,
          priority: newProjectData.priority,
          clientId: order.clientId,
          clientName: order.client?.name ?? "",
        })
        projectId = newProject.id
        await updateDeliveryOrderProjectId(order.id, projectId)
        linked = {
          id: newProject.id,
          name: newProject.name,
          status: newProject.status as NonNullable<DeliveryOrderListItem["project"]>["status"],
        }
      } else {
        if (!selectedProjectId) {
          toast({
            title: "Validation Error",
            description: "Please select a project.",
            variant: "destructive",
          })
          return
        }
        projectId = parseInt(selectedProjectId, 10)
        if (Number.isNaN(projectId)) {
          toast({
            title: "Validation Error",
            description: "Invalid project selection.",
            variant: "destructive",
          })
          return
        }
        await updateDeliveryOrderProjectId(order.id, projectId)
        linked = {
          id: projectId,
          name: selectedProjectData?.name ?? selectedProjectName,
          status: (selectedProjectData?.status ?? "planning") as NonNullable<
            DeliveryOrderListItem["project"]
          >["status"],
        }
      }

      setLinkedProject(linked)
      setIsProjectDialogOpen(false)
      toast({ title: "Success", description: "Project linked successfully." })
      onRefresh?.()
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Link failed",
        description: e instanceof Error ? e.message : "Could not link project.",
      })
    } finally {
      setIsLinkingProject(false)
    }
  }, [
    projectMode,
    newProjectData,
    selectedProjectId,
    selectedProjectName,
    selectedProjectData,
    order.id,
    order.clientId,
    order.client?.name,
    currentUserId,
    onRefresh,
  ])

  const handleUnlinkProject = useCallback(async () => {
    setIsLinkingProject(true)
    try {
      await updateDeliveryOrderProjectId(order.id, null)
      setLinkedProject(null)
      setIsUnlinkDialogOpen(false)
      toast({ title: "Success", description: "Project unlinked." })
      onRefresh?.()
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Unlink failed",
        description: e instanceof Error ? e.message : "Could not unlink project.",
      })
    } finally {
      setIsLinkingProject(false)
    }
  }, [order.id, onRefresh])

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
                {isProjectCancelled && (
                  <Badge variant="destructive" className="bg-red-600 text-xs px-1.5 py-0">
                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                    Project Cancelled
                  </Badge>
                )}
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
              {linkedProject && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span className="font-medium text-gray-900">{linkedProject.name}</span>
                  </div>
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
                <DropdownMenuSeparator />
                {!hasProject ? (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      openLinkProjectDialog()
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Link Project
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        openLinkProjectDialog()
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Change Project
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setIsUnlinkDialogOpen(true)
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer text-red-600"
                    >
                      <Unlink className="w-4 h-4 mr-2" />
                      Unlink Project
                    </DropdownMenuItem>
                  </>
                )}
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

      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {hasProject ? "Change Linked Project" : "Link Project"}
            </DialogTitle>
            <DialogDescription>
              Select an existing project or create a new one to link to this delivery order.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ProjectSelection
              selectedProjectId={selectedProjectId ? parseInt(selectedProjectId) : undefined}
              newProjectData={newProjectData}
              onProjectSelect={handleProjectSelection}
              onNewProjectDataChange={setNewProjectData}
              onModeChange={setProjectMode}
              mode={projectMode}
              currentUserId={currentUserId}
              clientId={order.clientId}
              clientName={order.client?.name ?? ""}
              fetchProjects={getProjectsForDeliveryOrder}
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsProjectDialogOpen(false)}
              disabled={isLinkingProject}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleLinkProject()}
              disabled={
                isLinkingProject ||
                (projectMode === "existing" ? !selectedProjectId : !newProjectData.name)
              }
            >
              {isLinkingProject ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                "Link Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={isUnlinkDialogOpen}
        onClose={() => setIsUnlinkDialogOpen(false)}
        onConfirm={() => void handleUnlinkProject()}
        title="Unlink Project"
        description="Are you sure you want to unlink this project from the delivery order?"
        confirmText="Unlink"
        cancelText="Cancel"
        variant="danger"
        isLoading={isLinkingProject}
      />
    </Card>
  )
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { editQuotationById, getCustomServicesByQuotationId } from "../action";
import { getAllServices } from "../../services/action";
import { getAllProjects } from "../../projects/action";
import { useSession } from "../../contexts/SessionProvider";
import type { Services } from "@prisma/client";
import { QuotationWithServices, EditFormData, workflowStatusOptions, paymentStatusOptions } from "../types";
import { calculateGrandTotal } from "../utils";
import ClientSelection from "./ClientSelection";
import ProjectSelection from "./ProjectSelection";
import CustomServiceDialog from "./CustomServiceDialog";
import { Briefcase, Plus } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

interface EditQuotationFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingQuotation: QuotationWithServices | null;
}

export default function EditQuotationForm({
  isOpen,
  onOpenChange,
  onSuccess,
  editingQuotation,
}: EditQuotationFormProps) {
  const { enhancedUser } = useSession();
  const router = useRouter();
  
  // Check if quotation is final and cannot be edited
  const isFinalQuotation = editingQuotation?.workflowStatus === "final";
  const [services, setServices] = useState<Services[]>([]);
  const [customServices, setCustomServices] = useState<any[]>([]);
  const [editSelectedServiceIds, setEditSelectedServiceIds] = useState<
    string[]
  >([]);
  const [isCustomServiceDialogOpen, setIsCustomServiceDialogOpen] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [projectMode, setProjectMode] = useState<"existing" | "new">(
    "existing"
  );
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showProjectSelectionDialog, setShowProjectSelectionDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");
  const [newProjectData, setNewProjectData] = useState<{
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    priority: "low" | "medium" | "high";
  }>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    priority: "low"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: "",
    description: "",
    totalPrice: "",
    workflowStatus: "draft",
    paymentStatus: "unpaid",
    discountValue: "",
    discountType: "percentage",
    duration: "",
    startDate: "",
    clientId: "",
    projectId: undefined,
    newClient: {
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      notes: "",
      industry: "",
      yearlyRevenue: "",
      membershipType: "",
    },
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (editingQuotation) {
      setEditForm({
        name: editingQuotation.name,
        description: editingQuotation.description,
        totalPrice: editingQuotation.totalPrice.toString(),
        workflowStatus: editingQuotation.workflowStatus as "draft" | "in_review" | "final" | "accepted" | "rejected",
        paymentStatus: editingQuotation.paymentStatus as "unpaid" | "partially_paid" | "deposit_paid" | "fully_paid",
        discountValue: editingQuotation.discountValue?.toString() || "",
        discountType: editingQuotation.discountType || "percentage",
        duration: editingQuotation.duration?.toString() || "",
        startDate: editingQuotation.startDate
          ? new Date(editingQuotation.startDate).toISOString().split("T")[0]
          : "",
        clientId: editingQuotation.clientId || "",
        projectId: editingQuotation.project?.id || undefined,
        newClient: {
          name: "",
          email: "",
          phone: "",
          company: "",
          address: "",
          notes: "",
          industry: "",
          yearlyRevenue: "",
          membershipType: "",
        },
        newProject: {
          name: "",
          description: "",
          startDate: "",
          endDate: "",
          priority: "low",
        },
      });
      setEditSelectedServiceIds(
        editingQuotation.services.map((qs) => qs.service.id.toString())
      );

      // Set project mode based on whether there's an existing project
      if (editingQuotation.project) {
        setProjectMode("existing");
      } else {
        setProjectMode("existing");
      }

      // Set client mode based on whether there's an existing client
      setClientMode(editingQuotation.clientId ? "existing" : "new");

      // Fetch custom services for this quotation
      fetchCustomServices(editingQuotation.id);
    }
  }, [editingQuotation]);

  const fetchCustomServices = async (quotationId: number) => {
    try {
      const services = await getCustomServicesByQuotationId(quotationId);
      setCustomServices(services);
    } catch (error) {
      console.error("Failed to fetch custom services:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const servicesData = await getAllServices();
      setServices(servicesData);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };

  // Calculate edit total price based on selected services
  const calculateEditTotalPrice = () => {
    const selectedServices = services.filter((service) =>
      editSelectedServiceIds.includes(service.id.toString())
    );
    return selectedServices.reduce(
      (total, service) => total + service.basePrice,
      0
    );
  };

  // Calculate edit discounted total price
  const calculateEditDiscountedTotal = () => {
    const baseTotal = calculateEditTotalPrice();
    if (!editForm.discountValue || parseFloat(editForm.discountValue) === 0) {
      return baseTotal;
    }

    const discountValue = parseFloat(editForm.discountValue);

    if (editForm.discountType === "percentage") {
      const limitedDiscountValue = Math.min(discountValue, 100);
      const discountAmount = baseTotal * (limitedDiscountValue / 100);
      return baseTotal - discountAmount;
    } else {
      const limitedDiscountValue = Math.min(discountValue, baseTotal);
      return Math.max(0, baseTotal - limitedDiscountValue);
    }
  };

  const editTotalPrice = calculateEditTotalPrice();
  const editDiscountedTotal = calculateEditDiscountedTotal();
  
  // Calculate approved custom services total
  const calculateApprovedCustomServicesTotal = () => {
    return customServices
      .filter((cs) => cs.status === "APPROVED")
      .reduce((sum, cs) => sum + cs.price, 0);
  };

  const handleCustomServiceCreated = (newCustomService: any) => {
    // Refresh custom services list
    if (editingQuotation) {
      fetchCustomServices(editingQuotation.id);
    }
    // Close the dialog
    setIsCustomServiceDialogOpen(false);
  };

  const calculateEditEndDate = () => {
    if (!editForm.startDate || !editForm.duration) {
      return "Please select start date and duration";
    }

    const startDate = new Date(editForm.startDate);
    const duration = parseInt(editForm.duration);

    if (isNaN(duration) || duration <= 0) {
      return "Invalid duration";
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);

    return endDate.toLocaleDateString("en-GB");
  };

  const handleUpdateQuotationClick = (workflowStatus: string) => {
    if (!editingQuotation) return;

    if (!editForm.name || !editForm.description) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    // Validate client information
    if (clientMode === "existing" && !editForm.clientId) {
      toast({
        title: "Validation Error",
        description: "Please select a client.",
        variant: "destructive",
      });
      return;
    }

    if (clientMode === "new") {
      if (!editForm.newClient?.name || !editForm.newClient?.email) {
        toast({
          title: "Validation Error",
          description: "Please fill in the required client information (name and email).",
          variant: "destructive",
        });
        return;
      }
    }

    // If finalizing, show confirmation dialog first
    if (workflowStatus === "final") {
      setShowConfirmationDialog(true);
    } else {
      // For draft updates, proceed directly
      handleUpdateQuotation(workflowStatus);
    }
  };

  const handleUpdateQuotation = async (workflowStatus?: string) => {
    if (!editingQuotation) return;

    if (isSaving) {
      return; // Prevent multiple submissions
    }

    setIsSaving(true);
    try {
      let projectId: number | undefined = editForm.projectId;

      // For final quotations, handle project creation/linking
      if (workflowStatus === "final") {
        if (projectMode === "new") {
          // Create new project first
          if (!newProjectData.name) {
            toast({
              title: "Validation Error",
              description: "Please enter a project name.",
              variant: "destructive",
            });
            return;
          }

          const clientId = clientMode === "existing" ? editForm.clientId : undefined;
          const clientName = clientMode === "existing" ? editingQuotation?.Client?.name : editForm.newClient?.name || "";

          if (!clientId) {
            toast({
              title: "Validation Error",
              description: "Cannot create project: No client assigned. Please ensure quotation has a client.",
              variant: "destructive",
            });
            return;
          }

          const { createProject } = await import("../../projects/action");
          const newProject = await createProject({
            name: newProjectData.name,
            description: newProjectData.description || "",
            createdBy: enhancedUser.id,
            startDate: newProjectData.startDate ? new Date(newProjectData.startDate) : undefined,
            endDate: newProjectData.endDate ? new Date(newProjectData.endDate) : undefined,
            priority: newProjectData.priority,
            clientId: clientId,
            clientName: clientName,
          });
          projectId = newProject.id;
          
          // Refresh projects page cache - use setTimeout to ensure the project is fully created
          setTimeout(() => {
            router.refresh();
            // Dispatch custom event to refresh projects page client-side cache
            // Use a more specific event with detail to ensure it's received
            const event = new CustomEvent('projectsCacheInvalidate', {
              detail: { projectId: newProject.id, timestamp: Date.now() }
            });
            window.dispatchEvent(event);
            console.log('Dispatched projectsCacheInvalidate event after project creation');
          }, 200);
        } else {
          // Use selected existing project
          if (!selectedProjectId && !editForm.projectId) {
            toast({
              title: "Validation Error",
              description: "Please select a project for final quotation.",
              variant: "destructive",
            });
            return;
          }
          projectId = selectedProjectId || editForm.projectId;
        }

        // Validate that we have a project for final quotation
        if (!projectId) {
          toast({
            title: "Validation Error",
            description: "A project is required for final quotations.",
            variant: "destructive",
          });
          return;
        }
      }

      // Calculate grand total including approved custom services (monthly price × duration)
      const approvedCustomServicesTotal = calculateApprovedCustomServicesTotal();
      const monthlyTotal = editDiscountedTotal + approvedCustomServicesTotal;
      const grandTotal = editForm.duration
        ? calculateGrandTotal(monthlyTotal, parseInt(editForm.duration))
        : monthlyTotal;

      await editQuotationById(editingQuotation.id.toString(), {
        name: editForm.name,
        description: editForm.description,
        totalPrice: grandTotal, // Store grand total in totalPrice (includes custom services)
        workflowStatus: (workflowStatus || editForm.workflowStatus) as "draft" | "in_review" | "final" | "accepted" | "rejected",
        paymentStatus: editForm.paymentStatus,
        clientId: clientMode === "existing" ? editForm.clientId : undefined,
        newClient: clientMode === "new" ? editForm.newClient : undefined,
        discountValue: editForm.discountValue
          ? parseFloat(editForm.discountValue)
          : undefined,
        discountType: editForm.discountValue
          ? editForm.discountType
          : undefined,
        serviceIds: editSelectedServiceIds,
        duration: editForm.duration ? parseInt(editForm.duration) : undefined,
        startDate: editForm.startDate || undefined,
        projectId: projectId,
      });

      onSuccess();
      onOpenChange(false);
      setShowProjectSelectionDialog(false);
      setShowConfirmationDialog(false);
      toast({
        title: "Success",
        description: "Quotation updated successfully.",
      });
    } catch (error) {
      console.error("Error updating quotation:", error);
      toast({
        title: "Error",
        description: "Failed to update quotation. " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!editingQuotation) return null;

  // For final quotations, show limited editing form
  if (isFinalQuotation) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setIsSaving(false);
        }
        onOpenChange(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Final Quotation</DialogTitle>
            <DialogDescription>
              This is a final quotation. You can only edit the payment status.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  ⚠️ Final quotations have limited editing. Only payment status can be modified.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  value={editForm.paymentStatus}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({
                      ...prev,
                      paymentStatus: value as any,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                    <SelectItem value="fully_paid">Fully Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                handleUpdateQuotation();
                onOpenChange(false);
              }}
              disabled={isSaving}
            >
              {isSaving ? "Updating..." : "Update Payment Status"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setIsSaving(false);
      }
      onOpenChange(open);
    }}>
      <DialogContent
        className="w-[70vw] max-w-[70vw] max-h-[90vh] rounded-lg"
        showCloseButton={false}
      >
        <div className="custom-scrollbar overflow-y-auto max-h-[calc(90vh-4rem)] pr-2">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Edit Quotation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Quotation Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Client Selection */}
            <ClientSelection
              selectedClientId={editForm.clientId}
              newClientData={editForm.newClient}
              onClientSelect={(clientId) =>
                setEditForm((prev) => ({ ...prev, clientId }))
              }
              onNewClientDataChange={(newClientData) =>
                setEditForm((prev) => ({ ...prev, newClient: newClientData }))
              }
              onModeChange={setClientMode}
              mode={clientMode}
            />

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={editForm.startDate}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-duration">Duration (Months)</Label>
              <Input
                id="edit-duration"
                type="number"
                min="1"
                value={editForm.duration}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    duration: e.target.value,
                  }))
                }
                placeholder="e.g., 6"
              />
            </div>
            {editForm.startDate && editForm.duration && (
              <div className="grid grid-cols-2 justify-startx">
                <Label htmlFor="edit-endDate">Calculated End Date:</Label>
                <div className="p-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">
                    {calculateEditEndDate()}
                  </span>
                </div>
              </div>
            )}

            {/* Fixed Services Section */}
            <div className="grid border-black border-2 rounded-2xl p-4 gap-4 mt-4">
              <div>
                <Label className="text-lg font-semibold">Services</Label>
                <p className="text-xs text-muted-foreground mt-1">Select or deselect services for this quotation</p>
              </div>
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <Checkbox
                    checked={editSelectedServiceIds.includes(
                      service.id.toString()
                    )}
                    onCheckedChange={() => {
                      setEditSelectedServiceIds((prev) =>
                        prev.includes(service.id.toString())
                          ? prev.filter((id) => id !== service.id.toString())
                          : [...prev, service.id.toString()]
                      );
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.description}
                        </p>
                      </div>
                      <Badge variant="outline">
                        RM{service.basePrice.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Services Section */}
            <div className="grid border-blue-500 border-2 rounded-2xl p-4 gap-4 mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label className="text-lg font-semibold">Custom Services</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCustomServiceDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Request
                </Button>
              </div>
              {customServices.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No custom services requested yet
                </div>
              ) : (
                customServices.map((cs) => (
                  <div
                    key={cs.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg bg-blue-50"
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{cs.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {cs.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Requested by: {cs.createdBy.firstName} {cs.createdBy.lastName}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline">
                            RM{cs.price.toFixed(2)}
                          </Badge>
                          <Badge
                            variant={cs.status === "REJECTED" ? "destructive" : "default"}
                            className={
                              cs.status === "APPROVED"
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : cs.status === "REJECTED"
                                ? ""
                                : "bg-yellow-500 text-white hover:bg-yellow-600"
                            }
                          >
                            {cs.status}
                          </Badge>
                        </div>
                      </div>
                      {cs.approvalComment && (
                        <div className="mt-2 p-2 bg-white rounded text-xs">
                          <span className="font-semibold">Comment: </span>
                          {cs.approvalComment}
                        </div>
                      )}
                      {cs.rejectionComment && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                          <span className="font-semibold">Rejection Reason: </span>
                          {cs.rejectionComment}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-paymentStatus">Payment Status</Label>
              <Select
                value={editForm.paymentStatus}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, paymentStatus: value as "unpaid" | "partially_paid" | "deposit_paid" | "fully_paid" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-discount">Discount</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-discount"
                  type="number"
                  min="0"
                  step="0.10"
                  value={editForm.discountValue}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    const maxValue =
                      editForm.discountType === "percentage"
                        ? 100
                        : editTotalPrice;

                    if (value > maxValue) {
                      toast({
                        title: "Validation Error",
                        description: `Discount cannot exceed ${
                          editForm.discountType === "percentage"
                            ? "100%"
                            : `RM${editTotalPrice.toFixed(2)}`
                        }`,
                        variant: "destructive",
                      });
                      setEditForm((prev) => ({
                        ...prev,
                        discountValue: "",
                      }));
                      return;
                    }

                    setEditForm((prev) => ({
                      ...prev,
                      discountValue: e.target.value,
                    }));
                  }}
                  placeholder="0.00"
                  className="flex-1"
                />
                <Select
                  value={editForm.discountType}
                  onValueChange={(value: "percentage" | "fixed") =>
                    setEditForm((prev) => ({
                      ...prev,
                      discountType: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">RM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 justify-center gap-2">
              <Label htmlFor="edit-totalPrice">Total Price (Per Month)</Label>
              <div className="p-3 bg-muted rounded-md">
                {editForm.discountValue &&
                parseFloat(editForm.discountValue) > 0 ? (
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground line-through">
                      RM{editTotalPrice.toFixed(2)}
                    </span>
                    <br />
                    <span className="text-lg font-bold text-green-600">
                      RM{editDiscountedTotal.toFixed(2)}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      Discount: RM
                      {(editTotalPrice - editDiscountedTotal).toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="text-lg font-bold">
                      RM{editTotalPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Grand Total Section */}
            {editForm.duration && parseFloat(editForm.duration) > 0 && (
              <div className="grid grid-cols-2 justify-center gap-2">
                <Label htmlFor="edit-grandTotal">
                  Grand Total ({editForm.duration} months)
                </Label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-right">
                    <div className="text-xs text-blue-600 mb-1">
                      ({editDiscountedTotal.toFixed(2)} + {calculateApprovedCustomServicesTotal().toFixed(2)}) × {editForm.duration}{" "}
                      months
                    </div>
                    <span className="text-xl font-bold text-blue-800">
                      RM
                      {(
                        (editDiscountedTotal + calculateApprovedCustomServicesTotal()) * parseFloat(editForm.duration)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 sticky bottom-0 bg-background pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {editForm.workflowStatus === "draft" && (
              <Button
                variant="secondary"
                onClick={() => handleUpdateQuotationClick("draft")}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save as Draft"}
              </Button>
            )}
            {editForm.workflowStatus === "draft" && (
              <Button 
                onClick={() => handleUpdateQuotationClick("final")}
                disabled={isSaving}
              >
                {isSaving ? "Processing..." : "Finalize Quotation"}
              </Button>
            )}
            {editForm.workflowStatus !== "draft" && (
              <Button 
                onClick={() => handleUpdateQuotationClick(editForm.workflowStatus)}
                disabled={isSaving}
              >
                {isSaving ? "Updating..." : "Update Quotation"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Custom Service Dialog */}
      <CustomServiceDialog
        isOpen={isCustomServiceDialogOpen}
        onOpenChange={setIsCustomServiceDialogOpen}
        onServiceCreated={handleCustomServiceCreated}
        quotationId={editingQuotation?.id}
        createdById={enhancedUser?.id}
      />
    </Dialog>

    {/* Confirmation Dialog */}
    <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalize Quotation</DialogTitle>
          <DialogDescription>
            Are you sure you want to finalize this quotation?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">⚠️ Important</h4>
            <p className="text-sm text-amber-700">
              Once finalized, this quotation will be marked as final. 
              You will be prompted to select a project next. All final quotations must be linked to a project.
            </p>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowConfirmationDialog(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Pre-fill the Create New Project form with quotation data
              setNewProjectData({
                name: editForm.name || "",
                description: editForm.description || "",
                startDate: editForm.startDate || "",
                endDate: editForm.startDate && editForm.duration 
                  ? (() => {
                      const start = new Date(editForm.startDate);
                      const end = new Date(start);
                      end.setMonth(end.getMonth() + parseInt(editForm.duration));
                      return end.toISOString().split("T")[0];
                    })()
                  : "",
                priority: "low",
              });
              
              setShowConfirmationDialog(false);
              setShowProjectSelectionDialog(true);
            }}
            disabled={isSaving}
          >
            Continue to Project Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Project Selection Dialog for Final Quotations */}
    <Dialog open={showProjectSelectionDialog} onOpenChange={setShowProjectSelectionDialog}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Project for Final Quotation</DialogTitle>
          <DialogDescription>
            A project must be linked to finalize this quotation. Please select an existing project or create a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ProjectSelection
            selectedProjectId={selectedProjectId}
            newProjectData={newProjectData}
            onProjectSelect={(projectId, projectName, projectData) => {
              setSelectedProjectId(projectId);
              setSelectedProjectName(projectName);
              
              // Populate newProjectData with selected project's data
              if (projectData) {
                setNewProjectData({
                  name: projectData.name || "",
                  description: projectData.description || "",
                  startDate: projectData.startDate 
                    ? new Date(projectData.startDate).toISOString().split("T")[0] 
                    : "",
                  endDate: projectData.endDate 
                    ? new Date(projectData.endDate).toISOString().split("T")[0] 
                    : "",
                  priority: "low", // Default priority for existing projects (projects don't have priority field)
                });
              }
            }}
            onNewProjectDataChange={setNewProjectData}
            onModeChange={setProjectMode}
            mode={projectMode}
            currentUserId={enhancedUser?.id || ""}
            clientId={editForm.clientId}
            clientName={editingQuotation?.Client?.name || editForm.newClient?.name || ""}
          />
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowProjectSelectionDialog(false);
              setShowConfirmationDialog(true); // Go back to confirmation
            }}
          >
            Back
          </Button>
          <Button
            onClick={() => handleUpdateQuotation("final")}
            disabled={isSaving}
          >
            {isSaving 
              ? "Processing..." 
              : projectMode === "new" 
                ? "Create Project & Finalize" 
                : "Finalize Quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

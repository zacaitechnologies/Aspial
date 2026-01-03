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
import { editQuotationById, getCustomServicesByQuotationId, getAllUsers, getQuotationFullById } from "../action";
import { getAllServices } from "../../services/action";
import { getAllProjects } from "../../projects/action";
import { useSession } from "../../contexts/SessionProvider";
import { checkIsAdmin } from "../../actions/admin-actions";
import type { Services } from "@prisma/client";
import { QuotationWithServices, EditFormData, workflowStatusOptions, paymentStatusOptions } from "../types";
import ClientSelection from "./ClientSelection";
import ProjectSelection from "./ProjectSelection";
import CustomServiceDialog from "./CustomServiceDialog";
import { Briefcase, Plus } from "lucide-react";
import { Loader2 } from "lucide-react";
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
  
  // Check if quotation is final or cancelled and cannot be edited (unless admin)
  const isFinalQuotation = editingQuotation?.workflowStatus === "final";
  const isCancelledQuotation = editingQuotation?.workflowStatus === "cancelled";
  const isNonEditableQuotation = isFinalQuotation || isCancelledQuotation;
  const [isAdmin, setIsAdmin] = useState(false);
  const [services, setServices] = useState<Services[]>([]);
  const [customServices, setCustomServices] = useState<any[]>([]);
  const [isLoadingCustomServices, setIsLoadingCustomServices] = useState(false);
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
  const [isLoadingFullData, setIsLoadingFullData] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; firstName: string | null; lastName: string | null; email: string; supabase_id: string }>>([]);
  const [selectedCreatedById, setSelectedCreatedById] = useState<string>("");
  const [fullQuotationData, setFullQuotationData] = useState<QuotationWithServices | null>(null);
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
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    if (enhancedUser?.id) {
      try {
        const adminStatus = await checkIsAdmin(enhancedUser.id);
        setIsAdmin(adminStatus);
        if (adminStatus) {
          const users = await getAllUsers();
          setAllUsers(users);
        }
      } catch (error) {
        console.error("Error checking admin status or fetching users:", error);
      }
    }
  };

  useEffect(() => {
    if (editingQuotation) {
      // Fetch full quotation data if we don't have complete service data
      const hasIncompleteServices = editingQuotation.services.some(
        (qs) => !qs.service || !qs.service.id || Object.keys(qs.service).length === 0
      );
      
      if (hasIncompleteServices) {
        setIsLoadingFullData(true);
        getQuotationFullById(editingQuotation.id.toString())
          .then((fullData) => {
            if (fullData) {
              setFullQuotationData(fullData);
              // Use full data for form initialization
              initializeFormWithQuotation(fullData);
            } else {
              // Fallback to partial data if full fetch fails
              initializeFormWithQuotation(editingQuotation);
            }
          })
          .catch((error) => {
            console.error("Error fetching full quotation data:", error);
            // Fallback to partial data on error
            initializeFormWithQuotation(editingQuotation);
          })
          .finally(() => {
            setIsLoadingFullData(false);
          });
      } else {
        // We have complete data, use it directly
        setFullQuotationData(editingQuotation);
        initializeFormWithQuotation(editingQuotation);
      }
    }
  }, [editingQuotation]);

  const initializeFormWithQuotation = (quotation: QuotationWithServices) => {
    setEditForm({
      name: quotation.name,
      description: quotation.description,
      totalPrice: quotation.totalPrice.toString(),
      workflowStatus: quotation.workflowStatus as "draft" | "in_review" | "final" | "accepted" | "rejected",
      paymentStatus: quotation.paymentStatus as "unpaid" | "partially_paid" | "deposit_paid" | "fully_paid",
      discountValue: quotation.discountValue?.toString() || "",
      discountType: quotation.discountType || "percentage",
      duration: quotation.duration?.toString() || "",
      startDate: quotation.startDate
        ? new Date(quotation.startDate).toISOString().split("T")[0]
        : "",
      clientId: quotation.clientId || "",
      projectId: quotation.project?.id || undefined,
      newClient: {
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        notes: "",
        industry: "",
        yearlyRevenue: "",
        membershipType: "NON_MEMBER",
      },
      newProject: {
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        priority: "low",
      },
    });
    
    // Set the selected createdBy user if admin
    if (quotation.createdBy?.supabase_id) {
      setSelectedCreatedById(quotation.createdBy.supabase_id);
    }
    
    // Use serviceId if available (from list view), otherwise use service.id (from full fetch)
    setEditSelectedServiceIds(
      quotation.services
        .map((qs) => {
          // List view has serviceId but empty service object
          // Full fetch has full service object with id
          if (qs.serviceId) {
            return qs.serviceId.toString();
          }
          // Fallback to service.id if service object is available
          if (qs.service?.id) {
            return qs.service.id.toString();
          }
          return null;
        })
        .filter((id): id is string => id !== null)
    );

    // Set project mode based on whether there's an existing project
    if (quotation.project) {
      setProjectMode("existing");
    } else {
      setProjectMode("existing");
    }

    // Set client mode based on whether there's an existing client
    setClientMode(quotation.clientId ? "existing" : "new");

    // Fetch custom services for this quotation
    fetchCustomServices(quotation.id);
  };

  const fetchCustomServices = async (quotationId: number) => {
    setIsLoadingCustomServices(true);
    try {
      const services = await getCustomServicesByQuotationId(quotationId);
      setCustomServices(services);
    } catch (error) {
      console.error("Failed to fetch custom services:", error);
      toast({
        title: "Error",
        description: "Failed to load custom services. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCustomServices(false);
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

    if (!editForm.description) {
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
      let finalClientId: string | undefined = clientMode === "existing" ? editForm.clientId : undefined;
      let finalClientName: string = clientMode === "existing" ? (editingQuotation?.Client?.name || "") : (editForm.newClient?.name || "");

      // Project linking is optional - users can link projects anytime, not just when finalizing
      if (projectMode === "new" && newProjectData.name) {
        // Create new project if user wants to
        // If creating a new client, create it first so we have a clientId for the project
        if (clientMode === "new") {
          if (!editForm.newClient?.name || !editForm.newClient?.email) {
            toast({
              title: "Validation Error",
              description: "Please fill in the required client information (name and email).",
              variant: "destructive",
            });
            setIsSaving(false);
            return;
          }

          try {
            const { createCustomerClient } = await import("../../clients/action");
            const newClient = await createCustomerClient({
              name: editForm.newClient.name,
              email: editForm.newClient.email,
              phone: editForm.newClient.phone,
              company: editForm.newClient.company,
              address: editForm.newClient.address,
              notes: editForm.newClient.notes,
              industry: editForm.newClient.industry,
              yearlyRevenue: editForm.newClient.yearlyRevenue ? parseFloat(editForm.newClient.yearlyRevenue) : undefined,
              membershipType: (editForm.newClient.membershipType as "MEMBER" | "NON_MEMBER") || "NON_MEMBER",
            });
            finalClientId = newClient.id;
            finalClientName = newClient.name;
          } catch (error) {
            console.error("Error creating client:", error);
            toast({
              title: "Error",
              description: "Failed to create client: " + (error as Error).message,
              variant: "destructive",
            });
            setIsSaving(false);
            return;
          }
        }

        if (!finalClientId) {
          toast({
            title: "Validation Error",
            description: "Cannot create project: No client assigned. Please ensure quotation has a client.",
            variant: "destructive",
          });
          setIsSaving(false);
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
          clientId: finalClientId,
          clientName: finalClientName,
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
      } else if (projectMode === "existing") {
        // Use selected existing project (if any)
        projectId = selectedProjectId || editForm.projectId;
      }

      // Calculate total: sum of services with discount + approved custom services (no duration multiplication)
      const approvedCustomServicesTotal = calculateApprovedCustomServicesTotal();
      const total = editDiscountedTotal + approvedCustomServicesTotal;

      await editQuotationById(editingQuotation.id.toString(), {
        description: editForm.description,
        totalPrice: total, // Store total (sum of services with discount + custom services, no duration multiplication)
        workflowStatus: (workflowStatus || editForm.workflowStatus) as "draft" | "in_review" | "final" | "accepted" | "rejected" | "cancelled",
        paymentStatus: editForm.paymentStatus,
        // If we already created the client (for final quotations with new clients), use the clientId
        // Otherwise, use the existing logic
        clientId: finalClientId || (clientMode === "existing" ? editForm.clientId : undefined),
        newClient: finalClientId ? undefined : (clientMode === "new" ? editForm.newClient : undefined),
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
        createdById: isAdmin && selectedCreatedById ? selectedCreatedById : undefined, // Only pass if admin changed it
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

  // For final or cancelled quotations, show read-only view (unless admin)
  if (isNonEditableQuotation && !isAdmin) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setIsSaving(false);
        }
        onOpenChange(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isFinalQuotation ? "Final Quotation" : "Cancelled Quotation"}
            </DialogTitle>
            <DialogDescription>
              {isFinalQuotation 
                ? "This quotation has been finalized and cannot be edited."
                : "This quotation has been cancelled and cannot be edited."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  ⚠️ {isFinalQuotation 
                    ? "Final quotations cannot be edited. If you need to make changes, please create a new quotation."
                    : "Cancelled quotations cannot be edited."}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
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
        className="w-[85vw]! max-w-[85vw]! sm:max-w-[85vw]! max-h-[90vh] rounded-lg overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle>Edit Quotation</DialogTitle>
          {isAdmin && isFinalQuotation && (
            <DialogDescription className="text-amber-700 bg-amber-50 p-2 rounded mt-2">
              ⚠️ Admin Mode: You can fully edit this final quotation, including services and all fields.
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoadingFullData ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Loading quotation data...</p>
            </div>
          </div>
        ) : (
        <div className="custom-scrollbar overflow-y-auto overflow-x-hidden max-h-[calc(90vh-8rem)] pr-2 min-w-0">
          <div className="grid gap-4 py-4 w-full">
            {/* Quotation Number (Read-only) */}
            {editingQuotation && (
              <div className="grid gap-2">
                <Label htmlFor="edit-quotation-number">Quotation Number</Label>
                <Input
                  id="edit-quotation-number"
                  value={editingQuotation.name}
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">Quotation number is auto-generated and cannot be changed</p>
              </div>
            )}

            {/* Created By (Admin only) */}
            {isAdmin && editingQuotation && (
              <div className="grid gap-2">
                <Label htmlFor="edit-created-by">Created By</Label>
                <Select
                  value={selectedCreatedById}
                  onValueChange={setSelectedCreatedById}
                >
                  <SelectTrigger id="edit-created-by">
                    <SelectValue placeholder="Select creator" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((user) => (
                      <SelectItem key={user.supabase_id} value={user.supabase_id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only admins can change the creator of a quotation</p>
              </div>
            )}

            {/* Client Selection */}
            <div className="grid gap-2">
              <Label>Client <span className="text-red-500">*</span></Label>
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description <span className="text-red-500">*</span></Label>
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
                <Label className="text-lg font-semibold">Services <span className="text-red-500">*</span></Label>
                <p className="text-xs text-muted-foreground mt-1">Select or deselect services for this quotation (at least one service required)</p>
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
                  disabled={isLoadingCustomServices}
                >
                  <Plus className="w-4 h-4" />
                  New Request
                </Button>
              </div>
              {isLoadingCustomServices ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Loading custom services...</span>
                </div>
              ) : customServices.length === 0 ? (
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
              <Label htmlFor="edit-workflowStatus">Workflow Status</Label>
              <Select
                value={editForm.workflowStatus}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, workflowStatus: value as "draft" | "in_review" | "final" | "accepted" | "rejected" | "cancelled" }))
                }
                disabled={isNonEditableQuotation && !isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workflow status" />
                </SelectTrigger>
                <SelectContent>
                  {workflowStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isNonEditableQuotation && !isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Final and cancelled quotations cannot be edited
                </p>
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
        )}
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
          <div className="p-4 border-2 border-red-300 rounded-lg bg-red-50">
            <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
              <span className="text-lg">⚠️</span> Important
            </h4>
            <div className="space-y-2 text-sm text-red-800">
              <p>
                Once finalized, this quotation will be marked as final and cannot be edited.
              </p>
              <p className="font-semibold text-red-900 border-t border-red-200 pt-2 mt-2">
                ⚠️ Critical: Once finalized, you CANNOT add custom services anymore. Make sure to add all custom services before finalizing.
              </p>
            </div>
          </div>
          <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
            <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <span className="text-lg">ℹ️</span> Draft Quotations
            </h4>
            <p className="text-sm text-blue-800 font-semibold">
              ✓ Draft quotations can still be edited and custom services can be added.
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
              setShowConfirmationDialog(false);
              // Directly finalize without requiring project selection
              handleUpdateQuotation("final");
            }}
            disabled={isSaving}
          >
            {isSaving ? "Finalizing..." : "Finalize Quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Project Selection Dialog (Optional - for linking projects anytime) */}
    <Dialog open={showProjectSelectionDialog} onOpenChange={setShowProjectSelectionDialog}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Project to Quotation</DialogTitle>
          <DialogDescription>
            You can optionally link a project to this quotation. Projects can be linked at any time, even after finalizing.
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
              // Allow skipping project selection - go back to confirmation or just finalize
              setShowConfirmationDialog(false);
              // Finalize without project
              handleUpdateQuotation("final");
            }}
          >
            Skip & Finalize
          </Button>
          <Button
            onClick={() => handleUpdateQuotation("final")}
            disabled={isSaving}
          >
            {isSaving 
              ? "Processing..." 
              : projectMode === "new" && newProjectData.name
                ? "Create Project & Finalize" 
                : selectedProjectId
                ? "Link Project & Finalize"
                : "Finalize Without Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

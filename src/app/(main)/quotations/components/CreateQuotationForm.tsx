"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
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
import { Plus, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createQuotation, getAllUsers } from "../action";
import { getAllServices } from "../../services/action";
import type { Services } from "@prisma/client";
import { useSession } from "../../contexts/SessionProvider";
import { checkIsAdmin } from "../../actions/admin-actions";
import { QuotationFormData } from "../types";
import ClientSelection from "./ClientSelection";
import ProjectSelection from "./ProjectSelection";
import { toast } from "@/components/ui/use-toast";
import { formatLocalDate } from "@/lib/date-utils";
import { formatNumber } from "@/lib/format-number";

interface CreateQuotationFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateQuotationForm({
  isOpen,
  onOpenChange,
  onSuccess,
}: CreateQuotationFormProps) {
  const { enhancedUser } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<Services[]>([]);
  const [quotationForm, setQuotationForm] = useState<QuotationFormData>({
    description: "",
    discountValue: "",
    discountType: "percentage",
    duration: "",
    startDate: "",
    clientId: "",
    selectedClientName: "",
    newClient: {
      name: "",
      email: "",
      phone: "",
      company: "",
      companyRegistrationNumber: "",
      address: "",
      notes: "",
      industry: "",
      yearlyRevenue: "",
      membershipType: "NON_MEMBER",
    },
  });

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showProjectSelectionDialog, setShowProjectSelectionDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");
  const [projectMode, setProjectMode] = useState<"existing" | "new">("existing");
  const [newProjectData, setNewProjectData] = useState<{
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    priority: "low" | "medium" | "high";
  }>({
    name: quotationForm.description || "New Project", // Use description as project name
    description: quotationForm.description,
    startDate: quotationForm.startDate ? formatLocalDate(new Date(quotationForm.startDate)) : "",
    endDate: quotationForm.startDate && quotationForm.duration ? 
      formatLocalDate(new Date(new Date(quotationForm.startDate).setMonth(new Date(quotationForm.startDate).getMonth() + parseInt(quotationForm.duration)))) : "",
    priority: "low"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; firstName: string | null; lastName: string | null; email: string; supabase_id: string }>>([]);
  const [selectedCreatedById, setSelectedCreatedById] = useState<string>("");

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
          // Default to current user
          setSelectedCreatedById(enhancedUser.id);
        }
      } catch (error) {
        console.error("Error checking admin status or fetching users:", error);
      }
    }
  };

  // Update newProjectData when quotationForm changes
  useEffect(() => {
    setNewProjectData({
      name: quotationForm.description || "New Project", // Use description as project name
      description: quotationForm.description,
      startDate: quotationForm.startDate ? formatLocalDate(new Date(quotationForm.startDate)) : "",
      endDate: quotationForm.startDate && quotationForm.duration ? 
        formatLocalDate(new Date(new Date(quotationForm.startDate).setMonth(new Date(quotationForm.startDate).getMonth() + parseInt(quotationForm.duration)))) : "",
      priority: "low"
    });
  }, [quotationForm.description, quotationForm.startDate, quotationForm.duration]);

  const fetchServices = async () => {
    try {
      const servicesData = await getAllServices();
      setServices(servicesData);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };

  // Custom services are not available during quotation creation
  // They can be added after the quotation is created through the edit form

  const handleServiceToggle = (serviceId: string) => {
    const service = services.find((s) => s.id.toString() === serviceId);
    if (!service) return;

    setSelectedServiceIds((prev) => {
      const newSelection = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];

      const newTotal = newSelection.reduce((total, id) => {
        const svc = services.find((s) => s.id.toString() === id);
        return total + (svc?.basePrice || 0);
      }, 0);

      console.log("Service toggle:", {
        serviceId,
        prev,
        newSelection,
        newTotal,
      });

      setTotalPrice(newTotal);
      return newSelection;
    });
  };

  // Calculate discounted total price
  const calculateDiscountedTotal = () => {
    if (
      !quotationForm.discountValue ||
      parseFloat(quotationForm.discountValue) === 0
    ) {
      return totalPrice;
    }

    const discountValue = parseFloat(quotationForm.discountValue);

    if (quotationForm.discountType === "percentage") {
      const limitedDiscountValue = Math.min(discountValue, 100);
      const discountAmount = totalPrice * (limitedDiscountValue / 100);
      return totalPrice - discountAmount;
    } else {
      const limitedDiscountValue = Math.min(discountValue, totalPrice);
      return Math.max(0, totalPrice - limitedDiscountValue);
    }
  };

  const discountedTotal = calculateDiscountedTotal();

  // Calculate the actual discount amount in RM
  const getDiscountAmount = () => {
    if (
      !quotationForm.discountValue ||
      parseFloat(quotationForm.discountValue) === 0
    ) {
      return 0;
    }

    const discountValue = parseFloat(quotationForm.discountValue);

    if (quotationForm.discountType === "percentage") {
      const limitedDiscountValue = Math.min(discountValue, 100);
      return totalPrice * (limitedDiscountValue / 100);
    } else {
      const limitedDiscountValue = Math.min(discountValue, totalPrice);
      return limitedDiscountValue;
    }
  };

  const discountAmount = getDiscountAmount();

  const calculateEndDate = () => {
    if (!quotationForm.startDate || !quotationForm.duration) {
      return "Please select start date and duration";
    }

    const startDate = new Date(quotationForm.startDate);
    const duration = parseInt(quotationForm.duration);

    if (isNaN(duration) || duration <= 0) {
      return "Invalid duration";
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);

    return endDate.toLocaleDateString("en-GB");
  };


  const validateForm = () => {
    // Debug logging to help identify the issue
    console.log("Form validation check:", {
      description: quotationForm.description,
      selectedServiceIds: selectedServiceIds,
      selectedServiceIdsLength: selectedServiceIds.length,
      descriptionEmpty: !quotationForm.description,
      servicesEmpty: selectedServiceIds.length === 0,
    });

    if (
      !quotationForm.description ||
      selectedServiceIds.length === 0
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill all fields and select at least one service.",
        variant: "destructive",
      });
      return false;
    }

    // Validate client information
    if (clientMode === "existing" && !quotationForm.clientId) {
      toast({
        title: "Validation Error",
        description: "Please select a client.",
        variant: "destructive",
      });
      return false;
    }

    if (clientMode === "new") {
      if (!quotationForm.newClient?.name || !quotationForm.newClient?.email) {
        toast({
          title: "Validation Error",
          description: "Please fill in the required client information (name and email).",
          variant: "destructive",
        });
        return false;
      }
    }

    if (!enhancedUser.id) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please try logging in again.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleCreateQuotation = async (workflowStatus: "draft" | "in_review" | "final" | "accepted" | "rejected" | "cancelled" = "draft") => {
    if (!validateForm()) {
      return;
    }

    if (isSaving) {
      return; // Prevent multiple submissions
    }

    setIsSaving(true);
    try {
      let projectId: number | undefined;
      let finalClientId: string | undefined = clientMode === "existing" ? quotationForm.clientId : undefined;
      let finalClientName: string = clientMode === "existing" ? (quotationForm.selectedClientName || "") : (quotationForm.newClient?.name || "");

      // Project linking is optional - users can link projects anytime, not just when finalizing
      if (projectMode === "new" && newProjectData.name) {
        // Create new project if user wants to
        // If creating a new client, create it first so we have a clientId for the project
        if (clientMode === "new") {
          if (!quotationForm.newClient?.name || !quotationForm.newClient?.email) {
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
              name: quotationForm.newClient.name,
              email: quotationForm.newClient.email,
              phone: quotationForm.newClient.phone,
              company: quotationForm.newClient.company,
              companyRegistrationNumber: quotationForm.newClient.companyRegistrationNumber,
              address: quotationForm.newClient.address,
              notes: quotationForm.newClient.notes,
              industry: quotationForm.newClient.industry,
              yearlyRevenue: quotationForm.newClient.yearlyRevenue ? parseFloat(quotationForm.newClient.yearlyRevenue) : undefined,
              membershipType: (quotationForm.newClient.membershipType as "MEMBER" | "NON_MEMBER") || "NON_MEMBER",
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
            description: "Cannot create project: No client assigned. Please assign a client first.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }

        const { createProject } = await import("../../projects/action");
        const newProject = await createProject({
          name: newProjectData.name,
          description: newProjectData.description,
          createdBy: enhancedUser.id,
          startDate: newProjectData.startDate ? new Date(newProjectData.startDate) : undefined,
          endDate: newProjectData.endDate ? new Date(newProjectData.endDate) : undefined,
          priority: newProjectData.priority,
          clientId: finalClientId,
          clientName: finalClientName,
        });
        projectId = newProject.id;
        
        // Dispatch custom event to refresh projects page client-side cache
        // Use a more specific event with detail to ensure it's received
        // Don't use router.refresh() as it causes full page refresh and navigation issues
        const event = new CustomEvent('projectsCacheInvalidate', {
          detail: { projectId: newProject.id, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
        if (process.env.NODE_ENV === 'development') {
          console.log('Dispatched projectsCacheInvalidate event after project creation');
        }
      } else if (projectMode === "existing") {
        // Use selected existing project
        projectId = selectedProjectId;
      }

      // Total price is just the sum of services with discount applied (no duration multiplication)
      await createQuotation({
        description: quotationForm.description,
        totalPrice: discountedTotal, // Store discounted total (sum of services with discount)
        serviceIds: selectedServiceIds,
        createdById: isAdmin && selectedCreatedById ? selectedCreatedById : enhancedUser.id,
        workflowStatus: workflowStatus, // Add workflow status parameter
        paymentStatus: "unpaid", // Default to unpaid for new quotations
        // If we already created the client (for final quotations with new clients), use the clientId
        // Otherwise, use the existing logic
        clientId: finalClientId || (clientMode === "existing" ? quotationForm.clientId : undefined),
        newClient: finalClientId ? undefined : (clientMode === "new" ? quotationForm.newClient : undefined),
        discountValue: quotationForm.discountValue
          ? parseFloat(quotationForm.discountValue)
          : undefined,
        discountType: quotationForm.discountValue
          ? quotationForm.discountType
          : undefined,
        duration: quotationForm.duration
          ? parseInt(quotationForm.duration)
          : undefined,
        startDate: quotationForm.startDate || undefined,
        projectId: projectId, // Add project ID for final quotations
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
      setShowProjectSelectionDialog(false);
      toast({
        title: "Success",
        description: "Quotation created successfully.",
      });
    } catch (error) {
      console.error("Error creating quotation:", error);
      toast({
        title: "Error",
        description: "Failed to create quotation: " + (error as Error).message + (workflowStatus === "final" ? " You can try again or save as draft instead." : ""),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateQuotationClick = () => {
    if (!validateForm()) {
      return;
    }
    setShowConfirmationDialog(true);
  };

  const resetForm = () => {
    setQuotationForm({
      description: "",
      discountValue: "",
      discountType: "percentage",
      duration: "",
      startDate: "",
      clientId: "",
      selectedClientName: "",
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
    });
    setSelectedServiceIds([]);
    setTotalPrice(0);
    setServiceSearchQuery("");
    setClientMode("existing");
    setSelectedProjectId(undefined);
    setSelectedProjectName("");
    setProjectMode("existing");
    setNewProjectData({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      priority: "low"
    });
    setIsSaving(false);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
      }
      onOpenChange(open);
    }}>
      <DialogContent
        className="w-[85vw]! max-w-[85vw]! sm:max-w-[85vw]! max-h-[90vh] rounded-lg overflow-hidden"
        showCloseButton={false}
      >
        <div className="custom-scrollbar overflow-y-auto overflow-x-hidden max-h-[calc(90vh-4rem)] pr-2 min-w-0">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Create New Quotation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 w-full">
            {/* Created By (Admin only) */}
            {isAdmin && (
              <div className="grid gap-2">
                <Label htmlFor="create-created-by">Created By</Label>
                <Select
                  value={selectedCreatedById}
                  onValueChange={setSelectedCreatedById}
                >
                  <SelectTrigger id="create-created-by">
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
                <p className="text-xs text-muted-foreground">Only admins can select a different creator</p>
              </div>
            )}

            {/* Client Selection */}
            <div className="grid gap-2">
              <Label>Client <span className="text-red-500">*</span></Label>
              <ClientSelection
                selectedClientId={quotationForm.clientId}
                newClientData={quotationForm.newClient}
                onClientSelect={(clientId, clientName) =>
                  setQuotationForm((prev) => ({ 
                    ...prev, 
                    clientId,
                    selectedClientName: clientName 
                  }))
                }
                onNewClientDataChange={(newClientData) =>
                  setQuotationForm((prev) => ({
                    ...prev,
                    newClient: newClientData,
                  }))
                }
                onModeChange={setClientMode}
                mode={clientMode}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quotation-description">Description <span className="text-red-500">*</span></Label>
              <Textarea
                className="text-black"
                id="quotation-description"
                value={quotationForm.description}
                onChange={(e) =>
                  setQuotationForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter quotation description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={quotationForm.startDate}
                onChange={(e) =>
                  setQuotationForm((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (Months)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={quotationForm.duration}
                onChange={(e) =>
                  setQuotationForm((prev) => ({
                    ...prev,
                    duration: e.target.value,
                  }))
                }
                onWheel={(e) => e.currentTarget.blur()} 
                placeholder="e.g., 6"
              />
            </div>
            {quotationForm.startDate && quotationForm.duration && (
              <div className="grid gap-2">
                <Label htmlFor="endDate">Calculated End Date</Label>
                <div className="p-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">
                    {calculateEndDate()}
                  </span>
                </div>
              </div>
            )}

            <div className="grid border-black border-2 rounded-2xl p-4 gap-4 mt-4">
              <div className="flex flex-col justify-between items-start">
                <Label className="font-semibold">Select Services <span className="text-red-500">*</span></Label>
                <div className="text-xs text-muted-foreground">
                  Note: Custom services can be added after creating the quotation
                </div>
              </div>
              <div className="grid gap-2">
                <Input
                  placeholder="Search services..."
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-3 custom-scrollbar rounded-md">
                {services
                  .filter(
                    (service) =>
                      service.name
                        .toLowerCase()
                        .includes(serviceSearchQuery.toLowerCase()) ||
                      service.description
                        .toLowerCase()
                        .includes(serviceSearchQuery.toLowerCase())
                  )
                  .map((service) => (
                    <div
                      key={service.id}
                      className="flex items-start space-x-3 p-3 border rounded-lg"
                    >
                      <Checkbox
                        className="border-black"
                        checked={selectedServiceIds.includes(
                          service.id.toString()
                        )}
                        onCheckedChange={() =>
                          handleServiceToggle(service.id.toString())
                        }
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
                            RM{formatNumber(service.basePrice)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>


            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="font-semibold">Discount: </span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.10"
                  value={quotationForm.discountValue}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    const maxValue =
                      quotationForm.discountType === "percentage"
                        ? 100
                        : totalPrice;

                    if (value > maxValue) {
                      toast({
                        title: "Validation Error",
                        description: `Discount cannot exceed ${
                          quotationForm.discountType === "percentage"
                            ? "100%"
                            : `RM${formatNumber(totalPrice)}`
                        }`,
                        variant: "destructive",
                      });
                      setQuotationForm((prev) => ({
                        ...prev,
                        discountValue: "",
                      }));
                      return;
                    }

                    setQuotationForm((prev) => ({
                      ...prev,
                      discountValue: e.target.value,
                    }));
                  }}
                  placeholder="0.00"
                  className="w-32"
                />
                <Select
                  value={quotationForm.discountType}
                  onValueChange={(value: "percentage" | "fixed") =>
                    setQuotationForm((prev) => ({
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

            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="font-semibold">Monthly Price:</span>
              <div className="text-right">
                {quotationForm.discountValue &&
                parseFloat(quotationForm.discountValue) > 0 ? (
                  <div>
                    <span className="text-sm text-muted-foreground line-through">
                      RM{formatNumber(totalPrice)}
                    </span>
                    <br />
                    <span className="text-2xl font-bold text-green-600">
                      RM{formatNumber(discountedTotal)}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      Discount: RM {formatNumber(discountAmount)}
                    </div>
                  </div>
                ) : (
                  <span className="text-2xl font-bold">
                    RM{formatNumber(totalPrice)}
                  </span>
                )}
              </div>
            </div>

          </div>
          <div className="flex justify-end space-x-2 sticky bottom-0 bg-background pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleCreateQuotation("draft")}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save as Draft"}
            </Button>
            <Button 
              onClick={handleCreateQuotationClick}
              disabled={isSaving}
            >
              {isSaving ? "Processing..." : "Create Quotation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quotation Status</DialogTitle>
          <DialogDescription>
            How would you like to save this quotation?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 border-2 border-red-300 rounded-lg bg-red-50">
            <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
              <span className="text-lg">⚠️</span> Final Quotation
            </h4>
            <div className="space-y-2 text-sm text-red-800">
              <p className="font-medium">
                Save as final quotation cannot be edited further. You can link a project whenever you want from the quotation card.
              </p>
              <p className="font-semibold text-red-900 border-t border-red-200 pt-2 mt-2">
                ⚠️ Important: Once finalized, you CANNOT add custom services anymore.
              </p>
            </div>
          </div>
          <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
            <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <span className="text-lg">ℹ️</span> Draft Quotation
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                Save as draft. You can continue editing this quotation later.
              </p>
              <p className="font-semibold text-blue-900 border-t border-blue-200 pt-2 mt-2">
                ✓ You can still add custom services to draft quotations.
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Project linking is optional for draft quotations.
              </p>
            </div>
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
            variant="secondary"
            onClick={() => {
              setShowConfirmationDialog(false);
              handleCreateQuotation("draft");
            }}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            onClick={() => {
              setShowConfirmationDialog(false);
              handleCreateQuotation("final");
            }}
            disabled={isSaving}
          >
            Save as Final
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
            A project must be linked to create a final quotation. Please select an existing project or create a new one.
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
                    ? formatLocalDate(new Date(projectData.startDate)) 
                    : "",
                  endDate: projectData.endDate 
                    ? formatLocalDate(new Date(projectData.endDate)) 
                    : "",
                  priority: "low", // Default priority for existing projects (projects don't have priority field)
                });
              }
            }}
            onNewProjectDataChange={setNewProjectData}
            onModeChange={setProjectMode}
            mode={projectMode}
            currentUserId={enhancedUser?.id || ""}
            clientId={quotationForm.clientId}
            clientName={quotationForm.selectedClientName || quotationForm.newClient?.name || ""}
          />
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowProjectSelectionDialog(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (projectMode === "new" && !newProjectData.name) {
                toast({
                  title: "Validation Error",
                  description: "Please enter a project name.",
                  variant: "destructive",
                });
                return;
              }
              if (projectMode === "existing" && !selectedProjectId) {
                toast({
                  title: "Validation Error",
                  description: "Please select a project.",
                  variant: "destructive",
                });
                return;
              }
              setShowProjectSelectionDialog(false);
              handleCreateQuotation("final");
            }}
            disabled={isSaving || (projectMode === "existing" ? !selectedProjectId : !newProjectData.name)}
          >
            {isSaving ? "Creating..." : "Create Final Quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

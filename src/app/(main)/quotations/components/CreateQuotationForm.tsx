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
import { createQuotation } from "../action";
import { getAllServices } from "../../services/action";
import type { Services } from "@prisma/client";
import { useSession } from "../../contexts/SessionProvider";
import { QuotationFormData } from "../types";
import { calculateGrandTotal } from "../utils";
import ClientSelection from "./ClientSelection";
import ProjectSelection from "./ProjectSelection";

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
  const [services, setServices] = useState<Services[]>([]);
  const [quotationForm, setQuotationForm] = useState<QuotationFormData>({
    name: "",
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
      membershipType: "",
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
    name: quotationForm.name,
    description: quotationForm.description,
    startDate: quotationForm.startDate ? new Date(quotationForm.startDate).toISOString().split('T')[0] : "",
    endDate: quotationForm.startDate && quotationForm.duration ? 
      new Date(new Date(quotationForm.startDate).setMonth(new Date(quotationForm.startDate).getMonth() + parseInt(quotationForm.duration))).toISOString().split('T')[0] : "",
    priority: "low"
  });


  useEffect(() => {
    fetchServices();
  }, []);

  // Update newProjectData when quotationForm changes
  useEffect(() => {
    setNewProjectData({
      name: quotationForm.name,
      description: quotationForm.description,
      startDate: quotationForm.startDate ? new Date(quotationForm.startDate).toISOString().split('T')[0] : "",
      endDate: quotationForm.startDate && quotationForm.duration ? 
        new Date(new Date(quotationForm.startDate).setMonth(new Date(quotationForm.startDate).getMonth() + parseInt(quotationForm.duration))).toISOString().split('T')[0] : "",
      priority: "low"
    });
  }, [quotationForm.name, quotationForm.description, quotationForm.startDate, quotationForm.duration]);

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
      name: quotationForm.name,
      description: quotationForm.description,
      selectedServiceIds: selectedServiceIds,
      selectedServiceIdsLength: selectedServiceIds.length,
      nameEmpty: !quotationForm.name,
      descriptionEmpty: !quotationForm.description,
      servicesEmpty: selectedServiceIds.length === 0,
    });

    if (
      !quotationForm.name ||
      !quotationForm.description ||
      selectedServiceIds.length === 0
    ) {
      alert("Please fill all fields and select at least one service.");
      return false;
    }

    // Validate client information
    if (clientMode === "existing" && !quotationForm.clientId) {
      alert("Please select a client.");
      return false;
    }

    if (clientMode === "new") {
      if (!quotationForm.newClient?.name || !quotationForm.newClient?.email) {
        alert(
          "Please fill in the required client information (name and email)."
        );
        return false;
      }
    }

    if (!enhancedUser.id) {
      alert("User not authenticated. Please try logging in again.");
      return false;
    }

    return true;
  };

  const handleCreateQuotation = async (workflowStatus: "draft" | "in_review" | "final" | "accepted" | "rejected" = "draft") => {
    if (!validateForm()) {
      return;
    }

    try {
      let projectId: number | undefined;

      // For final quotations, handle project creation/linking
      if (workflowStatus === "final") {
        if (projectMode === "new") {
          // Create new project first
          if (!newProjectData.name) {
            alert("Please enter a project name.");
            return;
          }

          const clientId = clientMode === "existing" ? quotationForm.clientId : undefined;
          const clientName = clientMode === "existing" ? quotationForm.selectedClientName : quotationForm.newClient?.name || "";

          if (!clientId) {
            alert("Cannot create project: No client assigned. Please assign a client first.");
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
            clientId: clientId,
            clientName: clientName,
          });
          projectId = newProject.id;
        } else {
          // Use selected existing project
          if (!selectedProjectId) {
            alert("Please select a project.");
            return;
          }
          projectId = selectedProjectId;
        }
      }

      // Calculate grand total (monthly price × duration)
      const grandTotal = quotationForm.duration
        ? calculateGrandTotal(discountedTotal, parseInt(quotationForm.duration))
        : discountedTotal;

      await createQuotation({
        name: quotationForm.name,
        description: quotationForm.description,
        totalPrice: grandTotal, // Store grand total in totalPrice
        serviceIds: selectedServiceIds,
        createdById: enhancedUser.id,
        workflowStatus: workflowStatus, // Add workflow status parameter
        paymentStatus: "unpaid", // Default to unpaid for new quotations
        clientId:
          clientMode === "existing" ? quotationForm.clientId : undefined,
        newClient: clientMode === "new" ? quotationForm.newClient : undefined,
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
    } catch (error) {
      console.error("Error creating quotation:", error);
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
      name: "",
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
        membershipType: "",
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
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[70vw] max-w-[70vw] max-h-[90vh] rounded-lg"
        showCloseButton={false}
      >
        <div className="custom-scrollbar overflow-y-auto max-h-[calc(90vh-4rem)] pr-2">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Create New Quotation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quotation-name">Quotation Name</Label>
              <Input
                id="quotation-name"
                value={quotationForm.name}
                onChange={(e) =>
                  setQuotationForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Enter quotation name"
              />
            </div>

            {/* Client Selection */}
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

            <div className="grid gap-2">
              <Label htmlFor="quotation-description">Description</Label>
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
                <Label className="font-semibold">Select Services</Label>
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
                            RM{service.basePrice.toFixed(2)}
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
                      alert(
                        `Discount cannot exceed ${
                          quotationForm.discountType === "percentage"
                            ? "100%"
                            : `RM${totalPrice.toFixed(2)}`
                        }`
                      );
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
                      RM{totalPrice.toFixed(2)}
                    </span>
                    <br />
                    <span className="text-2xl font-bold text-green-600">
                      RM{discountedTotal.toFixed(2)}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      Discount: RM {discountAmount.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <span className="text-2xl font-bold">
                    RM{totalPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Grand Total Section */}
            {quotationForm.duration &&
              parseFloat(quotationForm.duration) > 0 && (
                <div className="flex justify-between items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <span className="font-semibold text-blue-800">
                      Grand Total ({quotationForm.duration} months):
                    </span>
                    <div className="text-xs text-blue-600 mt-1">
                      {discountedTotal.toFixed(2)} × {quotationForm.duration}{" "}
                      months
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-blue-800">
                      RM
                      {(
                        discountedTotal * parseFloat(quotationForm.duration)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
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
            >
              Save as Draft
            </Button>
            <Button onClick={handleCreateQuotationClick}>
              Create Quotation
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
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold text-green-600 mb-2">Final Quotation</h4>
            <p className="text-sm text-muted-foreground">
              Save as final quotation. This will be sent to the client and cannot be edited further. You will be prompted to select a project next.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold text-blue-600 mb-2">Draft Quotation</h4>
            <p className="text-sm text-muted-foreground">
              Save as draft. You can continue editing this quotation later.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Project linking is optional for draft quotations.
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
            variant="secondary"
            onClick={() => {
              setShowConfirmationDialog(false);
              handleCreateQuotation("draft");
            }}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => {
              setShowConfirmationDialog(false);
              setShowProjectSelectionDialog(true);
            }}
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
            onProjectSelect={(projectId, projectName) => {
              setSelectedProjectId(projectId);
              setSelectedProjectName(projectName);
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
                alert("Please enter a project name.");
                return;
              }
              if (projectMode === "existing" && !selectedProjectId) {
                alert("Please select a project.");
                return;
              }
              setShowProjectSelectionDialog(false);
              handleCreateQuotation("final");
            }}
            disabled={projectMode === "existing" ? !selectedProjectId : !newProjectData.name}
          >
            Create Final Quotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

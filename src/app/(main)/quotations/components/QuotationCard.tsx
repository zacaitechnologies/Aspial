"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  AlertTriangle,
  User,
  Mail,
  Building2,
  Plus,
  Info,
  Briefcase,
  Download,
} from "lucide-react";
import { QuotationWithServices, workflowStatusOptions, paymentStatusOptions } from "../types";
import { useSession } from "../../contexts/SessionProvider";
import {
  getClientById,
  updateClientMembershipStatus,
  getCustomServicesByQuotationId,
} from "../action";
import MembershipStatusDialog from "./MembershipStatusDialog";
import CustomServiceDialog from "./CustomServiceDialog";
import ProjectSelection from "./ProjectSelection";
import { generateQuotationPDF } from "../utils/pdfExport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuotationCardProps {
  quotation: QuotationWithServices;
  onEdit: (quotation: QuotationWithServices) => void;
  onDelete: (quotationId: string) => void;
  onRefresh?: () => void;
}

export default function QuotationCard({
  quotation,
  onEdit,
  onDelete,
  onRefresh,
}: QuotationCardProps) {
  const router = useRouter();
  const { enhancedUser } = useSession();
  const [isMembershipDialogOpen, setIsMembershipDialogOpen] = useState(false);
  const [isCustomServiceDialogOpen, setIsCustomServiceDialogOpen] =
    useState(false);
  const [isProjectSelectionDialogOpen, setIsProjectSelectionDialogOpen] = useState(false);
  const [customServices, setCustomServices] = useState<any[]>([]);
  const [clientData, setClientData] = useState<{
    id: string;
    name: string;
    company?: string;
    membershipType: string;
  } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");
  const [projectMode, setProjectMode] = useState<"existing" | "new">("existing");
  const [newProjectData, setNewProjectData] = useState<{
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    priority: "low" | "medium" | "high";
  }>({
    name: quotation.name,
    description: quotation.description,
    startDate: quotation.startDate ? new Date(quotation.startDate).toISOString().split('T')[0] : "",
    endDate: quotation.endDate ? new Date(quotation.endDate).toISOString().split('T')[0] : "",
    priority: "low"
  });

  // Fetch custom services when component mounts
  useEffect(() => {
    fetchCustomServices();
  }, [quotation.id]);

  const fetchCustomServices = async () => {
    try {
      const services = await getCustomServicesByQuotationId(quotation.id);
      setCustomServices(services);
    } catch (error) {
      console.error("Failed to fetch custom services:", error);
    }
  };
  const getWorkflowStatusBadge = (status: string) => {
    const statusConfig = workflowStatusOptions.find((opt) => opt.value === status);
    return (
      <Badge
        variant={statusConfig?.color || "secondary"}
        className={statusConfig?.className}
      >
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = paymentStatusOptions.find((opt) => opt.value === status);
    return (
      <Badge
        variant={statusConfig?.color || "secondary"}
        className={statusConfig?.className}
      >
        {statusConfig?.label || status}
      </Badge>
    );
  };

  // Calculate grand total including approved custom services
  const calculateGrandTotal = () => {
    // quotation.totalPrice is already the grand total for entire duration (fixed services)
    const fixedServicesTotal = quotation.totalPrice;
    
    // Custom services prices are per month, so multiply by duration
    const customServicesMonthly = customServices
      .filter((cs) => cs.status === "APPROVED")
      .reduce((sum, cs) => sum + cs.price, 0);
    
    const duration = quotation.duration || 1;
    const customServicesTotal = customServicesMonthly * duration;
    
    return fixedServicesTotal + customServicesTotal;
  };

  const hasProject = quotation.project !== null;
  const isProjectCancelled = quotation.project?.status === "cancelled";
  const isFinalQuotation = quotation.workflowStatus === "final";
  const isEditableQuotation = quotation.workflowStatus === "draft" || quotation.workflowStatus === "accepted" || quotation.workflowStatus === "rejected";
  const handleDelete = () => {
    // For final quotations, prevent deletion
    if (isFinalQuotation) {
      alert("Cannot delete final quotations.");
      return;
    }
    
    // For quotations with project, show confirmation
    if (hasProject) {
      const confirmed = confirm(
        "This quotation has an associated project. Deleting the quotation will also delete the project and all its time entries. Are you sure you want to continue?"
      );
      if (confirmed) {
        onDelete(quotation.id.toString());
      }
    } else {
      onDelete(quotation.id.toString());
    }
  };

  const handleCreateProject = () => {
    // Reset form data with quotation info
    setNewProjectData({
      name: quotation.name,
      description: quotation.description,
      startDate: quotation.startDate ? new Date(quotation.startDate).toISOString().split('T')[0] : "",
      endDate: quotation.endDate ? new Date(quotation.endDate).toISOString().split('T')[0] : "",
      priority: "low"
    });
    setSelectedProjectId("");
    setSelectedProjectName("");
    setProjectMode("existing");
    setIsProjectSelectionDialogOpen(true);
  };

  const createProjectAndRefresh = async (quotation: QuotationWithServices) => {
    try {
      // Import the createProject action
      const { createProject } = await import("../../projects/action");

      // Validate that we have a valid clientId
      if (!quotation.clientId || quotation.clientId.trim() === "") {
        alert("Cannot create project: Quotation does not have a valid client assigned.");
        return;
      }

      // Create project data from quotation
      const projectData = {
        name: quotation.name,
        description: quotation.description,
        clientId: quotation.clientId,
        quotationId: quotation.id,
        startDate: quotation.startDate,
        endDate: quotation.endDate,
        createdBy: enhancedUser?.id || "",
      };

      // Create the project
      await createProject(projectData);

      // Show success message
      alert("Project created successfully!");

      window.location.reload();
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create project. Please try again.";
      alert(errorMessage);
    }
  };

  const handleMembershipUpgrade = async () => {
    if (!clientData) return;

    try {
      // Update client membership status to MEMBER
      await updateClientMembershipStatus(clientData.id, "MEMBER");

      // Now create the project
      await createProjectAndRefresh(quotation);

      // Close dialog
      setIsMembershipDialogOpen(false);
      setClientData(null);
    } catch (error) {
      console.error("Error upgrading membership:", error);
      alert("Failed to upgrade membership status. Please try again.");
    }
  };

  const handleMembershipCancel = () => {
    // Create project without upgrading membership
    createProjectAndRefresh(quotation);
    setIsMembershipDialogOpen(false);
    setClientData(null);
  };

  const handleProjectSelection = (projectId: number, projectName: string, projectData?: any) => {
    setSelectedProjectId(projectId.toString());
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
  };

  const handleLinkProject = async () => {
    try {
      let projectId: number;

      if (projectMode === "new") {
        // Create new project first
        if (!newProjectData.name) {
          alert("Please enter a project name.");
          return;
        }

        // Get client ID from quotation.clientId or quotation.Client.id
        const clientId = quotation.clientId || quotation.Client?.id;
        
        if (!clientId) {
          alert("Cannot create project: Quotation does not have a client assigned. Please assign a client to the quotation first.");
          return;
        }

        const { createProject } = await import("../../projects/action");
        const newProject = await createProject({
          name: newProjectData.name,
          description: newProjectData.description,
          createdBy: enhancedUser?.id || "",
          startDate: newProjectData.startDate ? new Date(newProjectData.startDate) : undefined,
          endDate: newProjectData.endDate ? new Date(newProjectData.endDate) : undefined,
          priority: newProjectData.priority,
          clientId: clientId,
          clientName: quotation.Client?.name || "",
        });
        projectId = newProject.id;
      } else {
        // Use selected existing project
        if (!selectedProjectId) {
          alert("Please select a project first.");
          return;
        }
        projectId = parseInt(selectedProjectId);
      }

      // Use a single transaction to link project and update quotation status
      const { linkProjectAndUpdateQuotationStatus } = await import("../action");
      await linkProjectAndUpdateQuotationStatus(quotation.id, projectId);
      
      alert("Project linked successfully! Quotation status changed to final.");
      setIsProjectSelectionDialogOpen(false);
      
      // Refresh the page to show updated project status
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error linking project:", error);
      alert("Failed to link project. Please try again.");
    }
  };

  return (
    <Card className="card flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle 
              className={`text-lg line-clamp-2 mb-2 ${isFinalQuotation ? 'text-gray-700' : ''}`}
              title={quotation.name}
            >
              {quotation.name}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {getWorkflowStatusBadge(quotation.workflowStatus)}
              {getPaymentStatusBadge(quotation.paymentStatus)}
              {isProjectCancelled && (
                <Badge variant="destructive" className="bg-red-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Project Cancelled
                </Badge>
              )}
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Grand Total: RM{calculateGrandTotal().toFixed(2)}
              </Badge>
            </div>
          </div>
          <div className="flex space-x-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/quotations/${quotation.id}`)}
              className="text-purple-600 hover:text-purple-700"
              title="View Details"
            >
              <Info className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={isFinalQuotation ? undefined : () => setIsCustomServiceDialogOpen(true)}
              disabled={isFinalQuotation}
              className={isFinalQuotation ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-700"}
              title={isFinalQuotation ? "Cannot add custom services to final quotations" : "Add Custom Service"}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(quotation)}
              title={
                isFinalQuotation
                  ? "Edit final quotation (limited to payment status only)"
                  : "Edit Quotation"
              }
            >
              <Edit className="w-4 h-4" />
            </Button>

            {/* Create Project Button - Show for accepted/rejected quotations without project */}
            {isEditableQuotation && !hasProject && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCreateProject}
                className="text-green-600 hover:text-green-700"
                title="Create Project"
              >
                <Briefcase className="w-4 h-4" />
              </Button>
            )}

            {/* Export PDF Button - Show only for final quotations */}
            {quotation.workflowStatus === "final" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => await generateQuotationPDF(quotation)}
                className="text-blue-600 hover:text-blue-700"
                title="Export as PDF"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={isFinalQuotation ? undefined : handleDelete}
              disabled={isFinalQuotation}
              className={isFinalQuotation ? "text-gray-400 cursor-not-allowed" : ""}
              title={
                isFinalQuotation
                  ? "Cannot delete final quotations"
                  : hasProject
                  ? "Delete quotation (will also delete associated project)"
                  : "Delete quotation"
              }
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {/* Client Information */}
        {quotation.Client && (
          <div className="mb-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Client Information
            </p>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{quotation.Client.name}</p>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {quotation.Client.email}
                </span>
                {quotation.Client.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {quotation.Client.company}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Custom Service Status Badges */}
        {customServices.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Custom Service:</p>
            <div className="flex flex-wrap gap-2">
              {customServices.some((cs) => cs.status === "PENDING") && (
                <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
                  {customServices.filter((cs) => cs.status === "PENDING").length}{" "}
                  Pending
                </Badge>
              )}
              {customServices.some((cs) => cs.status === "APPROVED") && (
                <Badge className="bg-green-600 text-white hover:bg-green-700">
                  {customServices.filter((cs) => cs.status === "APPROVED").length}{" "}
                  Approved
                </Badge>
              )}
              {customServices.some((cs) => cs.status === "REJECTED") && (
                <Badge variant="destructive">
                  {customServices.filter((cs) => cs.status === "REJECTED").length}{" "}
                  Rejected
                </Badge>
              )}
            </div>
          </div>
        )}

        {quotation.discountValue && (
          <div className="mt-2">
            <p className="text-sm text-black">
              Discount: {quotation.discountValue}
              {quotation.discountType === "percentage" ? "%" : "RM"}
            </p>
          </div>
        )}

        <div className="mt-3 space-y-1">
          <p className="text-xs text-black">
            Created on {new Date(quotation.created_at).toLocaleDateString()}
          </p>
          {quotation.createdBy && (
            <p className="text-xs text-black flex items-center gap-1">
              Created by {quotation.createdBy.firstName} {quotation.createdBy.lastName}
            </p>
          )}
        </div>
      </CardContent>

      {/* Membership Status Dialog */}
      {clientData && (
        <MembershipStatusDialog
          isOpen={isMembershipDialogOpen}
          onOpenChange={setIsMembershipDialogOpen}
          clientName={clientData.name}
          clientCompany={clientData.company}
          onConfirm={handleMembershipUpgrade}
          onCancel={handleMembershipCancel}
        />
      )}

      {/* Custom Service Dialog */}
      <CustomServiceDialog
        isOpen={isCustomServiceDialogOpen}
        onOpenChange={setIsCustomServiceDialogOpen}
        onServiceCreated={(newService) => {
          // Refresh custom services list
          fetchCustomServices();
          // Refresh the quotation data if callback is provided
          if (onRefresh) {
            onRefresh();
          }
          setIsCustomServiceDialogOpen(false);
        }}
        quotationId={quotation.id}
        createdById={enhancedUser?.id}
      />

      {/* Project Selection Dialog */}
      <Dialog open={isProjectSelectionDialogOpen} onOpenChange={setIsProjectSelectionDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Project for Quotation</DialogTitle>
            <DialogDescription>
              Please select an existing project or create a new one to link to this quotation.
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
              currentUserId={enhancedUser?.id || ""}
              clientId={quotation.clientId || ""}
              clientName={quotation.Client?.name || ""}
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsProjectSelectionDialogOpen(false)}>
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
                handleLinkProject();
              }}
              disabled={projectMode === "existing" ? !selectedProjectId : !newProjectData.name}
            >
              Link Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

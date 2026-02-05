"use client";

import { useState, useEffect, useCallback } from "react";
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
  Briefcase,
  Download,
  MoreVertical,
  Loader2,
  Send,
  History,
  Eye,
  Unlink,
} from "lucide-react";
import { formatNumber } from "@/lib/format-number";
import { QuotationWithServices, workflowStatusOptions, paymentStatusOptions } from "../types";
import { useSession } from "../../contexts/SessionProvider";
import {
  getClientById,
  updateClientMembershipStatus,
  updateQuotationProjectId,
} from "../action";
import MembershipStatusDialog from "./MembershipStatusDialog";
import CustomServiceDialog from "./CustomServiceDialog";
import ProjectSelection from "./ProjectSelection";
import SendQuotationDialog from "./SendQuotationDialog";
import EmailHistoryDialog from "./EmailHistoryDialog";
import { generateQuotationPDF } from "../utils/pdfExport";
import CreateInvoiceForm from "../../invoices/components/CreateInvoiceForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { formatLocalDate } from "@/lib/date-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuotationCardProps {
  quotation: QuotationWithServices;
  onEdit: (quotation: QuotationWithServices) => void;
  onDelete: (quotationId: string) => void;
  onRefresh?: () => void;
  isAdmin: boolean;
}

export default function QuotationCard({
  quotation,
  onEdit,
  onDelete,
  onRefresh,
  isAdmin,
}: QuotationCardProps) {
  const router = useRouter();
  const { enhancedUser } = useSession();
  const [isMembershipDialogOpen, setIsMembershipDialogOpen] = useState(false);
  const [isCustomServiceDialogOpen, setIsCustomServiceDialogOpen] =
    useState(false);
  const [isProjectSelectionDialogOpen, setIsProjectSelectionDialogOpen] = useState(false);
  const [clientData, setClientData] = useState<{
    id: string;
    name: string;
    company?: string;
    membershipType: string;
  } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");
  const [selectedProjectData, setSelectedProjectData] = useState<{
    id: number;
    name: string;
    description?: string | null;
    status?: string;
    startDate?: Date | null;
    endDate?: Date | null;
  } | null>(null);
  const [projectMode, setProjectMode] = useState<"existing" | "new">("existing");
  const [isLinkingProject, setIsLinkingProject] = useState(false);
  const [isSendQuotationDialogOpen, setIsSendQuotationDialogOpen] = useState(false);
  const [isEmailHistoryDialogOpen, setIsEmailHistoryDialogOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isCreateInvoiceDialogOpen, setIsCreateInvoiceDialogOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState<{
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    priority: "low" | "medium" | "high";
  }>({
    name: quotation.name,
    description: quotation.description,
    startDate: quotation.startDate ? formatLocalDate(new Date(quotation.startDate)) : "",
    endDate: quotation.endDate ? formatLocalDate(new Date(quotation.endDate)) : "",
    priority: "low"
  });

  // Use customServices from quotation data (already fetched)
  const customServices = quotation.customServices || [];
  const getWorkflowStatusBadge = useCallback((status: string) => {
    const statusConfig = workflowStatusOptions.find((opt) => opt.value === status);
    return (
      <Badge
        variant={statusConfig?.color || "secondary"}
      >
        {statusConfig?.label || status}
      </Badge>
    );
  }, []);

  const getPaymentStatusBadge = useCallback((status: string) => {
    const statusConfig = paymentStatusOptions.find((opt) => opt.value === status);
    return (
      <Badge
        variant={statusConfig?.color || "secondary"}
      >
        {statusConfig?.label || status}
      </Badge>
    );
  }, []);

  // Grand total: totalPrice is stored when creating/editing and already includes
  // standard services (with discount) + approved custom services. Do not add approved custom again.
  const grandTotal = quotation.totalPrice;

  const [linkedProject, setLinkedProject] = useState<QuotationWithServices["project"]>(quotation.project);
  const hasProject = linkedProject !== null;
  const isProjectCancelled = linkedProject?.status === "cancelled";
  useEffect(() => {
    setLinkedProject(quotation.project);
  }, [quotation.project]);

  const normalizeLinkedProject = useCallback(
    (project: {
      id: number;
      name: string;
      description?: string | null;
      status?: string;
      startDate?: Date | null;
      endDate?: Date | null;
      created_at?: Date;
      updated_at?: Date;
    }): QuotationWithServices["project"] => ({
      id: project.id,
      name: project.name,
      description: project.description ?? undefined,
      status: project.status ?? "planning",
      startDate: project.startDate ?? undefined,
      endDate: project.endDate ?? undefined,
      created_at: project.created_at ?? new Date(),
      updated_at: project.updated_at ?? new Date(),
    }),
    []
  );
  const isFinalQuotation = quotation.workflowStatus === "final";
  const isDraftQuotation = quotation.workflowStatus === "draft";
  const isEditableQuotation = quotation.workflowStatus === "draft" || 
    quotation.workflowStatus === "accepted" || 
    quotation.workflowStatus === "rejected";
  const isCreator = enhancedUser?.id === quotation.createdBy?.supabase_id;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUnlinkProjectDialogOpen, setIsUnlinkProjectDialogOpen] = useState(false);
  
  // Only allow deletion if draft and no project
  const canDelete = isDraftQuotation && !hasProject;
  
  const handleDelete = useCallback(() => {
    if (!canDelete) {
      if (!isDraftQuotation) {
        toast({
          title: "Cannot delete",
          description: "Only draft quotations can be deleted.",
          variant: "destructive",
        });
      } else if (hasProject) {
        toast({
          title: "Cannot delete",
          description: "Cannot delete a quotation that is linked to a project. Unlink the project first.",
          variant: "destructive",
        });
      }
      return;
    }
    
    setIsDeleteDialogOpen(true);
  }, [canDelete, isDraftQuotation, hasProject]);

  const confirmDelete = useCallback(() => {
    onDelete(quotation.id.toString());
    setIsDeleteDialogOpen(false);
  }, [onDelete, quotation.id]);

  const handleCreateProject = useCallback(() => {
    // Reset form data with quotation info
    setNewProjectData({
      name: quotation.name,
      description: quotation.description,
      startDate: quotation.startDate ? formatLocalDate(new Date(quotation.startDate)) : "",
      endDate: quotation.endDate ? formatLocalDate(new Date(quotation.endDate)) : "",
      priority: "low"
    });
    setSelectedProjectId("");
    setSelectedProjectName("");
    setSelectedProjectData(null);
    setProjectMode("existing");
    setIsProjectSelectionDialogOpen(true);
  }, [quotation.name, quotation.description, quotation.startDate, quotation.endDate]);

  const createProjectAndRefresh = async (quotation: QuotationWithServices) => {
    try {
      // Import the createProject action
      const { createProject } = await import("../../projects/action");

      // Validate that we have a valid clientId
      if (!quotation.clientId || quotation.clientId.trim() === "") {
        toast({
          title: "Validation Error",
          description: "Cannot create project: Quotation does not have a valid client assigned.",
          variant: "destructive",
        });
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
      const newProject = await createProject(projectData);

      // Show success message
      toast({
        title: "Success",
        description: "Project created successfully!",
      });

      // Update local UI immediately (avoid slow full refresh)
      setLinkedProject(normalizeLinkedProject(newProject));
      setIsProjectSelectionDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create project. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to upgrade membership status. Please try again.",
        variant: "destructive",
      });
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
    setSelectedProjectData(projectData ?? null);
    
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
  };

  const handleLinkProject = async () => {
    setIsLinkingProject(true);
    try {
      let projectId: number;

      if (projectMode === "new") {
        // Create new project first
        if (!newProjectData.name) {
          toast({
            title: "Validation Error",
            description: "Please enter a project name.",
            variant: "destructive",
          });
          setIsLinkingProject(false);
          return;
        }

        // Get client ID from quotation.clientId or quotation.Client.id
        const clientId = quotation.clientId || quotation.Client?.id;
        
        if (!clientId) {
          toast({
            title: "Validation Error",
            description: "Cannot create project: Quotation does not have a client assigned. Please assign a client to the quotation first.",
            variant: "destructive",
          });
          setIsLinkingProject(false);
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
          quotationId: quotation.id,
        });
        projectId = newProject.id;
        setLinkedProject(normalizeLinkedProject(newProject));
        // Project already linked via createProject (no extra update needed)
      } else {
        // Use selected existing project
        if (!selectedProjectId) {
          toast({
            title: "Validation Error",
            description: "Please select a project first.",
            variant: "destructive",
          });
          setIsLinkingProject(false);
          return;
        }
        projectId = parseInt(selectedProjectId);
        if (selectedProjectData) {
          setLinkedProject(
            normalizeLinkedProject({
              id: selectedProjectData.id,
              name: selectedProjectData.name,
              description: selectedProjectData.description,
              status: selectedProjectData.status,
              startDate: selectedProjectData.startDate ?? undefined,
              endDate: selectedProjectData.endDate ?? undefined,
            })
          );
        } else {
          setLinkedProject(
            normalizeLinkedProject({
              id: projectId,
              name: selectedProjectName,
              status: "planning",
            })
          );
        }
      }

      // Link project without changing status (skip if created new project)
      if (projectMode === "existing") {
        await updateQuotationProjectId(quotation.id, projectId);
      }
      
      toast({
        title: "Success",
        description: "Project linked successfully!",
      });
      setIsProjectSelectionDialogOpen(false);
      
      // Refresh cache in background (avoid blocking UI)
      onRefresh?.();
    } catch (error) {
      console.error("Error linking project:", error);
      toast({
        title: "Error",
        description: "Failed to link project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLinkingProject(false);
    }
  };

  const handleUnlinkProject = async () => {
    if (!linkedProject) {
      return;
    }

    setIsLinkingProject(true);
    try {
      // Set projectId to null to unlink
      await updateQuotationProjectId(quotation.id, null);
      
      toast({
        title: "Success",
        description: "Project unlinked successfully!",
      });
      
      setLinkedProject(null);
      onRefresh?.();
    } catch (error) {
      console.error("Error unlinking project:", error);
      toast({
        title: "Error",
        description: "Failed to unlink project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLinkingProject(false);
    }
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow duration-200 border-l-2 pt-0 pb-0"
      style={{ borderLeftColor: isFinalQuotation ? '#10b981' : '#3b82f6' }}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Left Section - Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle 
                className={`text-base font-semibold truncate ${isFinalQuotation ? 'text-gray-700' : 'text-gray-900'}`}
                title={quotation.name}
              >
                {quotation.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                {getWorkflowStatusBadge(quotation.workflowStatus)}
                {getPaymentStatusBadge(quotation.paymentStatus)}
                {isProjectCancelled && (
                  <Badge variant="destructive" className="bg-red-600 text-xs px-1.5 py-0">
                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                    Cancelled
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Client and Metadata - Single Line */}
            <div className="flex items-center gap-3 text-xs text-gray-600">
              {quotation.Client && (
                <>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="font-medium text-gray-900">{quotation.Client.name}</span>
                  </div>
                  <span className="text-gray-400">•</span>
                </>
              )}
              {quotation.discountValue && (
                <>
                  <span>Disc: <span className="font-medium">{quotation.discountValue}{quotation.discountType === "percentage" ? "%" : "RM"}</span></span>
                  <span className="text-gray-400">•</span>
                </>
              )}
              <span>{new Date(quotation.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              {quotation.createdBy && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>By {quotation.createdBy.firstName} {quotation.createdBy.lastName}</span>
                </>
              )}
              {customServices.length > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-1">
                    {customServices.some((cs) => cs.status === "PENDING") && (
                      <Badge className="bg-yellow-500 text-white text-xs px-1 py-0 h-4">
                        {customServices.filter((cs) => cs.status === "PENDING").length}P
                      </Badge>
                    )}
                    {customServices.some((cs) => cs.status === "APPROVED") && (
                      <Badge className="bg-green-600 text-white text-xs px-1 py-0 h-4">
                        {customServices.filter((cs) => cs.status === "APPROVED").length}A
                      </Badge>
                    )}
                    {customServices.some((cs) => cs.status === "REJECTED") && (
                      <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                        {customServices.filter((cs) => cs.status === "REJECTED").length}R
                      </Badge>
                    )}
                  </div>
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

          {/* Right Section - Fixed Width for Alignment */}
          <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Balance - Compact (only for Final status) */}
            {quotation.balance !== undefined && isFinalQuotation && (
              <div className="text-right">
                <div
                  className={`rounded px-3 py-1.5 border ${
                    quotation.balance === 0
                      ? "bg-linear-to-br from-green-50 to-emerald-50 border-green-200"
                      : "bg-linear-to-br from-amber-50 to-orange-50 border-amber-200"
                  }`}
                >
                  <p className="text-[10px] text-gray-600 mb-0.5">Balance</p>
                  <p
                    className={`text-lg font-bold ${
                      quotation.balance === 0 ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    RM{formatNumber(quotation.balance)}
                  </p>
                </div>
              </div>
            )}
            {/* Grand Total - Compact */}
            <div className="text-right">
              <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded px-3 py-1.5 border border-blue-200">
                <p className="text-[10px] text-gray-600 mb-0.5">Total</p>
                <p className="text-lg font-bold text-blue-700">
                  RM{formatNumber(grandTotal)}
                </p>
              </div>
            </div>

            {/* Three Dot Dropdown Menu */}
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
                className="w-48"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    router.push(`/quotations/${quotation.id}`);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Quotation Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {(isCreator || isAdmin) && !isFinalQuotation && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsCustomServiceDialogOpen(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Service
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onEdit(quotation);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Quotation
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {(isCreator || isAdmin) && isFinalQuotation && (
                  <>
                    {isAdmin && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setIsCustomServiceDialogOpen(true);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="cursor-pointer"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Custom Service
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onEdit(quotation);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {isAdmin ? "Edit Quotation" : "Edit Payment Status"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {!hasProject && (isCreator || isAdmin) && !isDraftQuotation && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsProjectSelectionDialogOpen(true);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Link Project
                  </DropdownMenuItem>
                )}
                {hasProject && (isCreator || isAdmin) && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsUnlinkProjectDialogOpen(true);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="cursor-pointer text-red-600"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Unlink Project
                  </DropdownMenuItem>
                )}
                {quotation.workflowStatus === "final" && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsSendQuotationDialogOpen(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Quotation PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsEmailHistoryDialogOpen(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <History className="w-4 h-4 mr-2" />
                      Email History
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsExportingPDF(true);
                        try {
                          await generateQuotationPDF(quotation);
                          toast({
                            title: "Success",
                            description: "PDF exported successfully.",
                          });
                        } catch (error) {
                          console.error("Error exporting PDF:", error);
                          toast({
                            title: "Error",
                            description: "Failed to export PDF. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsExportingPDF(false);
                        }
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
                        e.stopPropagation();
                        e.preventDefault();
                        setIsCreateInvoiceDialogOpen(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invoice
                    </DropdownMenuItem>
                  </>
                )}
                {isCreator && !isFinalQuotation && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDelete();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Quotation
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
          // Refresh the quotation data if callback is provided
          if (onRefresh) {
            onRefresh();
          }
          setIsCustomServiceDialogOpen(false);
        }}
        quotationId={quotation.id}
        createdById={enhancedUser?.id}
      />

      {/* Send Quotation Dialog */}
      {quotation.workflowStatus === "final" && (
        <SendQuotationDialog
          isOpen={isSendQuotationDialogOpen}
          onOpenChange={setIsSendQuotationDialogOpen}
          quotationId={quotation.id}
          clientEmail={quotation.Client?.email || ""}
          onSuccess={() => {
            if (onRefresh) {
              onRefresh();
            }
          }}
        />
      )}

      {/* Email History Dialog */}
      {quotation.workflowStatus === "final" && (
        <EmailHistoryDialog
          isOpen={isEmailHistoryDialogOpen}
          onOpenChange={setIsEmailHistoryDialogOpen}
          quotationId={quotation.id}
        />
      )}

      {/* Create Invoice Dialog */}
      {quotation.workflowStatus === "final" && (
        <CreateInvoiceForm
          isOpen={isCreateInvoiceDialogOpen}
          onOpenChange={setIsCreateInvoiceDialogOpen}
          prefilledQuotationId={quotation.id}
          prefetchedQuotation={quotation}
          isAdminProp={isAdmin}
          onSuccess={() => {
            if (onRefresh) {
              onRefresh();
            }
          }}
        />
      )}

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
                handleLinkProject();
              }}
              disabled={isLinkingProject || (projectMode === "existing" ? !selectedProjectId : !newProjectData.name)}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Quotation"
        description="Are you sure you want to delete this quotation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Unlink Project Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isUnlinkProjectDialogOpen}
        onClose={() => setIsUnlinkProjectDialogOpen(false)}
        onConfirm={async () => {
          await handleUnlinkProject();
          setIsUnlinkProjectDialogOpen(false);
        }}
        title="Unlink Project"
        description="Are you sure you want to unlink this project from the quotation?"
        confirmText="Unlink"
        cancelText="Cancel"
        variant="warning"
        isLoading={isLinkingProject}
      />
    </Card>
  );
}

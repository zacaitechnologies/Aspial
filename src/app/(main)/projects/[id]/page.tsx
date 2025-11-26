"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ProjectWithQuotation } from "../types";
import { getProjectComplaints, reactivateProject } from "../action";
import { useSession } from "../../contexts/SessionProvider";
import { useProjectCache } from "../hooks/useProjectCache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import {
  ArrowLeft,
  Calendar,
  User,
  CheckSquare,
  Plus,
  Edit,
  Target,
  Package,
  AlertCircle,
  Trash2,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import ProjectCollaboratorsDialog from "../components/ProjectCollaboratorsDialog";
import { KanbanBoard } from "../components/ProjectKanbanBoard";
import CreateComplaintDialog from "../components/CreateComplaintDialog";
import EditComplaintDialog from "../components/EditComplaintDialog";
import { deleteComplaint } from "../action";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function ProjectPage() {
  const params = useParams();
  const { enhancedUser } = useSession();
  
  // Use cache hook for project data
  const { 
    project, 
    collaborators, 
    taskStats, 
    userPermission,
    isLoading: loading, 
    onRefresh 
  } = useProjectCache(enhancedUser?.id, params.id as string);
  
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "complaints">("overview");
  const [sortBy, setSortBy] = useState<"dueDate" | "createDate" | "priority">(
    "createDate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [complaints, setComplaints] = useState<any[]>([]);
  const [editingComplaint, setEditingComplaint] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteComplaintId, setDeleteComplaintId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [newProjectStatus, setNewProjectStatus] = useState<"planning" | "in_progress" | "on_hold">("in_progress");
  
  // Derived values from userPermission
  const isProjectOwner = userPermission?.isOwner || false;
  const isAdmin = userPermission?.isAdmin || false;
  
  // Check if project is cancelled
  const isProjectCancelled = project?.status === "cancelled";

  // Fetch complaints when project is loaded
  useEffect(() => {
    if (project?.id) {
      getProjectComplaints(project.id).then(setComplaints);
    }
  }, [project?.id]);

  const handleManageCollaborators = () => {
    setIsCollaboratorsOpen(true);
  };

  const handleEditComplaint = (complaint: any) => {
    setEditingComplaint(complaint);
    setIsEditOpen(true);
  };

  const handleDeleteComplaint = async () => {
    if (!deleteComplaintId) return;
    
    try {
      const result = await deleteComplaint(deleteComplaintId);
      if (result.success) {
        setComplaints((prev) => prev.filter((c) => c.id !== deleteComplaintId));
        setIsDeleteConfirmOpen(false);
        setDeleteComplaintId(null);
      }
    } catch (error) {
      console.error("Error deleting complaint:", error);
    }
  };

  const handleComplaintUpdated = async () => {
    // Refresh complaints
    if (project) {
      const updated = await getProjectComplaints(project.id);
      setComplaints(updated);
    }
  };

  const handleReactivateProject = async () => {
    if (!project || !enhancedUser?.id) return;
    
    try {
      await reactivateProject(project.id.toString(), enhancedUser.id, newProjectStatus);
      
      // Refresh project data using cache
      await onRefresh();
      
      setIsReactivateDialogOpen(false);
      alert("Project successfully reactivated!");
    } catch (error) {
      console.error("Error reactivating project:", error);
      alert("Failed to reactivate project: " + (error as Error).message);
    }
  };

  // Sorting function
  const sortTasks = (tasks: any[]) => {
    return [...tasks].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "dueDate":
          const aDueDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const bDueDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          comparison = aDueDate - bDueDate;
          break;
        case "createDate":
          const aCreateDate = new Date(a.createdAt).getTime();
          const bCreateDate = new Date(b.createdAt).getTime();
          comparison = aCreateDate - bCreateDate;
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority =
            priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority =
            priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          comparison = aPriority - bPriority;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading project...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Project Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The project you're looking for doesn't exist or you don't have
            access to it.
          </p>
          <Link href="/projects">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-6">
        {/* Cancelled Project Warning */}
        {isProjectCancelled && (
          <Card className="mb-6 border-red-500 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    Project Cancelled
                  </Badge>
                  <p className="text-red-800 font-medium">
                    This project has been cancelled. All actions are disabled and no modifications can be made.
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    onClick={() => setIsReactivateDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Continue Project
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-border mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-black hover:text-foreground"
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "tasks"
                ? "border-b-2 border-primary text-primary"
                : "border-b-2 border-transparent text-black hover:text-foreground"
            }`}
          >
            Tasks
            {taskStats && (
              <Badge
                variant="secondary"
                className="bg-muted text-black"
              >
                {taskStats.total}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("complaints")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "complaints"
                ? "border-b-2 border-primary text-primary"
                : "border-b-2 border-transparent text-black hover:text-foreground"
            }`}
          >
            Complaints
            {complaints.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-muted text-black"
              >
                {complaints.length}
              </Badge>
            )}
          </button>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Top Row - Team and Project Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Team Card */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground">
                    Responsible Team:
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {project.createdByUser.firstName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-card-foreground">
                        {project.createdByUser.firstName}{" "}
                        {project.createdByUser.lastName}
                      </div>
                      <div className="text-sm text-black">
                        Team Lead
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-black mb-2">
                      Team Members:
                    </div>
                    {collaborators && collaborators.length > 0 ? (
                      <div className="flex items-center gap-2">
                        {collaborators
                          .slice(0, 3)
                          .map((collaborator: any, index: number) => (
                            <Tooltip key={index}>
                              <TooltipTrigger asChild>
                                <Avatar className="w-8 h-8 cursor-pointer">
                                  <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                                    {collaborator.user.firstName.charAt(0)}{collaborator.user.lastName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{collaborator.user.firstName} {collaborator.user.lastName}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        {collaborators.length > 3 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground text-xs font-bold cursor-pointer">
                                +{collaborators.length - 3}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="flex flex-col gap-1">
                                {collaborators.slice(3).map((collaborator: any, index: number) => (
                                  <p key={index}>{collaborator.user.firstName} {collaborator.user.lastName}</p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="w-8 h-8 cursor-pointer">
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                              {project.createdByUser.firstName.charAt(0)}{project.createdByUser.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{project.createdByUser.firstName} {project.createdByUser.lastName}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  <div className="text-sm text-black">
                    Last updated:{" "}
                    {new Date(project.updated_at).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>

                  {(isProjectOwner || isAdmin) && !isProjectCancelled && (
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleManageCollaborators}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add people
                    </Button>
                  )}
                  {isProjectOwner && !isProjectCancelled && (
                    <CreateComplaintDialog
                      projectId={project.id}
                      projectName={project.name}
                      clientName={project.clientName}
                      staffMembers={collaborators.map((c) => ({
                        id: c.user.id,
                        firstName: c.user.firstName,
                        lastName: c.user.lastName,
                        email: c.user.email,
                      }))}
                    />
                  )}
                  {isProjectCancelled && (
                    <div className="w-full p-3 bg-red-100 border border-red-300 rounded-md text-center">
                      <p className="text-sm text-red-800 font-medium">
                        Project is cancelled - Actions disabled
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Details Card */}
              <Card className="bg-accent border-accent/20">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Project Name:
                  </CardTitle>
                  <div className="text-2xl font-bold text-foreground italic">
                    "{project.name}"
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-black" />
                      <span>hahahaha</span>
                      <span className="text-black">
                        Client Name:
                      </span>
                      <span className="font-medium text-foreground">
                        {project.clientName || project.createdByUser.firstName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-black" />
                      <span className="text-black">Start Date:</span>
                      <span className="font-medium text-foreground">
                        {project.startDate
                          ? new Date(project.startDate)
                              .toLocaleDateString("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                              })
                              .toUpperCase()
                          : "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-black" />
                      <span className="text-black">End Date:</span>
                      <span className="font-medium text-foreground">
                        {project.endDate
                          ? new Date(project.endDate)
                              .toLocaleDateString("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                              })
                              .toUpperCase()
                          : "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Edit className="w-4 h-4 text-black" />
                      <span className="text-black">Priority:</span>
                      <Badge
                        variant="outline"
                        className="text-black border-muted-foreground/30"
                      >
                        {project.priority || "low"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-foreground mb-2">
                      Your progress
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width:
                              taskStats && taskStats.total > 0
                                ? `${(taskStats.done / taskStats.total) * 100}%`
                                : "0%",
                          }}
                        ></div>
                      </div>
                      <Badge className="bg-primary text-primary-foreground">
                        {taskStats && taskStats.total > 0
                          ? `${Math.round(
                              (taskStats.done / taskStats.total) * 100
                            )}% to complete`
                          : "0% to complete"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Task Statistics Card */}
            {taskStats && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Task Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {taskStats.total}
                      </div>
                      <div className="text-sm text-gray-600">Total Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {taskStats.todo}
                      </div>
                      <div className="text-sm text-gray-600">To Do</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {taskStats.inProgress}
                      </div>
                      <div className="text-sm text-gray-600">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {taskStats.done}
                      </div>
                      <div className="text-sm text-gray-600">Done</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services Card */}
            {project.quotations && project.quotations.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Services Included
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {project.quotations.map((quotation: any) => (
                    <div key={quotation.id} className="mb-6 last:mb-0">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {quotation.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge
                              variant={
                                quotation.status === "accepted"
                                  ? "default"
                                  : quotation.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {quotation.status}
                            </Badge>
                            <span className="text-sm font-medium text-green-600">
                              Total: RM {quotation.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Services List */}
                      {quotation.services && quotation.services.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Standard Services:
                          </h4>
                          <div className="grid gap-3 md:grid-cols-2">
                            {quotation.services.map((qs: any) => (
                              <div
                                key={qs.id}
                                className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-semibold text-gray-900">
                                    {qs.service.name}
                                  </h5>
                                  <span className="text-sm font-medium text-green-600 whitespace-nowrap ml-2">
                                    RM {qs.service.basePrice.toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  {qs.service.description}
                                </p>
                                {qs.service.ServiceToTag && qs.service.ServiceToTag.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {qs.service.ServiceToTag.map((st: any) => (
                                      <Badge
                                        key={st.service_tags.id}
                                        style={{
                                          backgroundColor: st.service_tags.color || "#3B82F6",
                                          color: "white",
                                        }}
                                        className="text-xs"
                                      >
                                        {st.service_tags.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Services List */}
                      {quotation.customServices &&
                        quotation.customServices.length > 0 && (
                          <div className="space-y-3 mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Custom Services:
                            </h4>
                            <div className="grid gap-3 md:grid-cols-2">
                              {quotation.customServices.map((cs: any) => (
                                <div
                                  key={cs.id}
                                  className="border border-purple-200 rounded-lg p-4 bg-purple-50 hover:bg-purple-100 transition-colors"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-semibold text-gray-900">
                                        {cs.name}
                                      </h5>
                                      <Badge
                                        variant={
                                          cs.status === "APPROVED"
                                            ? "default"
                                            : cs.status === "REJECTED"
                                            ? "destructive"
                                            : "secondary"
                                        }
                                        className="text-xs"
                                      >
                                        {cs.status}
                                      </Badge>
                                    </div>
                                    <span className="text-sm font-medium text-green-600 whitespace-nowrap ml-2">
                                      RM {cs.price.toFixed(2)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {cs.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* If no services */}
                      {(!quotation.services || quotation.services.length === 0) &&
                        (!quotation.customServices ||
                          quotation.customServices.length === 0) && (
                          <div className="text-center py-6 bg-gray-50 rounded-lg">
                            <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 text-sm">
                              No services in this quotation
                            </p>
                          </div>
                        )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === "tasks" && (
          <KanbanBoard
            projectId={params.id as string}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortByChange={setSortBy}
            onSortOrderChange={setSortOrder}
            isProjectCancelled={isProjectCancelled}
          />
        )}

        {activeTab === "complaints" && (
          <div className="space-y-4">
            {complaints.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No complaints recorded for this project</p>
                </CardContent>
              </Card>
            ) : (
              complaints.map((complaint) => (
                <Card key={complaint.id} className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg text-card-foreground">
                            {complaint.user.firstName} {complaint.user.lastName}
                          </CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Customer: {complaint.customer}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </p>
                        {isProjectOwner && !isProjectCancelled && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditComplaint(complaint)}
                              className="hover:text-primary"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteComplaintId(complaint.id);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-card-foreground">{complaint.reason}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Collaborators Dialog */}
      <ProjectCollaboratorsDialog
        isOpen={isCollaboratorsOpen}
        onOpenChange={setIsCollaboratorsOpen}
        projectId={project?.id || 0}
        projectName={project?.name || ""}
      />

      {/* Edit Complaint Dialog */}
      {editingComplaint && (
        <EditComplaintDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          complaint={editingComplaint}
          onComplaintUpdated={handleComplaintUpdated}
        />
      )}

      {/* Delete Complaint Confirmation */}
      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Complaint"
        description="Are you sure you want to delete this complaint? This action cannot be undone."
        onConfirm={handleDeleteComplaint}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Reactivate Project Dialog */}
      <Dialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Continue Project</DialogTitle>
            <DialogDescription>
              Select the status you want to set for this project when reactivating it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ This will reactivate the cancelled project and allow team members to work on it again.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newStatus">New Project Status</Label>
              <Select
                value={newProjectStatus}
                onValueChange={(value) => setNewProjectStatus(value as "planning" | "in_progress" | "on_hold")}
              >
                <SelectTrigger id="newStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the appropriate status based on the project's current state.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsReactivateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReactivateProject}
              className="bg-green-600 hover:bg-green-700"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Continue Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

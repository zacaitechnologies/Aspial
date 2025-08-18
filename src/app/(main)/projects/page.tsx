"use client";
import { Calendar, Eye, Edit, Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  DollarSign,
  Clock,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { getAllProjects, updateProjectStatus, deleteProject } from "./action";
import { isUserProjectOwner } from "./permissions";
import EditProjectDialog from "./components/EditProjectDialog";
import ProjectSearchBar from "./components/ProjectSearchBar";
import ProjectCollaboratorsDialog from "./components/ProjectCollaboratorsDialog";
import { useSession } from "../contexts/SessionProvider";
import {
  ProjectWithQuotation,
  projectStatusOptions,
  ProjectOwnershipState,
} from "./types";
import Link from "next/link";

export default function ProjectsPage() {
  const { enhancedUser } = useSession();
  const [projects, setProjects] = useState<ProjectWithQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProject, setEditingProject] =
    useState<ProjectWithQuotation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<ProjectWithQuotation | null>(null);
  const [projectOwnership, setProjectOwnership] =
    useState<ProjectOwnershipState>({});


  const getLatestUpdatedTime = (projects: ProjectWithQuotation[]) => {
    if (projects.length === 0) return null;

    const latestProject = projects.reduce((latest, current) => {
      const latestTime = new Date(latest.updated_at).getTime();
      const currentTime = new Date(current.updated_at).getTime();
      return currentTime > latestTime ? current : latest;
    });

    return new Date(latestProject.updated_at);
  };

  // Calculate project statistics
  const getProjectStats = (projects: ProjectWithQuotation[]) => {
    const total = projects.length;
    const newProjects = projects.filter((p) => p.status === "planning").length;
    const ongoing = projects.filter((p) => p.status === "in_progress").length;
    const completed = projects.filter((p) => p.status === "completed").length;

    return { total, newProjects, ongoing, completed };
  };

  const fetchProjects = async () => {
    try {
      if (!enhancedUser?.id) {
        console.error("User not authenticated");
        return;
      }
      const data = await getAllProjects(enhancedUser.id);
      setProjects(data as ProjectWithQuotation[]);

      const ownershipMap: { [key: number]: boolean } = {};
      for (const project of data) {
        ownershipMap[project.id] = await isUserProjectOwner(
          enhancedUser.id,
          project.id
        );
      }
      setProjectOwnership(ownershipMap);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enhancedUser?.id) {
      fetchProjects();
    }
  }, [enhancedUser?.id]);

  const handleStatusUpdate = async (projectId: string, newStatus: string) => {
    try {
      await updateProjectStatus(projectId, newStatus);
      await fetchProjects();
    } catch (error) {
      console.error("Error updating project status:", error);
    }
  };

  const handleEditProject = (project: ProjectWithQuotation) => {
    setEditingProject(project);
    setIsEditOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    try {
      await deleteProject(projectId);
      await fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project. Please try again.");
    }
  };

  const handleManageCollaborators = (project: ProjectWithQuotation) => {
    setSelectedProject(project);
    setIsCollaboratorsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = projectStatusOptions.find(
      (opt) => opt.value === status
    );
    
    // Custom color mapping for better visual distinction
    const getStatusColor = (status: string) => {
      switch (status) {
        case "planning":
          return "bg-blue-100 text-blue-800 border-blue-200";
        case "in_progress":
          return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "completed":
          return "bg-green-100 text-green-800 border-green-200";
        case "cancelled":
          return "bg-red-100 text-red-800 border-red-200";
        default:
          return "bg-gray-100 text-gray-800 border-gray-200";
      }
    };

    return (
      <Badge 
        variant="outline" 
        className={`${getStatusColor(status)} border`}
      >
        {statusConfig?.label || status}
      </Badge>
    );
  };

  // Filter projects based on search query and status filter
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description &&
        project.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      project.createdByUser.firstName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      project.createdByUser.lastName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading projects...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div>
        <p className="text-4xl font-extrabold text-primary">
          "Project
        </p>
        <p className="text-3xl font-bold text-primary">
          Management"
        </p>
        <p className="text-sm font-light text-primary my-2">
          Last Updated:{" "}
          {getLatestUpdatedTime(projects)
            ? getLatestUpdatedTime(projects)!.toLocaleString()
            : "No projects"}
        </p>

        <p className="text-primary my-6 text-xl font-semibold">
          Hi, {enhancedUser?.profile?.firstName}. Welcome Back!{" "}
        </p>
      </div>

      <p className="text-lg w-200 mb-2 font-bold text-primary">
        Project Status:
      </p>

      <div className="w-full p-0 rounded-md grid lg:grid-cols-4 grid-cols-2 gap-4">
        {(() => {
          const stats = getProjectStats(projects);
          const boxes = [];

          if (stats.total >= 0) {
            boxes.push(
              <Card key="total" className="card p-6 bg-blue-50 border-blue-200">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <Briefcase className="h-8 w-8 text-blue-600 mb-4" />

                      <p className="text-xl font-bold text-blue-600">Total</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {stats.total}
                      </p>
                      <p className="text-lg font-semibold text-blue-600">
                        Projects
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (stats.newProjects >= 0) {
            boxes.push(
              <Card key="new" className="card p-6 bg-yellow-50 border-yellow-200">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <Calendar className="h-8 w-8 text-yellow-600 mb-4" />

                      <p className="text-xl font-bold text-yellow-600">New</p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {stats.newProjects}
                      </p>
                      <p className="text-lg font-semibold text-yellow-600">
                        Projects
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (stats.ongoing >= 0) {
            boxes.push(
              <Card key="ongoing" className="card p-6 bg-green-50 border-green-200">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <Clock className="h-8 w-8 text-green-600 mb-4" />

                      <p className="text-xl font-bold text-green-600">
                        Ongoing
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {stats.ongoing}
                      </p>
                      <p className="text-lg font-semibold text-green-600">
                        Projects
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (stats.completed >= 0) {
            boxes.push(
              <Card
                key="completed"
                className="card p-6 bg-purple-50 border-purple-200"
              >
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <DollarSign className="h-8 w-8 text-purple-600 mb-4" />

                      <p className="text-xl font-bold text-purple-600">
                        Completed
                      </p>
                      <p className="text-2xl font-bold text-purple-900">
                        {stats.completed}
                      </p>
                      <p className="text-lg font-semibold text-purple-600">
                        Projects
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return boxes.length > 0 ? boxes : null;
        })()}
      </div>

      <div className="mt-6 flex flex-row justify-between items-center">
        <p className="text-primary text-lg font-bold">
          Management:
        </p>
        <div className="flex items-center gap-4">
        <ProjectSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="card">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(project.status)}
                    <Badge variant="outline" className="text-xs">
                      {project.priority}
                    </Badge>
                  </div>
        </div>
                <div className="flex gap-2">
                  <Link href={`/projects/${project.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 bg-transparent hover:bg-primary hover:text-primary-foreground border-primary text-primary"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 bg-transparent"
                    style={{ borderColor: "#BDC4A5", color: "#202F21" }}
                    onClick={() => handleEditProject(project)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                    onClick={() => handleDelete(project.id.toString())}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                {project.startDate
                  ? new Date(project.startDate).toLocaleDateString()
                      : "Not set"} - {project.endDate
                  ? new Date(project.endDate).toLocaleDateString()
                  : "Not set"}
                  </span>
              </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Created by: {project.createdByUser.firstName}{" "}
                {project.createdByUser.lastName}
                  </span>
              </div>
              </div>
            </CardContent>
          </Card>
        ))}
            </div>

          {filteredProjects.length === 0 && projects.length > 0 && (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
                No projects match your search criteria.
              </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your search or filter settings.
          </p>
            </div>
          )}

          {projects.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No projects available.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create projects from accepted or paid quotations.
          </p>
            </div>
          )}

      <EditProjectDialog
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={fetchProjects}
        project={editingProject}
      />

      <ProjectCollaboratorsDialog
        isOpen={isCollaboratorsOpen}
        onOpenChange={setIsCollaboratorsOpen}
        projectId={selectedProject?.id || 0}
        projectName={selectedProject?.name || ""}
      />
    </div>
  );

  // return (
  //   <div className="container mx-auto px-6">
  //     <p className="text-gray-800">
  //       Manage and track all your projects in one place
  //     </p>
  //     <div className="flex items-center">
  //       <div className="flex items-center space-x-4">
  //         <div className="relative">
  //           <ProjectSearchBar
  //             searchQuery={searchQuery}
  //             onSearchChange={setSearchQuery}
  //             statusFilter={statusFilter}
  //             onStatusFilterChange={setStatusFilter}
  //           />
  //         </div>
  //       </div>
  //     </div>

  //     <div className="grid bg-gray-100 rounded-md h-full p-4 grid-cols-1 lg:grid-cols-2 gap-6">
  //       {filteredProjects.map((project) => (
  //         <Card
  //           key={project.id}
  //           className="hover:shadow-lg hover:border-green-300 border-2 lg:w-120 transition-shadow"
  //         >
  //           <CardHeader>
  //             <div className="flex justify-between items-start">
  //               <div>
  //                 <CardTitle className="text-lg">{project.name}</CardTitle>
  //                 <div className="flex items-center gap-2 mt-1">
  //                   {getStatusBadge(project.status)}
  //                 </div>
  //               </div>
  //               <div className="flex items-center gap-2">
  //                 {projectOwnership[project.id] && (
  //                   <Button
  //                     variant="outline"
  //                     size="sm"
  //                     onClick={() => handleManageCollaborators(project)}
  //                     title="Invite Collaborators"
  //                     className="text-blue-600 border-blue-600 hover:bg-blue-50"
  //                   >
  //                     <Users className="w-4 h-4 mr-1" />
  //                     Invite
  //                   </Button>
  //                 )}
  //                 <Select
  //                   value={project.status}
  //                   onValueChange={(value) =>
  //                     handleStatusUpdate(project.id.toString(), value)
  //                   }
  //                 >
  //                   <SelectTrigger>
  //                     <SelectValue />
  //                   </SelectTrigger>
  //                   <SelectContent>
  //                     {projectStatusOptions.map((option) => (
  //                       <SelectItem key={option.value} value={option.value}>
  //                         {option.label}
  //                       </SelectItem>
  //                     ))}
  //                   </SelectContent>
  //                 </Select>
  //               </div>
  //             </div>
  //           </CardHeader>
  //           <hr className="border-gray-400" />
  //           <CardContent className="space-y-4">
  //             <div className="space-y-2">
  //               {project.description && (
  //                 <div>
  //                   <p className="text-sm font-medium">Description:</p>
  //                   <CardDescription>{project.description}</CardDescription>
  //                 </div>
  //               )}

  //               <div className="grid grid-cols-2 gap-4">
  //                 <div className="flex items-center gap-2">
  //                   <DollarSign className="w-4 h-4 text-muted-foreground" />
  //                   <span className="text-sm">
  //                     RM{project.quotation.totalPrice.toFixed(2)}
  //                   </span>
  //                 </div>
  //               </div>

  //               <div className="grid grid-cols-2 gap-4">
  //                 <div className="flex items-center gap-2">
  //                   <Clock className="w-4 h-4 text-muted-foreground" />
  //                   <span className="text-sm">
  //                     Start:{" "}
  //                     {project.startDate
  //                       ? new Date(project.startDate).toLocaleDateString()
  //                       : "Not set"}
  //                   </span>
  //                 </div>
  //                 <div className="flex items-center gap-2">
  //                   <Clock className="w-4 h-4 text-muted-foreground" />
  //                   <span className="text-sm">
  //                     End:{" "}
  //                     {project.endDate
  //                       ? new Date(project.endDate).toLocaleDateString()
  //                       : "Not set"}
  //                   </span>
  //                 </div>
  //               </div>

  //               <div className="space-y-2">
  //                 <p className="text-sm font-medium">Services included:</p>
  //                 <div className="flex flex-wrap gap-1">
  //                   {project.quotation.services.map((qs) => (
  //                     <Badge key={qs.id} variant="outline" className="text-xs">
  //                       {qs.service.name}
  //                     </Badge>
  //                   ))}
  //                 </div>
  //               </div>
  //               <div className="flex items-center gap-2">
  //                 <User className="w-4 h-4 text-muted-foreground" />
  //                 <span className="text-sm">
  //                   Created by: {project.createdByUser.firstName}{" "}
  //                   {project.createdByUser.lastName}
  //                 </span>
  //               </div>
  //             </div>
  //           </CardContent>
  //         </Card>
  //       ))}
  //     </div>

  //     {filteredProjects.length === 0 && projects.length > 0 && (
  //       <div className="text-center py-12">
  //         <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
  //         <p className="text-muted-foreground">
  //           No projects match your search criteria.
  //         </p>
  //         <p className="text-sm text-muted-foreground mt-2">
  //           Try adjusting your search or filter settings.
  //         </p>
  //       </div>
  //     )}

  //     {projects.length === 0 && (
  //       <div className="text-center py-12">
  //         <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
  //         <p className="text-muted-foreground">No projects available.</p>
  //         <p className="text-sm text-muted-foreground mt-2">
  //           Create projects from accepted or paid quotations.
  //         </p>
  //       </div>
  //     )}

  //     <EditProjectDialog
  //       isOpen={isEditOpen}
  //       onOpenChange={setIsEditOpen}
  //       onSuccess={fetchProjects}
  //       project={editingProject}
  //     />

  //     <ProjectCollaboratorsDialog
  //       isOpen={isCollaboratorsOpen}
  //       onOpenChange={setIsCollaboratorsOpen}
  //       projectId={selectedProject?.id || 0}
  //       projectName={selectedProject?.name || ""}
  //     />
  //   </div>
  // );
}

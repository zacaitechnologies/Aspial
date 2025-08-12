"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Calendar,
  DollarSign,
  Edit,
  User,
  Clock,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getAllProjects, updateProjectStatus } from "./action";
import { isUserProjectOwner } from "./permissions";
import { Button } from "@/components/ui/button";
import EditProjectDialog from "./components/EditProjectDialog";
import ProjectSearchBar from "./components/ProjectSearchBar";
import ProjectCollaboratorsDialog from "./components/ProjectCollaboratorsDialog";
import { useSession } from "../contexts/SessionProvider";
import {
  ProjectWithQuotation,
  projectStatusOptions,
  ProjectOwnershipState,
} from "./types";

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
    const newProjects = projects.filter(p => p.status === 'planning').length;
    const ongoing = projects.filter(p => p.status === 'in_progress').length;
    const completed = projects.filter(p => p.status === 'completed').length;

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

  // const handleStatusUpdate = async (projectId: string, newStatus: string) => {
  //   try {
  //     await updateProjectStatus(projectId, newStatus);
  //     await fetchProjects();
  //   } catch (error) {
  //     console.error("Error updating project status:", error);
  //   }
  // };

  // const handleEditProject = (project: ProjectWithQuotation) => {
  //   setEditingProject(project);
  //   setIsEditOpen(true);
  // };

  // const handleManageCollaborators = (project: ProjectWithQuotation) => {
  //   setSelectedProject(project);
  //   setIsCollaboratorsOpen(true);
  // };

  // const getStatusBadge = (status: string) => {
  //   const statusConfig = projectStatusOptions.find(
  //     (opt) => opt.value === status
  //   );
  //   return (
  //     <Badge variant={statusConfig?.color || "secondary"}>
  //       {statusConfig?.label || status}
  //     </Badge>
  //   );
  // };

  // // Filter projects based on search query and status filter
  // const filteredProjects = projects.filter((project) => {
  //   const matchesSearch =
  //     project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //     (project.description &&
  //       project.description
  //         .toLowerCase()
  //         .includes(searchQuery.toLowerCase())) ||
  //     project.createdByUser.firstName
  //       .toLowerCase()
  //       .includes(searchQuery.toLowerCase()) ||
  //     project.createdByUser.lastName
  //       .toLowerCase()
  //       .includes(searchQuery.toLowerCase());

  //   const matchesStatus =
  //     statusFilter === "all" || project.status === statusFilter;

  //   return matchesSearch && matchesStatus;
  // });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading projects...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6">
      <div>
        <p className="text-4xl font-extrabold text-[var(--lightGreen)]">
          "Project
        </p>
        <p className="text-3xl font-bold text-[var(--lightGreen)]">
          Management"
        </p>
        <p className="text-sm font-light text-[var(--lightGreen)] my-2">
          Last Updated:{" "}
          {getLatestUpdatedTime(projects)
            ? getLatestUpdatedTime(projects)!.toLocaleString()
            : "No projects"}
        </p>

        <p className="text-[var(--lightGreen)] my-6 text-xl font-semibold">
          Hi, {enhancedUser?.profile?.firstName}. Welcome Back!{" "}
        </p>
      </div>

      <div className="flex flex-row justify-between items-center">
        <p className="text-lg w-200 font-bold text-[var(--lightGreen)]">
          Project Status:
        </p>
        <ProjectSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

             <div className="w-full rounded-md grid lg:grid-cols-4 grid-cols-2 gap-4 mt-6">
         {(() => {
           const stats = getProjectStats(projects);
           const boxes = [];
           
           if (stats.total >= 0) {
             boxes.push(
               <Card key="total" className="p-6 bg-blue-50 border-blue-200">
                 <CardContent className="p-0">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-blue-600">Total Projects</p>
                       <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                     </div>
                     <Briefcase className="h-8 w-8 text-blue-600" />
                   </div>
                 </CardContent>
               </Card>
             );
           }
           
           if (stats.newProjects >= 0) {
             boxes.push(
               <Card key="new" className="p-6 bg-yellow-50 border-yellow-200">
                 <CardContent className="p-0">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-yellow-600">New Projects</p>
                       <p className="text-2xl font-bold text-yellow-900">{stats.newProjects}</p>
                     </div>
                     <Calendar className="h-8 w-8 text-yellow-600" />
                   </div>
                 </CardContent>
               </Card>
             );
           }
           
           if (stats.ongoing >= 0) {
             boxes.push(
               <Card key="ongoing" className="p-6 bg-green-50 border-green-200">
                 <CardContent className="p-0">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-green-600">Ongoing Projects</p>
                       <p className="text-2xl font-bold text-green-900">{stats.ongoing}</p>
                     </div>
                     <Clock className="h-8 w-8 text-green-600" />
                   </div>
                 </CardContent>
               </Card>
             );
           }
           
           if (stats.completed >= 0) {
             boxes.push(
               <Card key="completed" className="p-6 bg-purple-50 border-purple-200">
                 <CardContent className="p-0">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-purple-600">Completed Projects</p>
                       <p className="text-2xl font-bold text-purple-900">{stats.completed}</p>
                     </div>
                     <DollarSign className="h-8 w-8 text-purple-600" />
                   </div>
                 </CardContent>
               </Card>
             );
           }
           
           return boxes.length > 0 ? boxes : null;
         })()}
       </div>
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

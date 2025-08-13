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
  DollarSign,
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

type ProjectWithQuotation = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  created_at: Date;
  updated_at: Date;
  createdByUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
  };
  quotation: {
    id: number;
    name: string;
    description: string;
    totalPrice: number;
    status: string;
    services: {
      id: number;
      service: {
        id: number;
        name: string;
        description: string;
        basePrice: number;
      };
    }[];
  };
};

const projectStatusOptions = [
  { value: "planning", label: "Planning", color: "secondary" as const },
  { value: "in_progress", label: "In Progress", color: "default" as const },
  { value: "completed", label: "Completed", color: "default" as const },
  { value: "cancelled", label: "Cancelled", color: "destructive" as const },
];

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
  const [selectedProject, setSelectedProject] = useState<ProjectWithQuotation | null>(null);
  const [projectOwnership, setProjectOwnership] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    if (enhancedUser?.id) {
      fetchProjects();
    }
  }, [enhancedUser?.id]);

  const fetchProjects = async () => {
    try {
      if (!enhancedUser?.id) {
        console.error("User not authenticated");
        return;
      }
      const data = await getAllProjects(enhancedUser.id);
      setProjects(data as ProjectWithQuotation[]);
      
      // Check ownership for each project
      const ownershipMap: {[key: number]: boolean} = {};
      for (const project of data) {
        ownershipMap[project.id] = await isUserProjectOwner(enhancedUser.id, project.id);
      }
      setProjectOwnership(ownershipMap);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleManageCollaborators = (project: ProjectWithQuotation) => {
    setSelectedProject(project);
    setIsCollaboratorsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = projectStatusOptions.find(
      (opt) => opt.value === status
    );
    return (
      <Badge variant={statusConfig?.color || "secondary"}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  // Filter projects based on search query and status filter
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      project.createdByUser.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.createdByUser.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    
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
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <p className="text-muted-foreground">
          Track and manage your active projects
        </p>
      </div>

      <ProjectSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjects.map((project) => (
          <Card
            key={project.id}
            className="hover:shadow-lg hover:border-green-300 border-2 lg:w-120 transition-shadow"
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(project.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {projectOwnership[project.id] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageCollaborators(project)}
                      title="Invite Collaborators"
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Invite
                    </Button>
                  )}
                  <Select
                    value={project.status}
                    onValueChange={(value) =>
                      handleStatusUpdate(project.id.toString(), value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projectStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <hr className="border-gray-400" />
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {project.description && (
                  <div>
                    <p className="text-sm font-medium">Description:</p>
                    <CardDescription>{project.description}</CardDescription>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      RM{project.quotation.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Start:{" "}
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString()
                        : "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      End:{" "}
                      {project.endDate
                        ? new Date(project.endDate).toLocaleDateString()
                        : "Not set"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Services included:</p>
                  <div className="flex flex-wrap gap-1">
                    {project.quotation.services.map((qs) => (
                      <Badge key={qs.id} variant="outline" className="text-xs">
                        {qs.service.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
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
          <p className="text-muted-foreground">No projects match your search criteria.</p>
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
}

"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Calendar, User, Building2, Search, FileText } from "lucide-react";
import { getAllProjects } from "../../projects/action";
import { createProject } from "../../projects/action";

interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
  createdByUser?: {
    firstName: string;
    lastName: string;
  };
  Client?: {
    name: string;
  };
}

interface NewProjectData {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority: "low" | "medium" | "high";
}

interface ProjectSelectionProps {
  selectedProjectId?: number;
  newProjectData?: NewProjectData;
  onProjectSelect: (projectId: number, projectName: string) => void;
  onNewProjectDataChange: (data: NewProjectData) => void;
  onModeChange: (mode: "existing" | "new" | "none") => void;
  mode: "existing" | "new" | "none";
  currentUserId: string;
}

export default function ProjectSelection({
  selectedProjectId,
  newProjectData,
  onProjectSelect,
  onNewProjectDataChange,
  onModeChange,
  mode,
  currentUserId,
}: ProjectSelectionProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await getAllProjects(currentUserId);
      setProjects(projectsData as Project[]);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.Client?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewProjectDataChange = (
    field: keyof NewProjectData,
    value: string
  ) => {
    onNewProjectDataChange({
      ...newProjectData,
      [field]: value,
    } as NewProjectData);
  };

  const handleCreateProject = async () => {
    if (!newProjectData?.name) {
      alert("Please enter a project name");
      return;
    }

    try {
      const newProject = await createProject({
        name: newProjectData.name,
        description: newProjectData.description,
        createdBy: currentUserId,
        startDate: newProjectData.startDate ? new Date(newProjectData.startDate) : undefined,
        endDate: newProjectData.endDate ? new Date(newProjectData.endDate) : undefined,
        priority: newProjectData.priority,
      });

      onProjectSelect(newProject.id, newProject.name);
      onModeChange("existing");
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Link to Project</Label>

      <Tabs
        value={mode}
        onValueChange={(value) => onModeChange(value as "existing" | "new" | "none")}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="none">No Project</TabsTrigger>
          <TabsTrigger value="existing">Select Existing Project</TabsTrigger>
          <TabsTrigger value="new">Create New Project</TabsTrigger>
        </TabsList>

        <TabsContent value="none" className="space-y-4">
          <div className="border rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                No Project Link
              </h3>
            </div>
            <p className="text-muted-foreground">
              This quotation will not be linked to any project. You can link it to a project later.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="existing" className="space-y-4">
          <div className="border rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Select from Existing Projects
              </h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-search">Search Projects</Label>
                <Input
                  id="project-search"
                  placeholder="Search by name, description, or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading projects...</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? "No projects found matching your search."
                          : "No projects available."}
                      </p>
                    </div>
                  ) : (
                    filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedProjectId === project.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => onProjectSelect(project.id, project.name)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{project.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {project.description && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {project.description.length > 50 
                                    ? `${project.description.substring(0, 50)}...` 
                                    : project.description}
                                </span>
                              )}
                              {project.Client && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {project.Client.name}
                                </span>
                              )}
                              {project.createdByUser && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {project.createdByUser.firstName} {project.createdByUser.lastName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className={`px-2 py-1 rounded-full ${
                                project.status === 'completed' ? 'bg-green-100 text-green-800' :
                                project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {project.status.replace('_', ' ')}
                              </span>
                              {project.startDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(project.startDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedProjectId === project.id && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <div className="border rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Create New Project
              </h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-project-name">Project Name *</Label>
                  <Input
                    id="new-project-name"
                    value={newProjectData?.name || ""}
                    onChange={(e) =>
                      handleNewProjectDataChange("name", e.target.value)
                    }
                    placeholder="Enter project name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-project-priority">Priority</Label>
                  <select
                    id="new-project-priority"
                    value={newProjectData?.priority || "low"}
                    onChange={(e) =>
                      handleNewProjectDataChange("priority", e.target.value as "low" | "medium" | "high")
                    }
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-project-start-date">Start Date</Label>
                  <Input
                    id="new-project-start-date"
                    type="date"
                    value={newProjectData?.startDate || ""}
                    onChange={(e) =>
                      handleNewProjectDataChange("startDate", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-project-end-date">End Date</Label>
                  <Input
                    id="new-project-end-date"
                    type="date"
                    value={newProjectData?.endDate || ""}
                    onChange={(e) =>
                      handleNewProjectDataChange("endDate", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-project-description">Description</Label>
                <Textarea
                  id="new-project-description"
                  value={newProjectData?.description || ""}
                  onChange={(e) =>
                    handleNewProjectDataChange("description", e.target.value)
                  }
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreateProject}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Create Project & Link
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

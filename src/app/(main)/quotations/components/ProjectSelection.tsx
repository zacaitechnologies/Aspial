"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProjectsForQuotationOptimized } from "../action";
import { createProject } from "../../projects/action";
import { Button } from "@/components/ui/button";

interface ProjectForQuotation {
  id: number;
  name: string;
  description: string | null;
  status: string;
  Client: {
    name: string;
  } | null;
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
  onModeChange: (mode: "existing" | "new") => void;
  mode: "existing" | "new";
  currentUserId: string;
  clientId?: string;
  clientName?: string;
}

export default function ProjectSelection({
  selectedProjectId,
  newProjectData,
  onProjectSelect,
  onNewProjectDataChange,
  onModeChange,
  mode,
  currentUserId,
  clientId,
  clientName,
}: ProjectSelectionProps) {
  const [projects, setProjects] = useState<ProjectForQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const projectsData = await getProjectsForQuotationOptimized(
        currentUserId
      );
      setProjects(projectsData as ProjectForQuotation[]);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchProjects();
  }, [currentUserId]);

  // Use useMemo to optimize filtering - only recalculates when projects or searchQuery changes
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return projects;
    }

    const query = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.Client?.name.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

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
      // Use the provided clientName, or fallback to empty string
      const finalClientName = clientName || "";

      const newProject = await createProject({
        name: newProjectData.name,
        description: newProjectData.description,
        createdBy: currentUserId,
        startDate: newProjectData.startDate
          ? new Date(newProjectData.startDate)
          : undefined,
        endDate: newProjectData.endDate
          ? new Date(newProjectData.endDate)
          : undefined,
        priority: newProjectData.priority,
        clientId: clientId || "",
        clientName: finalClientName,
      });

      onProjectSelect(newProject.id, newProject.name);
      onModeChange("existing");

      // Refresh the projects list to include the new project
      await fetchProjects();
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    }
  };

  return (
    <div>
      <Label className="text-base font-semibold">Link to Project</Label>

      <Tabs
        value={mode}
        onValueChange={(value) => onModeChange(value as "existing" | "new")}
      >
        <TabsList className="flex w-full">
          <TabsTrigger value="existing" className="flex-1 min-w-0">
            Select Existing Project
          </TabsTrigger>
          <TabsTrigger value="new" className="flex-1 min-w-0">
            Create New Project
          </TabsTrigger>
        </TabsList>

        {!selectedProjectId && (
          <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg">
            💡 Optional: You can leave this quotation unlinked to any project,
            or select/create a project to link it.
          </div>
        )}

        <TabsContent value="existing" className="space-y-4">
          <div className="border rounded-lg p-6">
            <div className="space-y-4">
              <div className="space-y-2  flex flex-row items-center gap-2">
                <Input
                  id="project-search"
                  placeholder="Search Project..."
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
                        onClick={() =>
                          onProjectSelect(project.id, project.name)
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{project.name}</p>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                project.status === 'completed' ? 'bg-green-100 text-green-800' :
                                project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {project.status.replace('_', ' ')}
                              </span>
                            </div>
                            {project.Client && (
                              <span className="flex text-sm items-center gap-1">
                                Client: {project.Client.name}
                              </span>
                            )}
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
                      handleNewProjectDataChange(
                        "priority",
                        e.target.value as "low" | "medium" | "high"
                      )
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
                <Button
                  onClick={handleCreateProject}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Create Project & Link
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

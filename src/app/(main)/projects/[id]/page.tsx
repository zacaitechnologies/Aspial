"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProjectWithQuotation } from "../types";
import { getAllProjects } from "../action";
import { isUserProjectOwner } from "../permissions";
import { useSession } from "../../contexts/SessionProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calendar,
  User,
  DollarSign,
  Clock,
  Users,
  Edit3,
  CheckSquare,
  ListTodo,
  Plus,
  Flag,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import ProjectCollaboratorsDialog from "../components/ProjectCollaboratorsDialog";
import { KanbanBoard } from "../components/ProjectKanbanBoard";
import { getProjectTaskStats } from "../task-actions";

export default function ProjectPage() {
  const params = useParams();
  const { enhancedUser } = useSession();
  const [project, setProject] = useState<ProjectWithQuotation | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks">("overview");
  const [sortBy, setSortBy] = useState<"dueDate" | "createDate" | "priority">("createDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (!enhancedUser?.id || !params.id) return;

        const projects = await getAllProjects(enhancedUser.id);
        const foundProject = projects.find(
          (p) => p.id.toString() === params.id
        );

        if (foundProject) {
          setProject(foundProject as ProjectWithQuotation);

          // Check if user is project owner
          const isOwner = await isUserProjectOwner(
            enhancedUser.id,
            foundProject.id
          );
          setIsProjectOwner(isOwner);

          // Fetch project collaborators
          try {
            const { getProjectPermissions } = await import("../permissions");
            const collaboratorsData = await getProjectPermissions(
              foundProject.id
            );
            setCollaborators(collaboratorsData);
          } catch (error) {
            console.error("Failed to fetch collaborators:", error);
            setCollaborators([]);
          }

          // Fetch task statistics
          try {
            const stats = await getProjectTaskStats(foundProject.id);
            setTaskStats(stats);
          } catch (error) {
            console.error("Failed to fetch task stats:", error);
            setTaskStats(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch project:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [enhancedUser?.id, params.id]);

  const handleManageCollaborators = () => {
    setIsCollaboratorsOpen(true);
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
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          comparison = aPriority - bPriority;
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case "dueDate":
        return "Due Date";
      case "createDate":
        return "Create Date";
      case "priority":
        return "Priority";
      default:
        return "Sort by";
    }
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
        {/* Header with back button */}
        <div className="mb-6">
          <Link href="/projects">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-border mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "tasks"
                ? "border-b-2 border-primary text-primary"
                : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Tasks
            {taskStats && (
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground"
              >
                {taskStats.total}
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
                      <div className="text-sm text-muted-foreground">
                        Team Lead
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Team Members:
                    </div>
                    {collaborators && collaborators.length > 0 ? (
                      <div className="flex items-center gap-2">
                        {collaborators
                          .slice(0, 3)
                          .map((collaborator: any, index: number) => (
                            <Avatar key={collaborator.id} className="w-8 h-8">
                              <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                                {collaborator.user.firstName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        {collaborators.length > 3 && (
                          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground text-xs font-bold">
                            +{collaborators.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                          {project.createdByUser.firstName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Last updated:{" "}
                    {new Date(project.updated_at).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>

                  {isProjectOwner && (
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleManageCollaborators}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add people
                    </Button>
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
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Client Name:
                      </span>
                      <span className="font-medium text-foreground">
                        {project.clientName || project.createdByUser.firstName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Start Date:</span>
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
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">End Date:</span>
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
                      <Flag className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground border-muted-foreground/30"
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
          </>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Project Tasks
                </h2>
                <p className="text-muted-foreground">
                  Manage and track all tasks for this project
                </p>
              </div>
              
              {/* Sorting Controls */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      {getSortLabel()}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy("createDate")}>
                      Create Date
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("dueDate")}>
                      Due Date
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("priority")}>
                      Priority
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-2"
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>
            <KanbanBoard 
              projectId={params.id as string} 
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
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
    </div>
  );
}

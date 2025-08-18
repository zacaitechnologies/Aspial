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
import { ArrowLeft, Calendar, User, DollarSign, Clock, Users, Edit3, CheckSquare, ListTodo } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks'>('overview');

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
          const isOwner = await isUserProjectOwner(enhancedUser.id, foundProject.id);
          setIsProjectOwner(isOwner);
          
          // Fetch project collaborators
          try {
            const { getProjectPermissions } = await import("../permissions");
            const collaboratorsData = await getProjectPermissions(foundProject.id);
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
        <div className="flex space-x-1 mb-6 border-b">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('overview')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'tasks' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('tasks')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <ListTodo className="w-4 h-4 mr-2" />
            Tasks
            {taskStats && (
              <Badge variant="secondary" className="ml-2">
                {taskStats.total}
              </Badge>
            )}
          </Button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Top Row - Team and Project Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Responsible Team Card */}
              <Card className="bg-white">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-black mb-4">Responsible Team:</h2>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-white bg-black rounded-full" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{project.createdByUser.firstName}</p>
                      <p className="text-gray-600">Team Lead</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Team Members:</p>
                    <div className="flex items-center gap-2">
                      {collaborators && collaborators.length > 0 ? (
                        collaborators.slice(0, 3).map((collaborator: any, index: number) => (
                          <div
                            key={collaborator.id}
                            className="w-8 h-8 bg-[var(--lightGreen)] rounded-full flex items-center justify-center relative group cursor-pointer"
                            title={`${collaborator.user.firstName} ${collaborator.user.lastName} - ${collaborator.user.email}`}
                          >
                            <User className="w-4 h-4 text-white" />
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                              {collaborator.user.firstName} {collaborator.user.lastName}
                              <br />
                              {collaborator.user.email}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      
                      {/* Show +X if there are more than 3 collaborators */}
                      {collaborators && collaborators.length > 3 && (
                        <div className="w-8 h-8 bg-[var(--lightGreen)] rounded-full flex items-center justify-center text-white text-xs font-bold">
                          +{collaborators.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      Last updated: {new Date(project.updated_at).toLocaleDateString('en-US', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                    {isProjectOwner && (
                      <Button
                        onClick={handleManageCollaborators}
                        className="bg-[var(--mediumGreen)] hover:bg-[var(--darkGreen)] text-white"
                      >
                        + Add people
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Project Details Card */}
              <Card className="bg-[var(--lightGreen)]">
                <CardContent>
                  <h2 className="text-xl font-semibold text-black mb-4">Project Name:</h2>
                  <h1 className="text-2xl font-bold italic text-black mb-6">"{project.name}"</h1>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-black">•</span>
                      <span className="text-black">Client Name: {project.createdByUser.firstName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-black">•</span>
                      <span className="text-black">Start Date: {project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      }).toUpperCase() : "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-black">•</span>
                      <span className="text-black">End Date: {project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      }).toUpperCase() : "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-black">•</span>
                      <span className="text-black">Priority: {project.priority}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-black mb-2">Your progress</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-black">75% to complete</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div className="bg-[var(--mediumGreen)] h-2 rounded-full relative" style={{ width: '75%' }}>
                        <div className="absolute top-0 left-1/5 w-1 h-2 bg-[var(--mediumGreen)] rounded-full"></div>
                        <div className="absolute top-0 left-2/5 w-1 h-2 bg-[var(--mediumGreen)] rounded-full"></div>
                        <div className="absolute top-0 left-3/5 w-1 h-2 bg-[var(--mediumGreen)] rounded-full"></div>
                        <div className="absolute top-0 left-4/5 w-1 h-2 bg-[var(--mediumGreen)] rounded-full"></div>
                      </div>
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
                      <div className="text-2xl font-bold text-blue-600">{taskStats.total}</div>
                      <div className="text-sm text-gray-600">Total Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{taskStats.todo}</div>
                      <div className="text-sm text-gray-600">To Do</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{taskStats.inProgress}</div>
                      <div className="text-sm text-gray-600">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{taskStats.done}</div>
                      <div className="text-sm text-gray-600">Done</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Project Tasks</h2>
              <p className="text-sm text-gray-600">
                Manage and track all tasks for this project
              </p>
            </div>
            <KanbanBoard projectId={params.id as string} />
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

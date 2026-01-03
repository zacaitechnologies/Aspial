"use client";

import { Calendar, Info, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, DollarSign, Clock } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { cancelProject, getProjectsPaginatedFresh, invalidateProjectsCache } from "../action";
import EditProjectDialog from "./EditProjectDialog";
import ProjectSearchBar from "./ProjectSearchBar";
import ProjectCollaboratorsDialog from "./ProjectCollaboratorsDialog";
import { useSession } from "../../contexts/SessionProvider";
import { ProjectWithQuotation, projectStatusOptions } from "../types";
import Link from "next/link";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ProjectPagination } from "./ProjectPagination";
import { toast } from "@/components/ui/use-toast";
import { checkHasFullAccess } from "../../actions/admin-actions";

interface ProjectsClientProps {
  initialData: {
    projects: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  userId?: string;
}

export default function ProjectsClient({ initialData, userId }: ProjectsClientProps) {
  const { enhancedUser } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projects, setProjects] = useState<ProjectWithQuotation[]>(initialData.projects as any);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSizeState] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithQuotation | null>(null);
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithQuotation | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch fresh data when filters change
  const fetchProjects = useCallback(async (forceRefresh = false) => {
    const currentUserId = userId || enhancedUser?.id;
    if (!currentUserId) return;

    setLoading(true);
    try {
      const result = await getProjectsPaginatedFresh(
        currentUserId,
        page,
        pageSize,
        searchQuery || undefined,
        statusFilter !== "all" ? statusFilter : undefined
      );
      setProjects(result.projects as any);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, enhancedUser?.id, page, pageSize, searchQuery, statusFilter]);

  // Refetch when filters/pagination change
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchQuery, statusFilter]);

  // Fetch admin status once on mount
  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (enhancedUser?.id) {
        try {
          const hasFullAccess = await checkHasFullAccess(enhancedUser.id);
          setIsAdmin(hasFullAccess);
        } catch (error) {
          console.error("Error checking admin status:", error);
        }
      }
    };
    fetchAdminStatus();
  }, [enhancedUser?.id]);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleCacheInvalidate = async () => {
      await invalidateProjectsCache();
      await fetchProjects(true);
    };

    window.addEventListener('projectsCacheInvalidate', handleCacheInvalidate);
    return () => window.removeEventListener('projectsCacheInvalidate', handleCacheInvalidate);
  }, [fetchProjects]);

  const onRefresh = useCallback(async () => {
    await invalidateProjectsCache();
    await fetchProjects(true);
  }, [fetchProjects]);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const getLatestUpdatedTime = (projects: ProjectWithQuotation[]) => {
    if (projects.length === 0) return null;
    const latestProject = projects.reduce((latest, current) => {
      const latestTime = new Date(latest.updated_at).getTime();
      const currentTime = new Date(current.updated_at).getTime();
      return currentTime > latestTime ? current : latest;
    });
    return new Date(latestProject.updated_at);
  };

  const latestUpdatedTime = useMemo(() => getLatestUpdatedTime(projects), [projects]);

  const projectStats = useMemo(() => {
    const newProjects = projects.filter((p) => p.status === "planning").length;
    const ongoing = projects.filter((p) => p.status === "in_progress").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    return { total, newProjects, ongoing, completed };
  }, [projects, total]);

  const handleEditProject = (project: ProjectWithQuotation) => {
    setEditingProject(project);
    setIsEditOpen(true);
  };

  const handleDelete = (projectId: string) => {
    setProjectToDelete(projectId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    const currentUserId = userId || enhancedUser?.id;
    if (!projectToDelete || !currentUserId) return;

    try {
      await cancelProject(projectToDelete, currentUserId);
      await onRefresh();
      setShowDeleteDialog(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error cancelling project:", error);
      toast({
        title: "Error",
        description: "Failed to cancel project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = projectStatusOptions.find((opt) => opt.value === status);
    const getStatusColor = (status: string) => {
      switch (status) {
        case "planning": return "bg-blue-100 text-blue-800 border-blue-200";
        case "in_progress": return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "completed": return "bg-green-100 text-green-800 border-green-200";
        case "cancelled": return "bg-red-100 text-red-800 border-red-200";
        default: return "bg-gray-100 text-gray-800 border-gray-200";
      }
    };
    return (
      <Badge variant="outline" className={`${getStatusColor(status)} border`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const showEmptyState = !projects.length && loading;

  // Determine role display text
  const getRoleText = () => {
    if (isAdmin) {
      return ', our Admin';
    } else if (enhancedUser?.profile?.staffRole?.roleName) {
      return `, our ${enhancedUser.profile.staffRole.roleName}`;
    }
    return '';
  };

  return (
    <div className="relative">
      <div className="container mx-auto p-4">
        <p className="text-primary text-xl font-semibold">
          Hi, {enhancedUser?.profile?.firstName}{getRoleText()}! Welcome Back!
        </p>
        <p className="text-sm font-light text-primary">
          Last Updated: {latestUpdatedTime ? format(latestUpdatedTime, "dd/MM/yyyy, h:mm:ss a") : "No projects"}
        </p>

        <p className="text-lg w-200 mb-2 mt-4 font-bold text-primary">Project Status:</p>

        <div className="w-full p-0 rounded-md grid lg:grid-cols-4 grid-cols-2 gap-4">
          <Card className="card p-6 bg-blue-50 border-blue-200">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <Briefcase className="h-8 w-8 text-blue-600 mb-4" />
                  <p className="text-xl font-bold text-blue-600">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{projectStats.total}</p>
                  <p className="text-lg font-semibold text-blue-600">Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card p-6 bg-yellow-50 border-yellow-200">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <Calendar className="h-8 w-8 text-yellow-600 mb-4" />
                  <p className="text-xl font-bold text-yellow-600">New</p>
                  <p className="text-2xl font-bold text-yellow-900">{projectStats.newProjects}</p>
                  <p className="text-lg font-semibold text-yellow-600">Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card p-6 bg-green-50 border-green-200">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <Clock className="h-8 w-8 text-green-600 mb-4" />
                  <p className="text-xl font-bold text-green-600">Ongoing</p>
                  <p className="text-2xl font-bold text-green-900">{projectStats.ongoing}</p>
                  <p className="text-lg font-semibold text-green-600">Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card p-6 bg-purple-50 border-purple-200">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <DollarSign className="h-8 w-8 text-purple-600 mb-4" />
                  <p className="text-xl font-bold text-purple-600">Completed</p>
                  <p className="text-2xl font-bold text-purple-900">{projectStats.completed}</p>
                  <p className="text-lg font-semibold text-purple-600">Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-row justify-between items-center">
          <p className="text-primary text-lg font-bold">Management:</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showEmptyState ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-primary">
              <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium">Loading your projects…</p>
              <p className="text-sm text-primary/70">This may take a few seconds the first time.</p>
            </div>
          ) : (
            projects.map((project) => (
              <Card key={project.id} className="card flex flex-col h-full">
                <CardHeader>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-2 mb-2" title={project.name}>
                        {project.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">{getStatusBadge(project.status)}</div>
                    </div>
                    <div className="flex space-x-1 shrink-0">
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="ghost" size="sm" title="View Project">
                          <Info className="w-4 h-4" />
                        </Button>
                      </Link>
                      {/* Only show edit/delete buttons if project is not cancelled, or if user is admin */}
                      {(!project.status || project.status !== "cancelled" || isAdmin) && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEditProject(project)} title="Edit Project">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(project.id.toString())}
                            title="Delete Project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {project.startDate ? format(new Date(project.startDate), "dd/MM/yyyy") : "Not set"} -{" "}
                        {project.endDate ? format(new Date(project.endDate), "dd/MM/yyyy") : "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Created by: {project.createdByUser.firstName} {project.createdByUser.lastName}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {!showEmptyState && projects.length === 0 && total === 0 && (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No projects match your search criteria.</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filter settings.</p>
          </div>
        )}

        {!loading && total === 0 && !searchQuery && statusFilter === "all" && (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No projects available.</p>
            <p className="text-sm text-muted-foreground mt-2">Create projects from accepted or paid quotations.</p>
          </div>
        )}

        <ProjectPagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
        />

        <EditProjectDialog isOpen={isEditOpen} onOpenChange={setIsEditOpen} onSuccess={onRefresh} project={editingProject} />

        <ProjectCollaboratorsDialog
          isOpen={isCollaboratorsOpen}
          onOpenChange={setIsCollaboratorsOpen}
          projectId={selectedProject?.id || 0}
          projectName={selectedProject?.name || ""}
        />

        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setProjectToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Cancel Project"
          description="Are you sure you want to cancel this project? This will change the project status to 'cancelled' and prevent further modifications."
          confirmText="Cancel Project"
          cancelText="Keep Project"
          variant="danger"
        />
      </div>

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 text-primary">
            <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-medium">Refreshing projects…</p>
          </div>
        </div>
      )}
    </div>
  );
}


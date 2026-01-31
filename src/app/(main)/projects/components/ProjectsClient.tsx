"use client";

import { Calendar, Info, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, DollarSign, Clock } from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef, useTransition } from "react";
import { cancelProject, getProjectsPaginated, invalidateProjectsCache } from "../action";
import { formatDateStringNumeric, formatLocalDate, formatLocalDateTimeForDisplay } from "@/lib/date-utils";
import EditProjectDialog from "./EditProjectDialog";
import ProjectSearchBar from "./ProjectSearchBar";
import ProjectCollaboratorsDialog from "./ProjectCollaboratorsDialog";
import { useSession } from "../../contexts/SessionProvider";
import { projectStatusOptions, ProjectsPaginatedResult } from "../types";
import Link from "next/link";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ProjectPagination } from "./ProjectPagination";
import { toast } from "@/components/ui/use-toast";

interface ProjectsClientProps {
  initialData: ProjectsPaginatedResult;
  userId?: string;
  initialIsAdmin?: boolean;
  initialUserRole?: string | null;
}

export default function ProjectsClient({ 
  initialData, 
  userId, 
  initialIsAdmin = false,
  initialUserRole = null 
}: ProjectsClientProps) {
  const { enhancedUser } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projects, setProjects] = useState<ProjectsPaginatedResult['projects']>(initialData.projects);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSizeState] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectsPaginatedResult['projects'][0] | null>(null);
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectsPaginatedResult['projects'][0] | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  // Use server-provided role info (no client fetch needed)
  const isAdmin = initialIsAdmin;
  const userSystemRole = initialUserRole;
  
  // Track initial mount to skip redundant fetch
  const isInitialMount = useRef(true);
  // Track if we have valid initial data
  const hasInitialData = useRef(initialData.projects.length > 0 || initialData.total === 0);

  // Gate date display behind mount so we use local time (correct for Malaysia); avoids hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Use transition for smoother loading states
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Combined loading state
  const loading = isPending || isRefreshing;

  // Fetch projects using cached endpoint (tag-based revalidation)
  const fetchProjects = useCallback(async () => {
    const currentUserId = userId || enhancedUser?.id;
    if (!currentUserId) return;

    try {
      const result = await getProjectsPaginated(
        currentUserId,
        page,
        pageSize,
        searchQuery || undefined,
        statusFilter !== "all" ? statusFilter : undefined
      );
      setProjects(result.projects);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      // Silent fail - data will remain stale but UI won't break
    }
  }, [userId, enhancedUser?.id, page, pageSize, searchQuery, statusFilter]);

  // Fetch when filters/pagination change (skip initial if we have server data)
  useEffect(() => {
    // Skip initial fetch if server already provided data
    if (isInitialMount.current && hasInitialData.current) {
      isInitialMount.current = false;
      return;
    }
    isInitialMount.current = false;
    
    // Use transition for non-blocking UI updates
    startTransition(() => {
      fetchProjects();
    });
  }, [page, pageSize, searchQuery, statusFilter, fetchProjects]);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleCacheInvalidate = async () => {
      // Invalidate server cache, then refetch (will get fresh data due to tag revalidation)
      await invalidateProjectsCache();
      setIsRefreshing(true);
      try {
        await fetchProjects();
      } finally {
        setIsRefreshing(false);
      }
    };

    window.addEventListener('projectsCacheInvalidate', handleCacheInvalidate);
    return () => window.removeEventListener('projectsCacheInvalidate', handleCacheInvalidate);
  }, [fetchProjects]);

  // Manual refresh: invalidate cache then refetch
  const onRefresh = useCallback(async () => {
    await invalidateProjectsCache();
    setIsRefreshing(true);
    try {
      await fetchProjects();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchProjects]);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const getLatestUpdatedTime = (projects: ProjectsPaginatedResult['projects']) => {
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

  const handleEditProject = (project: ProjectsPaginatedResult['projects'][0]) => {
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

  // Determine role display text. Use profile.userRoles (server-provided) first so first paint matches server and avoids hydration mismatch.
  const getRoleText = () => {
    if (enhancedUser?.profile?.staffRole?.roleName) {
      return `, our ${enhancedUser.profile.staffRole.roleName}`;
    }
    const systemRole = userSystemRole ?? enhancedUser?.profile?.userRoles?.[0]?.role?.slug ?? null;
    if (systemRole) {
      const roleDisplay = systemRole === "brand-advisor"
        ? "Brand Advisor"
        : systemRole === "operation-user"
        ? "Operation User"
        : systemRole === "admin"
        ? "Admin"
        : systemRole === "staff"
        ? "Staff"
        : systemRole;
      return `, our ${roleDisplay}`;
    }
    return "";
  };

  return (
    <div className="relative">
      <div className="container mx-auto p-4">
        <p className="text-primary text-xl font-semibold">
          Hi, {enhancedUser?.profile?.firstName}{getRoleText()}! Welcome Back!
        </p>
        <p className="text-sm font-light text-primary">
          Last Updated: {!isMounted ? "--" : latestUpdatedTime ? formatLocalDateTimeForDisplay(latestUpdatedTime) : "No projects"}
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

        {/* Projects Grid - reserve min height to prevent layout jump */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[200px] transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
          {showEmptyState ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-primary">
              <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium">Loading your projects…</p>
              <p className="text-sm text-primary/70">This may take a few seconds the first time.</p>
            </div>
          ) : (
            projects.map((project) => {
              // After mount use local time so Malaysia (and other TZ) see correct calendar day; before mount show placeholder for hydration
              const startDisplay = !isMounted
                ? "--"
                : project.startDate
                  ? formatDateStringNumeric(formatLocalDate(new Date(project.startDate)))
                  : "Not set";
              const endDisplay = !isMounted
                ? "--"
                : project.endDate
                  ? formatDateStringNumeric(formatLocalDate(new Date(project.endDate)))
                  : "Not set";
              return (
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
                        {startDisplay} - {endDisplay}
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
              );
            })
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

      {/* Loading overlay with smooth fade transition */}
      <div 
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px] transition-opacity duration-200 ${
          loading ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!loading}
      >
        <div className="flex flex-col items-center gap-3 text-primary">
          <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium">Refreshing projects…</p>
        </div>
      </div>
    </div>
  );
}


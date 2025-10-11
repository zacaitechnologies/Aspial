"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, User, Target, ChevronDown, ClipboardList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskWithAssignee, Milestone } from "../types";
import { getProjectTasks, getProjectCollaborators } from "../task-actions";
import { getProjectMilestones } from "../milestone-actions";
import { TaskForm } from "./TaskForm";
import { TaskCard } from "./TaskCard";
import { MilestoneCard } from "./MilestoneCard";
import { MilestoneForm } from "./MilestoneForm";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  supabase_id: string;
};

interface KanbanBoardProps {
  projectId: string;
  sortBy?: "dueDate" | "createDate" | "priority";
  sortOrder?: "asc" | "desc";
  onSortByChange?: (sortBy: "dueDate" | "createDate" | "priority") => void;
  onSortOrderChange?: (sortOrder: "asc" | "desc") => void;
}

export function KanbanBoard({
  projectId,
  sortBy = "createDate",
  sortOrder = "desc",
  onSortByChange,
  onSortOrderChange,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectTasks, collaborators, projectMilestones] =
          await Promise.all([
            getProjectTasks(parseInt(projectId)),
            getProjectCollaborators(parseInt(projectId)),
            getProjectMilestones(parseInt(projectId)),
          ]);
        setTasks(projectTasks);
        setUsers(collaborators);
        setMilestones(projectMilestones);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Refresh all data function
  const refreshData = async () => {
    try {
      const [projectTasks, collaborators, projectMilestones] =
        await Promise.all([
          getProjectTasks(parseInt(projectId)),
          getProjectCollaborators(parseInt(projectId)),
          getProjectMilestones(parseInt(projectId)),
        ]);
      setTasks(projectTasks);
      setUsers(collaborators);
      setMilestones(projectMilestones);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const getTasksForColumn = (columnId: string) => {
    const columnTasks = tasks.filter((task) => task.status === columnId);

    // Sort tasks based on props
    return columnTasks.sort((a, b) => {
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

  const handleTaskCreated = async (newTask: TaskWithAssignee) => {
    setTasks((prev) => [...prev, newTask]);
    // Refresh milestones to update task counts
    await refreshData();
  };

  const handleTaskUpdated = async (updatedTask: TaskWithAssignee) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    // Refresh milestones to update task counts
    await refreshData();
  };

  const handleTaskDeleted = async (taskId: number) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    // Refresh milestones to update task counts
    await refreshData();
  };

  const handleMilestoneCreated = (newMilestone: Milestone) => {
    setMilestones((prev) => [...prev, newMilestone]);
  };

  const handleMilestoneUpdated = (updatedMilestone: Milestone) => {
    setMilestones((prev) =>
      prev.map((milestone) =>
        milestone.id === updatedMilestone.id ? updatedMilestone : milestone
      )
    );
  };

  const handleMilestoneDeleted = (milestoneId: number) => {
    setMilestones((prev) =>
      prev.filter((milestone) => milestone.id !== milestoneId)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("text/plain", taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData("text/plain"));

    try {
      const { updateTaskStatus } = await import("../task-actions");
      await updateTaskStatus(taskId, newStatus as any);

      // Update local state
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus as any } : task
        )
      );

      // Refresh milestones to update task progress
      await refreshData();
    } catch (error) {
      console.error("Error updating task status:", error);
    }
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

  return (
    <div className="space-y-6">
      {/* Tasks Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <TaskForm
            projectId={parseInt(projectId)}
            availableUsers={users}
            availableMilestones={milestones}
            onTaskCreated={handleTaskCreated}
            trigger={
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Create New Task
              </Button>
            }
          />

          <MilestoneForm
            projectId={parseInt(projectId)}
            onMilestoneCreated={handleMilestoneCreated}
            trigger={
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Target className="w-4 h-4 mr-2" />
                Add Milestone
              </Button>
            }
          />
        </div>
      </div>

      {/* Milestones Section */}
      {milestones.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-yellow-600" />
            <p className="font-semibold text-foreground">Project Milestones</p>
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-600 border-yellow-200"
            >
              {milestones.length}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {milestones.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                onMilestoneUpdated={handleMilestoneUpdated}
                onMilestoneDeleted={handleMilestoneDeleted}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sorting Controls */}
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-2">
          <ClipboardList className="w-5 h-5 text-yellow-600" />
          <h2 className="font-semibold text-foreground">Project Tasks</h2>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                {getSortLabel()}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSortByChange?.("createDate")}>
                Create Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortByChange?.("dueDate")}>
                Due Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortByChange?.("priority")}>
                Priority
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              onSortOrderChange?.(sortOrder === "asc" ? "desc" : "asc")
            }
            className="flex items-center gap-2"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do Column */}
        <div
          className="space-y-4"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "todo")}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              To Do
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-600 border-blue-200"
              >
                {getTasksForColumn("todo").length}
              </Badge>
            </h3>
          </div>

          {getTasksForColumn("todo").length > 0 ? (
            getTasksForColumn("todo").map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                availableUsers={users}
                availableMilestones={milestones}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
                onDragStart={(e) => handleDragStart(e, task.id)}
              />
            ))
          ) : (
            <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Drop tasks here</p>
            </div>
          )}
        </div>

        {/* In Progress Column */}
        <div
          className="space-y-4"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "in_progress")}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              In Progress
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-600 border-yellow-200"
              >
                {getTasksForColumn("in_progress").length}
              </Badge>
            </h3>
          </div>

          {getTasksForColumn("in_progress").length > 0 ? (
            getTasksForColumn("in_progress").map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                availableUsers={users}
                availableMilestones={milestones}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
                onDragStart={(e) => handleDragStart(e, task.id)}
              />
            ))
          ) : (
            <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Drop tasks here</p>
            </div>
          )}
        </div>

        {/* Done Column */}
        <div
          className="space-y-4"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "done")}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Done
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-600 border-green-200"
              >
                {getTasksForColumn("done").length}
              </Badge>
            </h3>
          </div>

          {getTasksForColumn("done").length > 0 ? (
            getTasksForColumn("done").map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                availableUsers={users}
                availableMilestones={milestones}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
                onDragStart={(e) => handleDragStart(e, task.id)}
              />
            ))
          ) : (
            <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Drop tasks here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

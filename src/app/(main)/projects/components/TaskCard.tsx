"use client";

import { useState, memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Flag,
  MoreHorizontal,
  Target,
  Edit,
  Trash2,
} from "lucide-react";
import { TaskWithAssignee, Milestone } from "../types";
import { TaskForm } from "./TaskForm";
import { deleteTask } from "../task-actions";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithAssignee;
  availableUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
  }>;
  availableMilestones?: Milestone[];
  onTaskUpdated?: (task: TaskWithAssignee) => void;
  onTaskDeleted?: (taskId: number) => void;
  isSelected?: boolean;
  onSelectChange?: (taskId: number, selected: boolean) => void;
  isProjectCancelled?: boolean;
}

export const TaskCard = memo(function TaskCard({
  task,
  availableUsers,
  availableMilestones,
  onTaskUpdated,
  onTaskDeleted,
  isSelected = false,
  onSelectChange,
  isProjectCancelled = false,
}: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      onTaskDeleted?.(task.id);
      setIsDeleteDialogOpen(false);
      toast({
        title: "Success",
        description: "Task deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card
      className={cn(
        "mb-3 gap-2 border-2 border-foreground/20 bg-card shadow-sm transition-shadow hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        task.milestone && "border-l-4 border-l-yellow-400 bg-yellow-50/30"
      )}
    >
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {!isProjectCancelled && onSelectChange && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) =>
                  onSelectChange(task.id, checked === true)
                }
                aria-label={`Select task ${task.title}`}
                className="mt-1 h-4 w-4 border-2 border-foreground/45"
              />
            )}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {task.milestone && (
                  <Target className="h-4 w-4 text-yellow-600 shrink-0" />
                )}
                <h4 className="font-medium text-card-foreground break-words">
                  {task.title}
                </h4>
              </div>
              {task.description && (
                <p
                  className="text-sm text-muted-foreground break-words line-clamp-3"
                  title={task.description}
                >
                  {task.description}
                </p>
              )}
            </div>
          </div>
          {!isProjectCancelled ? (
            <div className="flex items-center gap-1 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Task
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                      </DialogHeader>
                      <TaskForm
                        projectId={task.projectId}
                        task={task}
                        availableUsers={availableUsers}
                        availableMilestones={availableMilestones}
                        onTaskUpdated={(updatedTask) => {
                          onTaskUpdated?.(updatedTask);
                          setIsEditDialogOpen(false);
                          if (typeof window !== "undefined") {
                            window.location.href = `${window.location.pathname}?tab=tasks`;
                          }
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsDeleteDialogOpen(true);
                    }}
                    disabled={isDeleting}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-300">
              Read-only
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {/* Milestone Badge */}
        {task.milestone && (
          <div>
            <Badge
              variant="outline"
              className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300 flex items-center gap-1 w-fit"
            >
              <Target className="w-3 h-3" />
              {task.milestone.title}
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center">
            <Flag className="w-3 h-3 text-muted-foreground" />
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground border-muted-foreground/30 capitalize"
            >
              {task.priority}
            </Badge>
          </div>
          {task.startDate && task.dueDate && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-100 border border-blue-200">
                <Clock className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-xs font-medium text-blue-900">
                  {new Date(task.startDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {" - "}
                  {new Date(task.dueDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {(task.creator || task.assignee) && (
          <div className="flex flex-col gap-2 pt-0.5">
            {task.creator && (
              <div className="flex min-w-0 max-w-full items-center gap-2">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  Created by
                </span>
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {task.creator.firstName.charAt(0)}
                    {task.creator.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-foreground">
                  {task.creator.firstName} {task.creator.lastName}
                </span>
              </div>
            )}
            {task.assignee && (
              <div className="flex min-w-0 max-w-full items-center gap-2">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  Assigned to
                </span>
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {task.assignee.firstName?.charAt(0) ?? "?"}
                    {task.assignee.lastName?.charAt(0) ?? ""}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-foreground">
                  {task.assignee.firstName} {task.assignee.lastName}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </Card>
  );
});

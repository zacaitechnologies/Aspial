"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  onDragStart?: (e: React.DragEvent) => void;
  isProjectCancelled?: boolean;
}

export function TaskCard({
  task,
  availableUsers,
  availableMilestones,
  onTaskUpdated,
  onTaskDeleted,
  onDragStart,
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
      className={`bg-card border-border hover:shadow-md transition-shadow cursor-move mb-3 ${
        task.milestone
          ? "border-l-4 border-l-yellow-400 bg-yellow-50/30"
          : ""
      }`}
      draggable
      onDragStart={onDragStart}
    >
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              {task.milestone && (
                <Target className="h-4 w-4 text-yellow-600" />
              )}
              <h4 className="font-medium text-card-foreground">{task.title}</h4>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground">
                {task.description}
              </p>
            )}
          </div>
          {!isProjectCancelled ? (
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
                        // Refresh page with tasks tab preserved
                        if (typeof window !== 'undefined') {
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
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-300">
              Read-only
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
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

        <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {new Date(task.startDate).toLocaleDateString("en-UK", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              -
              {new Date(task.dueDate).toLocaleDateString("en-UK", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
        </div>

        {task.creator && (
          <div className="flex items-center gap-2 pt-1">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {task.creator.firstName.charAt(0)}
                {task.creator.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {task.creator.firstName} {task.creator.lastName}
            </span>
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
}

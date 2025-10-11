"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Calendar,
  Flag,
  MoreHorizontal,
  Target,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Package,
} from "lucide-react";
import { Milestone } from "../types";
import { MilestoneForm } from "./MilestoneForm";
import { deleteMilestone } from "../milestone-actions";

interface MilestoneCardProps {
  milestone: Milestone;
  onMilestoneUpdated?: (milestone: Milestone) => void;
  onMilestoneDeleted?: (milestoneId: number) => void;
}

export function MilestoneCard({
  milestone,
  onMilestoneUpdated,
  onMilestoneDeleted,
}: MilestoneCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;

    setIsDeleting(true);
    try {
      await deleteMilestone(milestone.id);
      onMilestoneDeleted?.(milestone.id);
    } catch (error) {
      console.error("Error deleting milestone:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "not_started":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-3 h-3" />;
      case "in_progress":
        return <Clock className="w-3 h-3" />;
      case "not_started":
        return <Target className="w-3 h-3" />;
      default:
        return <Target className="w-3 h-3" />;
    }
  };

  const completedTasks = milestone.tasks?.filter(task => task.status === 'done').length || 0;
  const totalTasks = milestone.tasks?.length || 0;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card className="bg-card border-border hover:shadow-md transition-shadow mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-yellow-600" />
              <h4 className="font-medium text-card-foreground">{milestone.title}</h4>
            </div>
            {milestone.description && (
              <p className="text-sm text-muted-foreground">
                {milestone.description}
              </p>
            )}
          </div>
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
                    Edit Milestone
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Milestone</DialogTitle>
                  </DialogHeader>
                  <MilestoneForm
                    projectId={milestone.projectId}
                    milestone={milestone}
                    onMilestoneUpdated={(updatedMilestone) => {
                      onMilestoneUpdated?.(updatedMilestone);
                      setIsEditDialogOpen(false);
                    }}
                    onCancel={() => setIsEditDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              <DropdownMenuItem
                onSelect={handleDelete}
                disabled={isDeleting}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-3 h-3 text-muted-foreground" />
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground border-muted-foreground/30 capitalize"
            >
              {milestone.priority}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(milestone.status)}
            <Badge
              variant="outline"
              className={`text-xs ${getStatusColor(milestone.status)}`}
            >
              {milestone.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedTasks}/{totalTasks} tasks completed
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {Math.round(progressPercentage)}% complete
          </div>
        </div>

        {/* Service */}
        {milestone.service && (
          <div className="flex items-center gap-2 text-xs">
            <Package className="w-3 h-3 text-blue-600" />
            <div className="flex-1">
              <span className="text-blue-600 font-medium">{milestone.service.name}</span>
              <span className="text-muted-foreground ml-2">
                RM {milestone.service.basePrice.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Due Date */}
        {milestone.dueDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Due: {new Date(milestone.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

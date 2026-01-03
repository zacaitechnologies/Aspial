"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useSession } from "../../contexts/SessionProvider";
import { updateProject } from "../action";
import { projectStatusOptions, ProjectFormData } from "../types";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface EditProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  project: {
    id: number;
    name: string;
    description: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
  } | null;
}

export default function EditProjectDialog({
  isOpen,
  onOpenChange,
  onSuccess,
  project,
}: EditProjectDialogProps) {
  const { enhancedUser } = useSession();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Check if user is admin
  const isAdmin = enhancedUser?.profile?.userRoles?.some(ur => ur.role.slug === 'admin') || false;
  const isProjectCancelled = project?.status === "cancelled";
  
  const [form, setForm] = useState<ProjectFormData>({
    name: "",
    description: "",
    status: "planning",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        description: project.description || "",
        status: project.status,
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
      });
    }
  }, [project]);

  const handleSubmit = async () => {
    if (!project || !form.name) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!enhancedUser?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to update a project.",
        variant: "destructive",
      });
      return;
    }

    // Prevent non-admins from editing cancelled projects
    if (isProjectCancelled && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can edit cancelled projects.",
        variant: "destructive",
      });
      return;
    }

    if (isUpdating) return; // Prevent double submission

    try {
      setIsUpdating(true);
      await updateProject(
        project.id.toString(),
        {
          name: form.name,
          description: form.description || undefined,
          status: form.status as "planning" | "in_progress" | "on_hold" | "completed" | "cancelled",
          startDate: form.startDate ? new Date(form.startDate) : undefined,
          endDate: form.endDate ? new Date(form.endDate) : undefined,
        },
        enhancedUser.id
      );

      toast({
        title: "Success",
        description: "Project updated successfully.",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating project:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update project. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[500px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        {isProjectCancelled && !isAdmin && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 font-medium">
              This project is cancelled. Only administrators can edit cancelled projects.
            </p>
          </div>
        )}
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name"
              disabled={isProjectCancelled && !isAdmin}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter project description"
              rows={3}
              disabled={isProjectCancelled && !isAdmin}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}
              disabled={isProjectCancelled && !isAdmin}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projectStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                disabled={isProjectCancelled && !isAdmin}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                disabled={isProjectCancelled && !isAdmin}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating || (isProjectCancelled && !isAdmin)}>
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Project"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
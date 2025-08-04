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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { 
  inviteProjectCollaborator, 
  getProjectPermissions, 
  removeProjectCollaborator,
  updateProjectPermission 
} from "../permissions";
import { User, Users, X, Crown, Eye, Edit } from "lucide-react";

interface ProjectCollaboratorsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
}

type ProjectPermission = {
  id: number;
  userId: string;
  projectId: number;
  canView: boolean;
  canEdit: boolean;
  isOwner: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export default function ProjectCollaboratorsDialog({
  isOpen,
  onOpenChange,
  projectId,
  projectName,
}: ProjectCollaboratorsDialogProps) {
  const [permissions, setPermissions] = useState<ProjectPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermissions, setInvitePermissions] = useState({
    canView: true,
    canEdit: true,
    isOwner: false,
  });

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
    }
  }, [isOpen, projectId]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const data = await getProjectPermissions(projectId);
      setPermissions(data as ProjectPermission[]);
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCollaborator = async () => {
    if (!inviteEmail.trim()) {
      alert("Please enter an email address");
      return;
    }

    try {
      // For now, we'll use the email as userId (you might want to implement user lookup)
      const userId = inviteEmail; // This should be replaced with actual user lookup
      
      await inviteProjectCollaborator(
        projectId,
        userId,
        invitePermissions.canView,
        invitePermissions.canEdit,
        invitePermissions.isOwner
      );

      setInviteEmail("");
      setInvitePermissions({
        canView: true,
        canEdit: true,
        isOwner: false,
      });
      
      await fetchPermissions();
      alert("Collaborator invited successfully!");
    } catch (error) {
      console.error("Error inviting collaborator:", error);
      alert("Failed to invite collaborator. Please try again.");
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      await removeProjectCollaborator(projectId, userId);
      await fetchPermissions();
      alert("Collaborator removed successfully!");
    } catch (error) {
      console.error("Error removing collaborator:", error);
      alert("Failed to remove collaborator. Please try again.");
    }
  };

  const handleUpdatePermission = async (
    userId: string,
    canView?: boolean,
    canEdit?: boolean,
    isOwner?: boolean
  ) => {
    try {
      await updateProjectPermission(projectId, userId, canView, canEdit, isOwner);
      await fetchPermissions();
    } catch (error) {
      console.error("Error updating permission:", error);
      alert("Failed to update permission. Please try again.");
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading collaborators...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Project Collaborators - {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite New Collaborator */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Invite New Collaborator</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="Enter collaborator's email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="flex gap-2 mt-2">
                  <Checkbox
                    id="can-view"
                    checked={invitePermissions.canView}
                    onCheckedChange={(checked) =>
                      setInvitePermissions(prev => ({ ...prev, canView: !!checked }))
                    }
                  />
                  <Label htmlFor="can-view" className="text-sm">View</Label>
                  
                  <Checkbox
                    id="can-edit"
                    checked={invitePermissions.canEdit}
                    onCheckedChange={(checked) =>
                      setInvitePermissions(prev => ({ ...prev, canEdit: !!checked }))
                    }
                  />
                  <Label htmlFor="can-edit" className="text-sm">Edit</Label>
                  
                  <Checkbox
                    id="is-owner"
                    checked={invitePermissions.isOwner}
                    onCheckedChange={(checked) =>
                      setInvitePermissions(prev => ({ ...prev, isOwner: !!checked }))
                    }
                  />
                  <Label htmlFor="is-owner" className="text-sm">Owner</Label>
                </div>
              </div>
            </div>
            <Button onClick={handleInviteCollaborator} className="w-full">
              <User className="w-4 h-4 mr-2" />
              Invite Collaborator
            </Button>
          </div>

          {/* Current Collaborators */}
          <div className="space-y-4">
            <h3 className="font-semibold">Current Collaborators</h3>
            <div className="space-y-3">
              {permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">
                        {permission.user.firstName} {permission.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {permission.user.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {permission.isOwner && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Owner
                      </Badge>
                    )}
                    {permission.canView && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </Badge>
                    )}
                    {permission.canEdit && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Edit className="w-3 h-3" />
                        Edit
                      </Badge>
                    )}
                    
                    {!permission.isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCollaborator(permission.userId)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {permissions.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No collaborators yet. Invite someone to get started!
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
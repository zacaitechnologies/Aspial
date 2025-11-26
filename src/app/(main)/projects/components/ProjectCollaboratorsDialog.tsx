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
import { useState, useEffect, useCallback } from "react";
import { 
  getProjectPermissions, 
  removeProjectCollaborator,
  updateProjectPermission,
  getAvailableUsersForProject,
  createProjectInvitation,
  getProjectInvitations,
  isUserAdmin
} from "../permissions";
import { User, Users, X, Crown, CheckCircle2, AlertCircle } from "lucide-react";
import { useSession } from "../../contexts/SessionProvider";
import { 
  ProjectPermission, 
  AvailableUser, 
  ProjectInvitation 
} from "../types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ProjectCollaboratorsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
}

export default function ProjectCollaboratorsDialog({
  isOpen,
  onOpenChange,
  projectId,
  projectName,
}: ProjectCollaboratorsDialogProps) {
  const { enhancedUser } = useSession();
  const [permissions, setPermissions] = useState<ProjectPermission[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [makeOwner, setMakeOwner] = useState(false);
  const [projectCreatorId, setProjectCreatorId] = useState<string | null>(null);
  const [isUserAdminRole, setIsUserAdminRole] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");



  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingError(null);
      console.log("Fetching permissions for project:", projectId);
      
      // Try to fetch all data
      let permissionsData: any[] = [];
      let availableUsersData: any[] = [];
      let invitationsData: any[] = [];
      
      // Fetch project permissions (current collaborators)
      try {
        console.log("Fetching project permissions...");
        permissionsData = await getProjectPermissions(projectId);
        console.log("Permissions data:", permissionsData);
      } catch (error) {
        console.error("Failed to fetch permissions:", error);
        permissionsData = [];
      }
      
      // Fetch available users for invitation
      try {
        console.log("Fetching available users...");
        availableUsersData = await getAvailableUsersForProject(projectId);
        console.log("Available users data:", availableUsersData);
      } catch (error) {
        console.error("Failed to fetch available users:", error);
        // If this fails, let's try a simpler approach - get all users
        try {
          console.log("Trying to get all users as fallback...");
          const { getAllUsers } = await import("../permissions");
          availableUsersData = await getAllUsers();
          console.log("All users data:", availableUsersData);
        } catch (fallbackError) {
          console.error("Failed to fetch all users:", fallbackError);
          availableUsersData = [];
        }
      }
      
      // Fetch project invitations
      try {
        console.log("Fetching project invitations...");
        invitationsData = await getProjectInvitations(projectId);
        console.log("Invitations data:", invitationsData);
      } catch (error) {
        console.error("Failed to fetch invitations:", error);
        invitationsData = [];
      }
      
      // Fetch project creator
      try {
        const { getProjectCreator } = await import("../permissions");
        const creator = await getProjectCreator(projectId);
        setProjectCreatorId(creator);
      } catch (error) {
        console.error("Failed to fetch project creator:", error);
      }
      
      // Check if current user is admin
      if (enhancedUser?.id) {
        try {
          const adminStatus = await isUserAdmin(enhancedUser.id);
          console.log("User admin status:", adminStatus, "for user:", enhancedUser.id);
          setIsUserAdminRole(adminStatus);
        } catch (error) {
          console.error("Failed to check admin status:", error);
        }
      }
      
      // Set all the data
      setPermissions(permissionsData as ProjectPermission[]);
      setAvailableUsers(availableUsersData as AvailableUser[]);
      setInvitations(invitationsData as ProjectInvitation[]);
      
      console.log("Dialog is working - permissions:", permissionsData.length, "users:", availableUsersData.length, "invitations:", invitationsData.length);
      
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setLoadingError(error instanceof Error ? error.message : 'Failed to load collaborators');
      // Set empty arrays to prevent infinite loading
      setPermissions([]);
      setAvailableUsers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchPermissions();
    }
  }, [isOpen, projectId, fetchPermissions]);

  const handleInviteCollaborator = async () => {
    setSuccessMessage("");
    setErrorMessage("");
    
    if (!selectedUserId) {
      setErrorMessage("Please select a user to invite");
      return;
    }

    if (!enhancedUser?.id) {
      setErrorMessage("User not authenticated");
      return;
    }

    try {
      const selectedUser = availableUsers.find(user => user.supabase_id === selectedUserId);
      const userName = selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'User';
      
      console.log("Inviting user:", selectedUserId, "as owner:", makeOwner);
      
      // Always grant view and edit permissions, only owner status varies
      const result = await createProjectInvitation(
        projectId,
        enhancedUser.id,
        selectedUserId,
        true, // canView - always true
        true, // canEdit - always true
        makeOwner // isOwner - based on checkbox
      );
      
      console.log("Invitation created successfully:", result);
      setSuccessMessage(`Invitation sent successfully to ${userName}!`);
      
      // Reset form
      setSelectedUserId("");
      setMakeOwner(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
      
      // Refresh data
      await fetchPermissions();
    } catch (error) {
      console.error("Error sending invitation:", error);
      setErrorMessage("Failed to send invitation: " + (error instanceof Error ? error.message : "Please try again."));
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    setSuccessMessage("");
    setErrorMessage("");
    
    if (!enhancedUser?.id) {
      setErrorMessage("User not authenticated");
      return;
    }

    try {
      await removeProjectCollaborator(projectId, userId, enhancedUser.id);
      await fetchPermissions();
      setSuccessMessage("Collaborator removed successfully!");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error removing collaborator:", error);
      setErrorMessage("Failed to remove collaborator: " + (error instanceof Error ? error.message : "Please try again."));
    }
  };

  const handleToggleOwner = async (userId: string, currentIsOwner: boolean) => {
    setSuccessMessage("");
    setErrorMessage("");
    
    if (!enhancedUser?.id) {
      setErrorMessage("User not authenticated");
      return;
    }

    try {
      await updateProjectPermission(projectId, userId, enhancedUser.id, !currentIsOwner);
      await fetchPermissions();
      setSuccessMessage(`Collaborator ${!currentIsOwner ? 'promoted to' : 'demoted from'} owner successfully!`);
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error updating permission:", error);
      setErrorMessage("Failed to update permission: " + (error instanceof Error ? error.message : "Please try again."));
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading collaborators...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--lightGreen)]"></div>
            <span className="ml-2">Loading project collaborators...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (loadingError) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error Loading Collaborators</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{loadingError}</p>
            <Button onClick={fetchPermissions} variant="outline">
              Retry
            </Button>
          </div>
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
          {/* Success/Error Messages */}
          {successMessage && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          {errorMessage && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Invite New Collaborator */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Invite New Collaborator</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="mb-2" htmlFor="invite-user">Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user to invite" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.supabase_id} value={user.supabase_id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    All users are already collaborators on this project.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  All collaborators can view and edit the project
                </Label>
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                  <Checkbox
                    id="is-owner"
                    checked={makeOwner}
                    onCheckedChange={(checked) => setMakeOwner(!!checked)}
                  />
                  <Label htmlFor="is-owner" className="flex items-center gap-2 cursor-pointer">
                    <Crown className="w-4 h-4" />
                    <span>Grant owner permissions</span>
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Owners can delete the project and manage collaborators
                </p>
              </div>
            </div>
            <Button 
              onClick={handleInviteCollaborator} 
              className="w-full"
              disabled={!selectedUserId || availableUsers.length === 0}
            >
              <User className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </div>

          {/* Pending Invitations */}
          {invitations.filter(inv => inv.status === "pending").length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Pending Invitations</h3>
              <div className="space-y-3">
                {invitations
                  .filter(inv => inv.status === "pending")
                  .map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">
                            {invitation.invitee.firstName} {invitation.invitee.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invitation.invitee.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Invited by {invitation.inviter.firstName} {invitation.inviter.lastName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-yellow-700 bg-yellow-100">
                          Pending
                        </Badge>
                        {invitation.isOwner && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Owner
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Current Collaborators */}
          <div className="space-y-4">
            <h3 className="font-semibold">Current Collaborators</h3>
            <div className="space-y-3">
              {permissions.map((permission) => {
                const isCreator = permission.userId === projectCreatorId;
                const currentUserIsOwner = permissions.find(p => p.userId === enhancedUser?.id)?.isOwner;
                const canManage = isUserAdminRole || (currentUserIsOwner && !isCreator);
                
                return (
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
                      {isCreator && (
                        <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800">
                          <Crown className="w-3 h-3" />
                          Creator
                        </Badge>
                      )}
                      {permission.isOwner && !isCreator && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Owner
                        </Badge>
                      )}
                      
                      {/* Show controls if current user is admin or owner (and target is not the creator) */}
                      {canManage && !isCreator && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleOwner(permission.userId, permission.isOwner)}
                          >
                            {permission.isOwner ? 'Demote' : 'Promote'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCollaborator(permission.userId)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {permissions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No collaborators yet. Invite someone to get started!
                  </p>
                  <p className="text-sm text-gray-500">
                    Only the project owner is currently listed. 
                    Invite team members to collaborate on this project.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
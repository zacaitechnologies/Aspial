"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useRouter } from "next/navigation";
import { 
  getProjectPermissions, 
  removeProjectCollaborator,
  updateProjectPermission,
  getAvailableUsersForProject,
  createProjectInvitation,
  getProjectInvitations,
  transferProjectCreator,
} from "../permissions";
import { checkIsAdmin } from "../../actions/admin-actions";
import { User, Users, X, Crown, CheckCircle2, AlertCircle, Loader2, ArrowRightLeft } from "lucide-react";
import { useSession } from "../../contexts/SessionProvider";
import { 
  ProjectPermission, 
  AvailableUser, 
  ProjectInvitation 
} from "../types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";

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
  const router = useRouter();
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
  const [isInviting, setIsInviting] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"promote" | "demote" | "remove" | "transfer" | null>(null);
  
  // Transfer creator confirmation dialog state
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [transferTargetUser, setTransferTargetUser] = useState<{userId: string; name: string} | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);



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
          const adminStatus = await checkIsAdmin(enhancedUser.id);
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
      toast({
        title: "Error",
        description: "Please select a user to invite",
        variant: "destructive",
      });
      return;
    }

    if (!enhancedUser?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
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
      
      // Reset form
      setSelectedUserId("");
      setMakeOwner(false);
      
      // Show success toast
      toast({
        title: "Invitation Sent",
        description: `Invitation sent successfully to ${userName}!`,
      });
      
      // Close dialog and refresh page
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation: " + (error instanceof Error ? error.message : "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!enhancedUser?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    setProcessingUserId(userId);
    setProcessingAction("remove");
    try {
      const removedUser = permissions.find(p => p.userId === userId);
      const userName = removedUser ? `${removedUser.user.firstName} ${removedUser.user.lastName}` : 'Collaborator';
      
      await removeProjectCollaborator(projectId, userId, enhancedUser.id);
      
      // Show success toast
      toast({
        title: "Collaborator Removed",
        description: `${userName} has been removed from the project.`,
      });
      
      // Close dialog and refresh page
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error removing collaborator:", error);
      toast({
        title: "Error",
        description: "Failed to remove collaborator: " + (error instanceof Error ? error.message : "Please try again."),
        variant: "destructive",
      });
    } finally {
      setProcessingUserId(null);
      setProcessingAction(null);
    }
  };

  const handleToggleOwner = async (userId: string, currentIsOwner: boolean) => {
    if (!enhancedUser?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    setProcessingUserId(userId);
    setProcessingAction(currentIsOwner ? "demote" : "promote");
    try {
      const targetUser = permissions.find(p => p.userId === userId);
      const userName = targetUser ? `${targetUser.user.firstName} ${targetUser.user.lastName}` : 'Collaborator';
      
      await updateProjectPermission(projectId, userId, enhancedUser.id, !currentIsOwner);
      
      // Show success toast
      toast({
        title: !currentIsOwner ? "Promoted to Owner" : "Demoted from Owner",
        description: `${userName} has been ${!currentIsOwner ? 'promoted to owner' : 'demoted from owner'}.`,
      });
      
      // Close dialog and refresh page
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating permission:", error);
      toast({
        title: "Error",
        description: "Failed to update permission: " + (error instanceof Error ? error.message : "Please try again."),
        variant: "destructive",
      });
    } finally {
      setProcessingUserId(null);
      setProcessingAction(null);
    }
  };

  // Open transfer confirmation dialog
  const handleOpenTransferConfirm = (userId: string, userName: string) => {
    setTransferTargetUser({ userId, name: userName });
    setTransferConfirmOpen(true);
  };

  // Execute the transfer
  const handleConfirmTransfer = async () => {
    if (!transferTargetUser || !enhancedUser?.id) {
      return;
    }

    setIsTransferring(true);
    try {
      await transferProjectCreator(projectId, enhancedUser.id, transferTargetUser.userId);
      
      toast({
        title: "Creator Role Transferred",
        description: `${transferTargetUser.name} is now the project creator. You have been demoted to owner.`,
      });
      
      setTransferConfirmOpen(false);
      setTransferTargetUser(null);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error transferring creator role:", error);
      toast({
        title: "Error",
        description: "Failed to transfer creator role: " + (error instanceof Error ? error.message : "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
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
              disabled={!selectedUserId || availableUsers.length === 0 || isInviting}
            >
              {isInviting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
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
                const currentUserIsCreator = enhancedUser?.id === projectCreatorId;
                const currentUserIsOwner = permissions.find(p => p.userId === enhancedUser?.id)?.isOwner;
                
                // Only creator or admin can promote/demote
                const canPromoteDemote = isUserAdminRole || currentUserIsCreator;
                
                // Owners can remove non-owners, but only creator/admin can remove owners
                const canRemove = isUserAdminRole || currentUserIsCreator || (currentUserIsOwner && !permission.isOwner);
                
                return (
                  <div
                    key={permission.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {permission.user.firstName} {permission.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {permission.user.email}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
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
                      </div>
                    </div>
                    
                    {/* Action buttons - shown on separate row when there are actions */}
                    {((currentUserIsCreator && !isCreator && permission.isOwner) || 
                      (canPromoteDemote && !isCreator) || 
                      (canRemove && !isCreator)) && (
                      <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
                        {/* Make Creator button - only current creator can transfer role */}
                        {currentUserIsCreator && !isCreator && permission.isOwner && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={() => handleOpenTransferConfirm(
                              permission.userId, 
                              `${permission.user.firstName} ${permission.user.lastName}`
                            )}
                            disabled={processingUserId === permission.userId}
                          >
                            <ArrowRightLeft className="w-3 h-3 mr-1" />
                            Make Creator
                          </Button>
                        )}
                        
                        {/* Promote/Demote button - only creator or admin can use this */}
                        {canPromoteDemote && !isCreator && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleOwner(permission.userId, permission.isOwner)}
                            disabled={processingUserId === permission.userId}
                          >
                            {processingUserId === permission.userId && (processingAction === "promote" || processingAction === "demote") ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                {processingAction === "promote" ? "Promoting..." : "Demoting..."}
                              </>
                            ) : (
                              permission.isOwner ? 'Demote' : 'Promote'
                            )}
                          </Button>
                        )}
                        
                        {/* Remove button - owners can remove non-owners, creator/admin can remove anyone */}
                        {canRemove && !isCreator && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveCollaborator(permission.userId)}
                            disabled={processingUserId === permission.userId}
                          >
                            {processingUserId === permission.userId && processingAction === "remove" ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Remove
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
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

      {/* Transfer Creator Confirmation Dialog */}
      <Dialog open={transferConfirmOpen} onOpenChange={setTransferConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ArrowRightLeft className="w-5 h-5" />
              Transfer Creator Role
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to transfer the creator role to <strong>{transferTargetUser?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Warning: This action cannot be undone by you</AlertTitle>
              <AlertDescription className="text-amber-700">
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>{transferTargetUser?.name}</strong> will become the new project creator</li>
                  <li>You will be demoted to a project owner</li>
                  <li>Only the new creator or an admin can transfer the role back to you</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransferConfirmOpen(false);
                setTransferTargetUser(null);
              }}
              disabled={isTransferring}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleConfirmTransfer}
              disabled={isTransferring}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transfer Creator Role
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
} 
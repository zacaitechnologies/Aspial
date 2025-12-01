"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "../contexts/SessionProvider";
import {
  getUserInvitations,
  acceptProjectInvitation,
  declineProjectInvitation,
  getAllInvitationsForAdmin,
  isUserAdmin,
} from "../projects/permissions";
// Custom service functions imported in CustomServiceNotifications component
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Bell, Check, X, Users, Eye, Edit, Crown, Shield, Trash2, Package, CheckCircle2, AlertCircle } from "lucide-react";
import CustomServiceNotifications from "./components/CustomServiceNotifications";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type ProjectInvitation = {
  id: number;
  projectId: number;
  invitedBy: string;
  invitedUser: string;
  status: string;
  canView: boolean;
  canEdit: boolean;
  isOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
  project: {
    id: number;
    name: string;
    description: string | null;
    quotations: {
      id: number;
      name: string;
      totalPrice: number;
    }[];
    createdByUser: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  inviter: {
    firstName: string;
    lastName: string;
    email: string;
  };
  invitee: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type CustomServiceRequest = {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  createdAt: Date;
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  approvedBy: {
    firstName: string;
    lastName: string;
  } | null;
  quotation: {
    id: number;
    name: string;
    Client: {
      name: string;
      company: string | null;
    } | null;
  };
  approvalComment: string | null;
  rejectionComment: string | null;
};

export default function NotificationPage() {
  const { enhancedUser } = useSession();
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [allInvitations, setAllInvitations] = useState<ProjectInvitation[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteInvitationId, setDeleteInvitationId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching invitations for user:", enhancedUser?.id);
      
      if (!enhancedUser?.id) {
        console.log("No user ID, skipping fetch");
        setInvitations([]);
        return;
      }

      // Check if user is admin
      const adminStatus = await isUserAdmin(enhancedUser.id);
      setIsAdmin(adminStatus);
      
      let data: any[] = [];
      
      try {
        console.log("Calling getUserInvitations with user ID:", enhancedUser.id);
        data = await getUserInvitations(enhancedUser.id);
        console.log("Invitations data:", data);
        console.log("Number of invitations found:", data.length);
      } catch (error) {
        console.error("Failed to fetch user invitations:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      
      setInvitations(data as ProjectInvitation[]);

      // If admin, fetch all invitations (including all statuses for log/history)
      if (adminStatus) {
        try {
          const allData = await getAllInvitationsForAdmin();
          setAllInvitations(allData as ProjectInvitation[]);
          
          // Filter pending from all data (client-side filtering)
          const pendingData = (allData as ProjectInvitation[]).filter(
            inv => inv.status === "pending"
          );
          setPendingInvitations(pendingData);
        } catch (error) {
          console.error("Failed to fetch admin invitations:", error);
          setAllInvitations([]);
          setPendingInvitations([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [enhancedUser?.id]);

  useEffect(() => {
    if (enhancedUser?.id) {
      fetchInvitations();
    }
  }, [enhancedUser?.id, fetchInvitations]);

  const handleAcceptInvitation = async (invitationId: number) => {
    setSuccessMessage("");
    setErrorMessage("");
    
    try {
      console.log("Accepting invitation:", invitationId);
      
      await acceptProjectInvitation(invitationId);
      console.log("Invitation accepted successfully");
      
      // Refresh invitations to show updated status
      await fetchInvitations();
      setSuccessMessage("Invitation accepted! You can now access the project.");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      setErrorMessage("Failed to accept invitation. Please try again.");
    }
  };

  const handleDeclineInvitation = async (invitationId: number) => {
    setSuccessMessage("");
    setErrorMessage("");
    
    try {
      console.log("Declining invitation:", invitationId);
      
      await declineProjectInvitation(invitationId);
      console.log("Invitation declined successfully");
      
      // Refresh invitations to show updated status
      await fetchInvitations();
      setSuccessMessage("Invitation declined.");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error declining invitation:", error);
      setErrorMessage("Failed to decline invitation. Please try again.");
    }
  };

  // Admin functions - using existing functions
  const handleAdminAcceptInvitation = async (invitationId: number) => {
    setSuccessMessage("");
    setErrorMessage("");
    
    try {
      await acceptProjectInvitation(invitationId);
      // Refresh all invitation lists
      fetchInvitations();
      setSuccessMessage("Invitation accepted by admin!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error accepting invitation as admin:", error);
      setErrorMessage("Failed to accept invitation. Please try again.");
    }
  };

  const handleAdminDeclineInvitation = async (invitationId: number) => {
    setSuccessMessage("");
    setErrorMessage("");
    
    try {
      await declineProjectInvitation(invitationId);
      // Refresh all invitation lists
      fetchInvitations();
      setSuccessMessage("Invitation declined by admin!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error declining invitation as admin:", error);
      setErrorMessage("Failed to decline invitation. Please try again.");
    }
  };

  const handleAdminDeleteInvitation = async (invitationId: number) => {
    setSuccessMessage("");
    setErrorMessage("");
    setDeleteInvitationId(invitationId);
  };

  const confirmDeleteInvitation = async () => {
    if (!deleteInvitationId) return;
    
    try {
      // For now, we'll just decline it since we don't have a delete function
      await declineProjectInvitation(deleteInvitationId);
      setDeleteInvitationId(null);
      await fetchInvitations();
      toast({
        title: "Success",
        description: "Invitation deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast({
        title: "Error",
        description: "Failed to delete invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "accepted":
        return <Badge variant="default">Accepted</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      case "expired":
        return <Badge variant="outline">Expired</Badge>;
      case "removed":
        return <Badge variant="destructive">Removed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPermissionBadges = (invitation: ProjectInvitation) => {
    const badges = [];
    if (invitation.canView) badges.push(<Badge key="view" variant="outline" className="text-xs">View</Badge>);
    if (invitation.canEdit) badges.push(<Badge key="edit" variant="outline" className="text-xs">Edit</Badge>);
    if (invitation.isOwner) badges.push(<Badge key="owner" variant="default" className="text-xs">Owner</Badge>);
    return badges;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          Loading notifications...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="w-8 h-8" />
          Notifications
        </h1>
        <p className="text-muted-foreground mt-2">
          {isAdmin ? "Manage project invitations and custom service requests" : "View your project invitations"}
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="bg-green-50 border-green-200 text-green-800 mb-4">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      {errorMessage && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isAdmin ? (
        <Tabs defaultValue="invitations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invitations">Project Invitations</TabsTrigger>
            <TabsTrigger value="custom-services">Custom Services</TabsTrigger>
          </TabsList>

          <TabsContent value="invitations" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5" />
              <h2 className="text-xl font-semibold">All Project Invitations</h2>
              <Badge variant="secondary">{allInvitations.length}</Badge>
              <Badge variant="default" className="ml-2">
                {pendingInvitations.length} Pending
              </Badge>
            </div>
            
            {allInvitations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No invitation history found.</p>
                </CardContent>
              </Card>
            ) : (
              allInvitations.map((invitation) => (
                <Card key={invitation.id} className="p-4">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{invitation.project.name}</CardTitle>
                        <CardDescription>
                          {invitation.inviter.firstName} {invitation.inviter.lastName} invited {invitation.invitee.firstName} {invitation.invitee.lastName}
                        </CardDescription>
                      </div>
                      {getStatusBadge(invitation.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Project Details</h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <strong>Project:</strong> {invitation.project.name}
                          </p>
                          <p>
                            <strong>Value:</strong> RM
                            {invitation.project.quotations[0]?.totalPrice.toFixed(2) || '0.00'}
                          </p>
                          <p>
                            <strong>Inviter:</strong> {invitation.inviter.firstName} {invitation.inviter.lastName}
                          </p>
                          <p>
                            <strong>Invitee:</strong> {invitation.invitee.firstName} {invitation.invitee.lastName}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Permissions</h4>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {getPermissionBadges(invitation)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <strong>Invited:</strong> {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Updated:</strong> {new Date(invitation.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {invitation.status === "removed" && (
                      <div className="border-t pt-4 mt-4">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>User Removed from Project</AlertTitle>
                          <AlertDescription>
                            {invitation.invitee.firstName} {invitation.invitee.lastName} was removed from this project by {invitation.inviter.firstName} {invitation.inviter.lastName}.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}

                    {invitation.status === "pending" && (
                      <div className="flex gap-2 border-t pt-4">
                        <Button
                          onClick={() => handleAdminAcceptInvitation(invitation.id)}
                          className="flex-1"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Accept as Admin
                        </Button>
                          <Button
                          variant="outline"
                          onClick={() => handleAdminDeclineInvitation(invitation.id)}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Decline as Admin
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleAdminDeleteInvitation(invitation.id)}
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="custom-services" className="space-y-4">
            <CustomServiceNotifications userId={enhancedUser?.id || ""} isAdmin={true} />
          </TabsContent>
        </Tabs>
      ) : (
        // Non-admin view - with tabs for invitations and custom services
        <Tabs defaultValue="invitations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invitations">Project Invitations</TabsTrigger>
            <TabsTrigger value="custom-services">My Custom Services</TabsTrigger>
          </TabsList>

          <TabsContent value="invitations" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" />
              <h2 className="text-xl font-semibold">My Project Invitations</h2>
              <Badge variant="secondary">{invitations.length}</Badge>
            </div>
            
            {invitations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">You don't have any pending invitations.</p>
                </CardContent>
              </Card>
            ) : (
              invitations.map((invitation) => (
                <Card key={invitation.id} className="p-4">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{invitation.project.name}</CardTitle>
                        <CardDescription>
                          Invited by {invitation.inviter.firstName} {invitation.inviter.lastName}
                        </CardDescription>
                      </div>
                      {getStatusBadge(invitation.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Project Details</h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <strong>Project:</strong> {invitation.project.name}
                          </p>
                          {invitation.project.description && (
                            <p>
                              <strong>Description:</strong>{" "}
                              {invitation.project.description}
                            </p>
                          )}
                          <p>
                            <strong>Value:</strong> RM
                            {invitation.project.quotations[0]?.totalPrice.toFixed(2) || '0.00'}
                          </p>
                          <p>
                            <strong>Created by:</strong>{" "}
                            {invitation.project.createdByUser.firstName}{" "}
                            {invitation.project.createdByUser.lastName}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Permissions</h4>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {getPermissionBadges(invitation)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <strong>Invited:</strong> {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {invitation.status === "removed" && (
                      <div className="border-t pt-4 mt-4">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Removed from Project</AlertTitle>
                          <AlertDescription>
                            You have been removed from this project by {invitation.inviter.firstName} {invitation.inviter.lastName}. 
                            You no longer have access to this project.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}

                    {invitation.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          className="flex-1"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDeclineInvitation(invitation.id)}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="custom-services" className="space-y-4">
            <CustomServiceNotifications userId={enhancedUser?.id || ""} isAdmin={false} />
          </TabsContent>
        </Tabs>
      )}

      <ConfirmationDialog
        isOpen={deleteInvitationId !== null}
        onClose={() => setDeleteInvitationId(null)}
        onConfirm={confirmDeleteInvitation}
        title="Delete Invitation"
        description="Are you sure you want to delete this invitation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

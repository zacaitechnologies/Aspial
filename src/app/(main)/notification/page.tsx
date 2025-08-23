"use client";

import { useState, useEffect } from "react";
import { useSession } from "../contexts/SessionProvider";
import {
  getUserInvitations,
  acceptProjectInvitation,
  declineProjectInvitation,
  getAllPendingInvitations,
  getAllInvitations,
  isUserAdmin,
} from "../projects/permissions";
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
import { Bell, Check, X, Users, Eye, Edit, Crown, Shield, Trash2 } from "lucide-react";

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

export default function NotificationPage() {
  const { enhancedUser } = useSession();
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [allInvitations, setAllInvitations] = useState<ProjectInvitation[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchInvitations = async () => {
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

      // If admin, fetch all invitations
      if (adminStatus) {
        try {
          const allData = await getAllInvitations();
          setAllInvitations(allData as ProjectInvitation[]);
          
          const pendingData = await getAllPendingInvitations();
          setPendingInvitations(pendingData as ProjectInvitation[]);
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
  };

  useEffect(() => {
    if (enhancedUser?.id) {
      fetchInvitations();
    }
  }, [enhancedUser?.id, fetchInvitations]);

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      console.log("Accepting invitation:", invitationId);
      
      // Try to accept the invitation
      try {
        await acceptProjectInvitation(invitationId);
        console.log("Invitation accepted successfully");
      } catch (error) {
        console.error("Failed to accept invitation in database:", error);
        // Continue anyway to show success message
      }
      
      // Remove the invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      alert("Invitation accepted! You can now access the project.");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      alert("Failed to accept invitation. Please try again.");
    }
  };

  const handleDeclineInvitation = async (invitationId: number) => {
    try {
      console.log("Declining invitation:", invitationId);
      
      // Try to decline the invitation
      try {
        await declineProjectInvitation(invitationId);
        console.log("Invitation declined successfully");
      } catch (error) {
        console.error("Failed to decline invitation in database:", error);
        // Continue anyway to show success message
      }
      
      // Remove the invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      alert("Invitation declined.");
    } catch (error) {
      console.error("Error declining invitation:", error);
      alert("Failed to decline invitation. Please try again.");
    }
  };

  // Admin functions - using existing functions
  const handleAdminAcceptInvitation = async (invitationId: number) => {
    try {
      await acceptProjectInvitation(invitationId);
      // Refresh all invitation lists
      fetchInvitations();
      alert("Invitation accepted by admin!");
    } catch (error) {
      console.error("Error accepting invitation as admin:", error);
      alert("Failed to accept invitation. Please try again.");
    }
  };

  const handleAdminDeclineInvitation = async (invitationId: number) => {
    try {
      await declineProjectInvitation(invitationId);
      // Refresh all invitation lists
      fetchInvitations();
      alert("Invitation declined by admin!");
    } catch (error) {
      console.error("Error declining invitation as admin:", error);
      alert("Failed to decline invitation. Please try again.");
    }
  };

  const handleAdminDeleteInvitation = async (invitationId: number) => {
    if (!confirm("Are you sure you want to delete this invitation? This action cannot be undone.")) {
      return;
    }
    
    try {
      // For now, we'll just decline it since we don't have a delete function
      // You can add a delete function later if needed
      await declineProjectInvitation(invitationId);
      // Refresh all invitation lists
      fetchInvitations();
      alert("Invitation declined by admin!");
    } catch (error) {
      console.error("Error declining invitation as admin:", error);
      alert("Failed to decline invitation. Please try again.");
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
          {isAdmin ? "Manage project invitations and collaboration requests" : "View your project invitations"}
        </p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="my-invitations" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-invitations">My Invitations</TabsTrigger>
            <TabsTrigger value="pending">Pending Invitations</TabsTrigger>
            <TabsTrigger value="all">All Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="my-invitations" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" />
              <h2 className="text-xl font-semibold">My Invitations</h2>
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

          <TabsContent value="pending" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5" />
              <h2 className="text-xl font-semibold">All Pending Invitations</h2>
              <Badge variant="secondary">{pendingInvitations.length}</Badge>
            </div>
            
            {pendingInvitations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No pending invitations in the system.</p>
                </CardContent>
              </Card>
            ) : (
              pendingInvitations.map((invitation) => (
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
                      </div>
                    </div>

                    <div className="flex gap-2">
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
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5" />
              <h2 className="text-xl font-semibold">All Invitations</h2>
              <Badge variant="secondary">{allInvitations.length}</Badge>
            </div>
            
            {allInvitations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No invitations in the system.</p>
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
                      </div>
                    </div>

                    {invitation.status === "pending" && (
                      <div className="flex gap-2">
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
        </Tabs>
      ) : (
        // Non-admin view (original functionality)
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" />
            <h2 className="text-xl font-semibold">My Invitations</h2>
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
        </div>
      )}
    </div>
  );
}

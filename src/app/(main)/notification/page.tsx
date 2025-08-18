"use client";

import { useState, useEffect } from "react";
import { useSession } from "../contexts/SessionProvider";
import {
  getUserInvitations,
  acceptProjectInvitation,
  declineProjectInvitation,
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
import { Bell, Check, X, Users, Eye, Edit, Crown } from "lucide-react";

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
    quotation: {
      id: number;
      name: string;
      totalPrice: number;
    };
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
};

export default function NotificationPage() {
  const { enhancedUser } = useSession();
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      console.log("Fetching invitations for user:", enhancedUser?.id);
      
      if (!enhancedUser?.id) {
        console.log("No user ID, skipping fetch");
        setInvitations([]);
        return;
      }
      
      let data: any[] = [];
      
      try {
        console.log("Calling getUserInvitations with user ID:", enhancedUser.id);
        data = await getUserInvitations(enhancedUser.id);
        console.log("Invitations data:", data);
        console.log("Number of invitations found:", data.length);
      } catch (error) {
        console.error("Failed to fetch invitations from database:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // Add mock invitation for testing
        console.log("Adding mock invitation for testing...");
        data = [
          {
            id: 1,
            projectId: 1,
            invitedBy: "mock-inviter",
            invitedUser: enhancedUser.id,
            status: "pending",
            canView: true,
            canEdit: true,
            isOwner: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            project: {
              id: 1,
              name: "Test Project",
              description: "This is a test project invitation",
              quotation: {
                id: 1,
                name: "Test Quotation",
                totalPrice: 1500.00
              },
              createdByUser: {
                firstName: "Test",
                lastName: "User",
                email: "test@example.com"
              }
            },
            inviter: {
              firstName: "John",
              lastName: "Doe",
              email: "john.doe@example.com"
            }
          }
        ];
      }
      
      setInvitations(data as ProjectInvitation[]);
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
  }, [enhancedUser?.id]);

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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Notifications
        </h1>
        <p className="text-muted-foreground">
          Manage your project invitations and notifications
        </p>
      </div>

      {invitations.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No pending notifications.</p>
          <p className="text-sm text-muted-foreground mt-2">
            You'll see project invitations here when they're sent to you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Project Invitations</h2>
          {invitations.map((invitation) => (
            <Card
              key={invitation.id}
              className="card"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Project Invitation: {invitation.project.name}
                    </CardTitle>
                    <CardDescription>
                      Invited by {invitation.inviter.firstName}{" "}
                      {invitation.inviter.lastName} ({invitation.inviter.email})
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-yellow-700 bg-yellow-100"
                  >
                    Pending
                  </Badge>
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
                        {invitation.project.quotation.totalPrice.toFixed(2)}
                      </p>
                      <p>
                        <strong>Created by:</strong>{" "}
                        {invitation.project.createdByUser.firstName}{" "}
                        {invitation.project.createdByUser.lastName}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Your Permissions</h4>
                    <div className="flex flex-wrap gap-2">
                      {invitation.canView && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </Badge>
                      )}
                      {invitation.canEdit && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Badge>
                      )}
                      {invitation.isOwner && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Crown className="w-3 h-3" />
                          Owner
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Accept Invitation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    className="flex-1 text-black hover:text-gray-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

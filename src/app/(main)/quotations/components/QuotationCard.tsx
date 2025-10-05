"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Briefcase, AlertTriangle, User, Mail, Building2 } from "lucide-react";
import { QuotationWithServices, statusOptions } from "../types";
import { useSession } from "../../contexts/SessionProvider";
import { getClientById, updateClientMembershipStatus } from "../action";
import MembershipStatusDialog from "./MembershipStatusDialog";

interface QuotationCardProps {
  quotation: QuotationWithServices;
  onEdit: (quotation: QuotationWithServices) => void;
  onDelete: (quotationId: string) => void;
}

export default function QuotationCard({
  quotation,
  onEdit,
  onDelete,
}: QuotationCardProps) {
  const { enhancedUser } = useSession();
  const [isMembershipDialogOpen, setIsMembershipDialogOpen] = useState(false);
  const [clientData, setClientData] = useState<{
    id: string;
    name: string;
    company?: string;
    membershipType: string;
  } | null>(null);
  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find((opt) => opt.value === status);
    return (
      <Badge variant={statusConfig?.color || "secondary"}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const hasProject = quotation.project !== null;

  const handleDelete = () => {
    if (hasProject) {
      const confirmed = confirm(
        "This quotation has an associated project. Deleting the quotation will also delete the project and all its time entries. Are you sure you want to continue?"
      );
      if (confirmed) {
        onDelete(quotation.id.toString());
      }
    } else {
      onDelete(quotation.id.toString());
    }
  };

  const handleCreateProject = async (quotation: QuotationWithServices) => {
    try {
      // First, get client details to check membership status
      if (quotation.clientId) {
        const client = await getClientById(quotation.clientId);
        
        if (client && client.membershipType === "NON_MEMBER") {
          // Store client data and show membership dialog
          setClientData({
            id: client.id,
            name: client.name,
            company: client.company || undefined,
            membershipType: client.membershipType,
          });
          setIsMembershipDialogOpen(true);
          return; // Don't create project yet, wait for user decision
        }
      }

      // If client is already a member or no client, proceed with project creation
      await createProjectAndRefresh(quotation);
      
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const createProjectAndRefresh = async (quotation: QuotationWithServices) => {
    try {
      // Import the createProject action
      const { createProject } = await import('../../projects/action');
      
      // Create project data from quotation
      const projectData = {
        name: quotation.name,
        description: quotation.description,
        clientId: quotation.clientId,
        quotationId: quotation.id,
        startDate: quotation.startDate,
        endDate: quotation.endDate,
        createdBy: enhancedUser?.id || '',
      };
      
      // Create the project
      await createProject(projectData);
      
      // Show success message
      alert('Project created successfully!');
      
      // Refresh the page to update the UI (briefcase icon will disappear)
      window.location.reload();
      
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleMembershipUpgrade = async () => {
    if (!clientData) return;

    try {
      // Update client membership status to MEMBER
      await updateClientMembershipStatus(clientData.id, "MEMBER");
      
      // Now create the project
      await createProjectAndRefresh(quotation);
      
      // Close dialog
      setIsMembershipDialogOpen(false);
      setClientData(null);
      
    } catch (error) {
      console.error('Error upgrading membership:', error);
      alert('Failed to upgrade membership status. Please try again.');
    }
  };

  const handleMembershipCancel = () => {
    // Create project without upgrading membership
    createProjectAndRefresh(quotation);
    setIsMembershipDialogOpen(false);
    setClientData(null);
  };

  return (
    <Card className="card">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{quotation.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(quotation.status)}
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Grand Total: RM{quotation.totalPrice.toFixed(2)}
              </Badge>
              {hasProject && (
                <Badge variant="default" className="bg-green-600">
                  <Briefcase className="w-3 h-3 mr-1" />
                  Project Created
                </Badge>
              )}
            </div>
          </div>
          <div className="flex space-x-1">
            {/* Create Project Button - Show for accepted or paid quotations without existing project */}
            {(quotation.status === "accepted" || quotation.status === "paid") && !hasProject && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCreateProject(quotation)}
                className="text-green-600 hover:text-green-700"
                title="Create Project"
              >
                <Briefcase className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(quotation)}
            >
              <Edit className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={hasProject ? undefined : handleDelete}
              disabled={hasProject}
              className={hasProject ? "text-gray-400 cursor-not-allowed" : ""}
              title={hasProject ? "This quotation cannot be deleted as it is linked to a project" : "Delete quotation"}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-3">
          {quotation.description}
        </CardDescription>
        
        {/* Client Information */}
        {quotation.Client && (
          <div className="mb-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Client Information
            </p>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{quotation.Client.name}</p>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {quotation.Client.email}
                </span>
                {quotation.Client.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {quotation.Client.company}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <p className="text-sm font-medium">Services included:</p>
          <div className="flex flex-wrap gap-1">
            {quotation.services.map((qs) => (
              <Badge
                key={qs.id}
                variant="secondary"
                className="text-xs"
              >
                {qs.service.name}
              </Badge>
            ))}
          </div>
        </div>
        {quotation.discountValue && (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              Discount: {quotation.discountValue}
              {quotation.discountType === "percentage" ? "%" : "RM"}
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          Created: {new Date(quotation.created_at).toLocaleDateString()}
        </p>
      </CardContent>

      {/* Membership Status Dialog */}
      {clientData && (
        <MembershipStatusDialog
          isOpen={isMembershipDialogOpen}
          onOpenChange={setIsMembershipDialogOpen}
          clientName={clientData.name}
          clientCompany={clientData.company}
          onConfirm={handleMembershipUpgrade}
          onCancel={handleMembershipCancel}
        />
      )}
    </Card>
  );
} 
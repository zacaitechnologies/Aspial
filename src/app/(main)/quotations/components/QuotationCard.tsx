"use client";

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

interface QuotationCardProps {
  quotation: QuotationWithServices;
  onEdit: (quotation: QuotationWithServices) => void;
  onDelete: (quotationId: string) => void;
  onCreateProject: (quotation: QuotationWithServices) => void;
}

export default function QuotationCard({
  quotation,
  onEdit,
  onDelete,
  onCreateProject,
}: QuotationCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find((opt) => opt.value === status);
    return (
      <Badge variant={statusConfig?.color || "secondary"}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const hasProject = quotation.project !== null;
  const allowedStatuses = ["accepted", "paid", "partially_paid", "deposit_paid"];
  const canCreateProject = allowedStatuses.includes(quotation.status) && !hasProject;

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

  return (
    <Card className="card">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{quotation.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(quotation.status)}
              <Badge variant="outline">
                RM{quotation.totalPrice.toFixed(2)}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(quotation)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            {canCreateProject && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCreateProject(quotation)}
                title="Create Project"
              >
                <Briefcase className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className={hasProject ? "text-red-600 hover:text-red-700" : ""}
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
        {canCreateProject && (
          <div className="mt-2">
            <p className="text-sm text-green-600">
              ✅ Click the briefcase icon to manually create a project
            </p>
          </div>
        )}
        {hasProject && (
          <div className="mt-2 flex items-center gap-1 text-sm text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Deleting this quotation will also delete the associated project</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Created: {new Date(quotation.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
} 
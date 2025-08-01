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
import { Edit, Trash2, Briefcase } from "lucide-react";
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{quotation.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(quotation.status)}
              <Badge variant="outline">
                RM{quotation.totalPrice.toFixed(2)}
              </Badge>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCreateProject(quotation)}
              disabled={
                quotation.status !== "accepted" &&
                quotation.status !== "paid"
              }
            >
              <Briefcase className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(quotation.id.toString())}
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
    </Card>
  );
} 
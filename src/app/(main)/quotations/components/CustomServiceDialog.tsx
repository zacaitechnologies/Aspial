"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { createCustomService } from "../action";
import type { CustomService } from "@prisma/client";

interface CustomServiceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceCreated: (service: CustomService) => void;
  quotationId?: number;
  createdById?: string;
}

export default function CustomServiceDialog({
  isOpen,
  onOpenChange,
  onServiceCreated,
  quotationId,
  createdById,
}: CustomServiceDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim() || !formData.description.trim() || !formData.price) {
      alert("Please fill in all fields");
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      alert("Please enter a valid price");
      return;
    }

    // Check if we have required data
    if (!quotationId || !createdById) {
      alert("Cannot create custom service: Missing quotation or user information");
      return;
    }

    setIsLoading(true);
    try {
      const newCustomService = await createCustomService({
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: price,
        quotationId: quotationId,
        createdById: createdById,
      });

      onServiceCreated(newCustomService);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
      });
    } catch (error) {
      console.error("Error creating custom service:", error);
      alert("Failed to create custom service. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setFormData({
      name: "",
      description: "",
      price: "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Custom Service
          </DialogTitle>
          <DialogDescription>
            Request a custom service that isn't in the existing list. The price should be the monthly rate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="service-name">Service Name</Label>
            <Input
              id="service-name"
              placeholder="e.g., Custom Web Development"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="service-description">Description</Label>
            <Textarea
              id="service-description"
              placeholder="Describe what this service includes..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="service-price">Price per Month (RM)</Label>
            <Input
              id="service-price"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This price will be multiplied by the quotation duration
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.name.trim() || !formData.description.trim() || !formData.price}
          >
            {isLoading ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

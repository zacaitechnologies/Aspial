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
import { createService } from "../action";
import type { Services } from "@prisma/client";

interface CustomServiceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceCreated: (service: Services) => void;
}

export default function CustomServiceDialog({
  isOpen,
  onOpenChange,
  onServiceCreated,
}: CustomServiceDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basePrice: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.description.trim() || !formData.basePrice) {
      alert("Please fill in all fields");
      return;
    }

    const basePrice = parseFloat(formData.basePrice);
    if (isNaN(basePrice) || basePrice < 0) {
      alert("Please enter a valid price");
      return;
    }

    setIsLoading(true);
    try {
      const newService = await createService({
        name: formData.name.trim(),
        description: formData.description.trim(),
        basePrice: basePrice,
      });

      onServiceCreated(newService);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        basePrice: "",
      });
    } catch (error) {
      console.error("Error creating service:", error);
      alert("Failed to create service. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setFormData({
      name: "",
      description: "",
      basePrice: "",
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
            Create a new service that isn't in the existing list.
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
            <Label htmlFor="service-price">Base Price (RM)</Label>
            <Input
              id="service-price"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={formData.basePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
            />
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
            disabled={isLoading || !formData.name.trim() || !formData.description.trim() || !formData.basePrice}
          >
            {isLoading ? "Creating..." : "Create Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

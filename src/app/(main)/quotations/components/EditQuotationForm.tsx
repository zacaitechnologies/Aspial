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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { editQuotationById } from "../action";
import { getAllServices } from "../../services/action";
import type { Services } from "@prisma/client";
import { QuotationWithServices, EditFormData, statusOptions } from "../types";

interface EditQuotationFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingQuotation: QuotationWithServices | null;
}

export default function EditQuotationForm({
  isOpen,
  onOpenChange,
  onSuccess,
  editingQuotation,
}: EditQuotationFormProps) {
  const [services, setServices] = useState<Services[]>([]);
  const [editSelectedServiceIds, setEditSelectedServiceIds] = useState<string[]>([]);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: "",
    description: "",
    totalPrice: "",
    status: "",
    discountValue: "",
    discountType: "percentage",
    duration: "",
    startDate: "",
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (editingQuotation) {
      setEditForm({
        name: editingQuotation.name,
        description: editingQuotation.description,
        totalPrice: editingQuotation.totalPrice.toString(),
        status: editingQuotation.status,
        discountValue: editingQuotation.discountValue?.toString() || "",
        discountType: editingQuotation.discountType || "percentage",
        duration: editingQuotation.duration?.toString() || "",
        startDate: editingQuotation.startDate ? new Date(editingQuotation.startDate).toISOString().split('T')[0] : "",
      });
      setEditSelectedServiceIds(
        editingQuotation.services.map((qs) => qs.service.id.toString())
      );
    }
  }, [editingQuotation]);

  const fetchServices = async () => {
    try {
      const servicesData = await getAllServices();
      setServices(servicesData);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };

  // Calculate edit total price based on selected services
  const calculateEditTotalPrice = () => {
    const selectedServices = services.filter(service => 
      editSelectedServiceIds.includes(service.id.toString())
    );
    return selectedServices.reduce((total, service) => total + service.basePrice, 0);
  };

  // Calculate edit discounted total price
  const calculateEditDiscountedTotal = () => {
    const baseTotal = calculateEditTotalPrice();
    if (
      !editForm.discountValue ||
      parseFloat(editForm.discountValue) === 0
    ) {
      return baseTotal;
    }

    const discountValue = parseFloat(editForm.discountValue);

    if (editForm.discountType === "percentage") {
      const limitedDiscountValue = Math.min(discountValue, 100);
      const discountAmount = baseTotal * (limitedDiscountValue / 100);
      return baseTotal - discountAmount;
    } else {
      const limitedDiscountValue = Math.min(discountValue, baseTotal);
      return Math.max(0, baseTotal - limitedDiscountValue);
    }
  };

  const editTotalPrice = calculateEditTotalPrice();
  const editDiscountedTotal = calculateEditDiscountedTotal();

  const calculateEditEndDate = () => {
    if (!editForm.startDate || !editForm.duration) {
      return "Please select start date and duration";
    }
    
    const startDate = new Date(editForm.startDate);
    const duration = parseInt(editForm.duration);
    
    if (isNaN(duration) || duration <= 0) {
      return "Invalid duration";
    }
    
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);
    
    return endDate.toLocaleDateString("en-GB");
  };

  const handleUpdateQuotation = async () => {
    if (!editingQuotation) return;

    if (!editForm.name || !editForm.description) {
      alert("Please fill all required fields correctly.");
      return;
    }

    const validStatuses = [
      "draft",
      "sent",
      "accepted",
      "rejected",
      "paid",
      "unpaid",
      "partially_paid",
      "deposit_paid",
    ] as const;

    if (!validStatuses.includes(editForm.status as any)) {
      alert("Please select a valid status.");
      return;
    }

    try {
      await editQuotationById(editingQuotation.id.toString(), {
        name: editForm.name,
        description: editForm.description,
        totalPrice: editDiscountedTotal,
        status: editForm.status as
          | "draft"
          | "sent"
          | "accepted"
          | "rejected"
          | "paid"
          | "unpaid"
          | "partially_paid"
          | "deposit_paid",
        discountValue: editForm.discountValue
          ? parseFloat(editForm.discountValue)
          : undefined,
        discountType: editForm.discountValue
          ? editForm.discountType
          : undefined,
        serviceIds: editSelectedServiceIds,
        duration: editForm.duration
          ? parseInt(editForm.duration)
          : undefined,
        startDate: editForm.startDate || undefined,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating quotation:", error);
    }
  };

  if (!editingQuotation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[70vw] max-w-[70vw] max-h-[90vh] rounded-lg"
        showCloseButton={false}
      >
        <div className="custom-scrollbar overflow-y-auto max-h-[calc(90vh-4rem)] pr-2">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Edit Quotation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Quotation Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={editForm.startDate}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-duration">Duration (Months)</Label>
              <Input
                id="edit-duration"
                type="number"
                min="1"
                value={editForm.duration}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    duration: e.target.value,
                  }))
                }
                placeholder="e.g., 6"
              />
            </div>
            {editForm.startDate && editForm.duration && (
              <div className="grid gap-2">
                <Label htmlFor="edit-endDate">Calculated End Date</Label>
                <div className="p-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">
                    {calculateEditEndDate()}
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              <Label>Edit Services</Label>
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <Checkbox
                    checked={editSelectedServiceIds.includes(
                      service.id.toString()
                    )}
                    onCheckedChange={() => {
                      setEditSelectedServiceIds((prev) =>
                        prev.includes(service.id.toString())
                          ? prev.filter((id) => id !== service.id.toString())
                          : [...prev, service.id.toString()]
                      );
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.description}
                        </p>
                      </div>
                      <Badge variant="outline">
                        RM{service.basePrice.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-discount">Discount</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-discount"
                  type="number"
                  min="0"
                  step="0.10"
                  value={editForm.discountValue}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    const maxValue =
                      editForm.discountType === "percentage"
                        ? 100
                        : editTotalPrice;

                    if (value > maxValue) {
                      alert(
                        `Discount cannot exceed ${
                          editForm.discountType === "percentage"
                            ? "100%"
                            : `RM${editTotalPrice.toFixed(2)}`
                        }`
                      );
                      setEditForm((prev) => ({
                        ...prev,
                        discountValue: "",
                      }));
                      return;
                    }

                    setEditForm((prev) => ({
                      ...prev,
                      discountValue: e.target.value,
                    }));
                  }}
                  placeholder="0.00"
                  className="flex-1"
                />
                <Select
                  value={editForm.discountType}
                  onValueChange={(value: "percentage" | "fixed") =>
                    setEditForm((prev) => ({
                      ...prev,
                      discountType: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">RM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-totalPrice">Total Price (RM)</Label>
              <div className="p-3 bg-muted rounded-md">
                {editForm.discountValue && parseFloat(editForm.discountValue) > 0 ? (
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground line-through">
                      RM{editTotalPrice.toFixed(2)}
                    </span>
                    <br />
                    <span className="text-lg font-bold text-green-600">
                      RM{editDiscountedTotal.toFixed(2)}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      Discount: RM{(editTotalPrice - editDiscountedTotal).toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="text-lg font-bold">
                      RM{editTotalPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 sticky bottom-0 bg-background pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateQuotation}>
              Update Quotation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
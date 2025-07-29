"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Edit, Trash2, FileText, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import {
  getAllQuotations,
  createQuotation,
  editQuotationById,
  deleteQuotationById,
} from "./action";
import { getAllServices } from "../service/action";
import { createProject } from "../projects/action";
import type { Services } from "@prisma/client";
import { useSession } from "../contexts/SessionProvider";

type QuotationWithServices = {
  id: number;
  name: string;
  description: string;
  totalPrice: number;
  status: string;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  created_at: Date;
  updated_at: Date;
  services: {
    id: number;
    service: Services;
  }[];
};

const statusOptions = [
  { value: "draft", label: "Draft", color: "secondary" as const },
  { value: "sent", label: "Sent", color: "default" as const },
  { value: "accepted", label: "Accepted", color: "default" as const },
  { value: "rejected", label: "Rejected", color: "destructive" as const },
  { value: "paid", label: "Paid", color: "default" as const },
  { value: "unpaid", label: "Unpaid", color: "destructive" as const },
  {
    value: "partially_paid",
    label: "Partially Paid",
    color: "secondary" as const,
  },
  { value: "deposit_paid", label: "Deposit Paid", color: "secondary" as const },
];

export default function QuotationsPage() {
  const { enhancedUser } = useSession();
  const [services, setServices] = useState<Services[]>([]);
  const [quotations, setQuotations] = useState<QuotationWithServices[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] =
    useState<QuotationWithServices | null>(null);

  const [quotationForm, setQuotationForm] = useState({
    name: "",
    description: "",
    discountValue: "",
    discountType: "percentage" as "percentage" | "fixed",
  });

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    totalPrice: "",
    status: "",
    discountValue: "",
    discountType: "percentage" as "percentage" | "fixed",
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Recalculate discounted total when discount values change
  useEffect(() => {
    // This will trigger a re-render with the updated discountedTotal
  }, [quotationForm.discountValue, quotationForm.discountType, totalPrice]);

  const fetchData = async () => {
    try {
      const [servicesData, quotationsData] = await Promise.all([
        getAllServices(),
        getAllQuotations(),
      ]);
      setServices(servicesData);
      setQuotations(quotationsData as QuotationWithServices[]);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    const service = services.find((s) => s.id.toString() === serviceId);
    if (!service) return;

    setSelectedServiceIds((prev) => {
      const newSelection = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];

      const newTotal = newSelection.reduce((total, id) => {
        const svc = services.find((s) => s.id.toString() === id);
        return total + (svc?.basePrice || 0);
      }, 0);

      setTotalPrice(newTotal);
      return newSelection;
    });
  };

  // Calculate discounted total price
  const calculateDiscountedTotal = () => {
    if (!quotationForm.discountValue || parseFloat(quotationForm.discountValue) === 0) {
      return totalPrice;
    }

    const discountValue = parseFloat(quotationForm.discountValue);
    
    if (quotationForm.discountType === "percentage") {
      const discountAmount = totalPrice * (discountValue / 100);
      return totalPrice - discountAmount;
    } else {
      // Fixed amount discount
      return Math.max(0, totalPrice - discountValue);
    }
  };

  const discountedTotal = calculateDiscountedTotal();

  const handleCreateQuotation = async () => {
    if (
      !quotationForm.name ||
      !quotationForm.description ||
      selectedServiceIds.length === 0
    ) {
      alert("Please fill all fields and select at least one service.");
      return;
    }

    if (!enhancedUser.id) {
      alert("User not authenticated. Please try logging in again.");
      return;
    }

    // Debug: Log the user ID
    console.log("Current user ID:", enhancedUser.id);
    console.log("Full enhancedUser object:", enhancedUser);

    try {
      await createQuotation({
        name: quotationForm.name,
        description: quotationForm.description,
        totalPrice: discountedTotal,
        serviceIds: selectedServiceIds,
        createdById: enhancedUser.id,
        discountValue: quotationForm.discountValue ? parseFloat(quotationForm.discountValue) : undefined,
        discountType: quotationForm.discountValue ? quotationForm.discountType : undefined,
      });

      await fetchData();
      resetCreateForm();
      setIsCreateOpen(false);
    } catch (error) {
      console.error("Error creating quotation:", error);
    }
  };

  const handleEditQuotation = (quotation: QuotationWithServices) => {
    setEditingQuotation(quotation);
    setEditForm({
      name: quotation.name,
      description: quotation.description,
      totalPrice: quotation.totalPrice.toString(),
      status: quotation.status,
      discountValue: quotation.discountValue?.toString() || "",
      discountType: quotation.discountType || "percentage",
    });
    setIsEditOpen(true);
  };

  const handleUpdateQuotation = async () => {
    if (!editingQuotation) return;

    const totalPrice = Number.parseFloat(editForm.totalPrice);
    if (!editForm.name || !editForm.description || isNaN(totalPrice)) {
      alert("Please fill all fields correctly.");
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

    console.log("Current status value:", editForm.status);
    console.log("Valid statuses:", validStatuses);
    console.log(
      "Status included:",
      validStatuses.includes(editForm.status as any)
    );

    if (!validStatuses.includes(editForm.status as any)) {
      alert("Please select a valid status.");
      return;
    }

    try {
      await editQuotationById(editingQuotation.id.toString(), {
        name: editForm.name,
        description: editForm.description,
        totalPrice,
        status: editForm.status as
          | "draft"
          | "sent"
          | "accepted"
          | "rejected"
          | "paid"
          | "unpaid"
          | "partially_paid"
          | "deposit_paid",
        discountValue: editForm.discountValue ? parseFloat(editForm.discountValue) : undefined,
        discountType: editForm.discountValue ? editForm.discountType : undefined,
      });

      await fetchData();
      setEditingQuotation(null);
      setIsEditOpen(false);
    } catch (error) {
      console.error("Error updating quotation:", error);
    }
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;

    try {
      await deleteQuotationById(quotationId);
      await fetchData();
    } catch (error) {
      console.error("Error deleting quotation:", error);
    }
  };

  const handleCreateProject = async (quotation: QuotationWithServices) => {
    if (quotation.status !== "accepted" && quotation.status !== "paid") {
      alert("Only accepted or paid quotations can be converted to projects.");
      return;
    }

    try {
      await createProject({
        name: `Project: ${quotation.name}`,
        description: quotation.description,
        quotationId: quotation.id,
      });

      alert("Project created successfully!");
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const resetCreateForm = () => {
    setQuotationForm({ 
      name: "", 
      description: "", 
      discountValue: "", 
      discountType: "percentage" as "percentage" | "fixed" 
    });
    setSelectedServiceIds([]);
    setTotalPrice(0);
    setServiceSearchQuery("");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find((opt) => opt.value === status);
    return (
      <Badge variant={statusConfig?.color || "secondary"}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading quotations...
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6">
        {/* Check User Login
        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
          {JSON.stringify(enhancedUser, null, 2)}
        </pre>
        */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Quotations Management</h1>
            <p className="text-muted-foreground">
              Create and manage client quotations
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Quotation
              </Button>
            </DialogTrigger>
            <DialogContent
              className="!w-[70vw] !max-w-[70vw] !max-h-[90vh] rounded-lg"
              showCloseButton={false}
            >
              <div className="custom-scrollbar overflow-y-auto max-h-[calc(90vh-4rem)] pr-2">
                <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
                  <DialogTitle>Create New Quotation</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="quotation-name">Quotation Name</Label>
                    <Input
                      id="quotation-name"
                      value={quotationForm.name}
                      onChange={(e) =>
                        setQuotationForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Enter quotation name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quotation-description">Description</Label>
                    <Textarea
                      id="quotation-description"
                      value={quotationForm.description}
                      onChange={(e) =>
                        setQuotationForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Enter quotation description"
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4">
                    <Label>Select Services</Label>
                    <div className="grid gap-2">
                      <Input
                        placeholder="Search services..."
                        value={serviceSearchQuery}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-3 custom-scrollbar rounded-md">
                      {services
                        .filter(
                          (service) =>
                            service.name
                              .toLowerCase()
                              .includes(serviceSearchQuery.toLowerCase()) ||
                            service.description
                              .toLowerCase()
                              .includes(serviceSearchQuery.toLowerCase())
                        )
                        .map((service) => (
                          <div
                            key={service.id}
                            className="flex items-start space-x-3 p-3 border rounded-lg"
                          >
                            <Checkbox
                              checked={selectedServiceIds.includes(
                                service.id.toString()
                              )}
                              onCheckedChange={() =>
                                handleServiceToggle(service.id.toString())
                              }
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
                                  ${service.basePrice.toFixed(2)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="font-semibold">Discount: </span>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        min="0" 
                        max="1000" 
                        step="0.10" 
                        value={quotationForm.discountValue}
                        onChange={(e) =>
                          setQuotationForm((prev) => ({
                            ...prev,
                            discountValue: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="w-32"
                      />
                      <Select
                        value={quotationForm.discountType}
                        onValueChange={(value: "percentage" | "fixed") =>
                          setQuotationForm((prev) => ({
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
                          <SelectItem value="fixed">$</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="font-semibold">Total Price:</span>
                    <div className="text-right">
                      {quotationForm.discountValue && parseFloat(quotationForm.discountValue) > 0 ? (
                        <div>
                          <span className="text-sm text-muted-foreground line-through">
                            ${totalPrice.toFixed(2)}
                          </span>
                          <br />
                          <span className="text-2xl font-bold text-green-600">
                            ${discountedTotal.toFixed(2)}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            Discount: {quotationForm.discountValue}{quotationForm.discountType === "percentage" ? "%" : "$"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold">
                          ${totalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-100 rounded-lg">
                    <p className="text-sm font-medium mb-2">Form Data:</p>
                    <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                      {JSON.stringify({
                        quotationForm,
                        selectedServiceIds,
                        totalPrice,
                        discountedTotal,
                        serviceSearchQuery
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 sticky bottom-0 bg-background pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetCreateForm();
                      setIsCreateOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateQuotation}>
                    Create Quotation
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quotations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {quotations.map((quotation) => (
            <Card
              key={quotation.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{quotation.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(quotation.status)}
                      <Badge variant="outline">
                        ${quotation.totalPrice.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditQuotation(quotation)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCreateProject(quotation)}
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
                      onClick={() =>
                        handleDeleteQuotation(quotation.id.toString())
                      }
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
                      Discount: {quotation.discountValue}{quotation.discountType === "percentage" ? "%" : "$"}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  Created: {new Date(quotation.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {quotations.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No quotations available.</p>
          </div>
        )}

        {/* Edit Quotation Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
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
                  <Label htmlFor="edit-totalPrice">Total Price ($)</Label>
                  <Input
                    id="edit-totalPrice"
                    type="number"
                    step="0.01"
                    value={editForm.totalPrice}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        totalPrice: e.target.value,
                      }))
                    }
                  />
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
                      max="1000" 
                      step="0.10" 
                      value={editForm.discountValue}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          discountValue: e.target.value,
                        }))
                      }
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
                        <SelectItem value="fixed">$</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                                  </div>
                </div>

                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm font-medium mb-2">Edit Form Data:</p>
                  <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                    {JSON.stringify({
                      editForm,
                      editingQuotation: editingQuotation ? {
                        id: editingQuotation.id,
                        name: editingQuotation.name,
                        status: editingQuotation.status
                      } : null
                    }, null, 2)}
                  </pre>
                </div>

                <div className="flex justify-end space-x-2 sticky bottom-0 bg-background pt-4">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateQuotation}>
                    Update Quotation
                  </Button>
                </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

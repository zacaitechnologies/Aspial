"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { createQuotation } from "../action";
import { getAllServices } from "../../services/action";
import type { Services } from "@prisma/client";
import { useSession } from "../../contexts/SessionProvider";
import { QuotationFormData } from "../types";
import ClientSelection from "./ClientSelection";

interface CreateQuotationFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateQuotationForm({
  isOpen,
  onOpenChange,
  onSuccess,
}: CreateQuotationFormProps) {
  const { enhancedUser } = useSession();
  const [services, setServices] = useState<Services[]>([]);
  const [quotationForm, setQuotationForm] = useState<QuotationFormData>({
    name: "",
    description: "",
    discountValue: "",
    discountType: "percentage",
    duration: "",
    startDate: "",
    clientId: "",
    newClient: {
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      notes: "",
    },
  });

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const servicesData = await getAllServices();
      setServices(servicesData);
    } catch (error) {
      console.error("Failed to fetch services:", error);
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
    if (
      !quotationForm.discountValue ||
      parseFloat(quotationForm.discountValue) === 0
    ) {
      return totalPrice;
    }

    const discountValue = parseFloat(quotationForm.discountValue);

    if (quotationForm.discountType === "percentage") {
      const limitedDiscountValue = Math.min(discountValue, 100);
      const discountAmount = totalPrice * (limitedDiscountValue / 100);
      return totalPrice - discountAmount;
    } else {
      const limitedDiscountValue = Math.min(discountValue, totalPrice);
      return Math.max(0, totalPrice - limitedDiscountValue);
    }
  };

  const discountedTotal = calculateDiscountedTotal();

  // Calculate the actual discount amount in RM
  const getDiscountAmount = () => {
    if (
      !quotationForm.discountValue ||
      parseFloat(quotationForm.discountValue) === 0
    ) {
      return 0;
    }

    const discountValue = parseFloat(quotationForm.discountValue);

    if (quotationForm.discountType === "percentage") {
      const limitedDiscountValue = Math.min(discountValue, 100);
      return totalPrice * (limitedDiscountValue / 100);
    } else {
      const limitedDiscountValue = Math.min(discountValue, totalPrice);
      return limitedDiscountValue;
    }
  };

  const discountAmount = getDiscountAmount();

  const calculateEndDate = () => {
    if (!quotationForm.startDate || !quotationForm.duration) {
      return "Please select start date and duration";
    }
    
    const startDate = new Date(quotationForm.startDate);
    const duration = parseInt(quotationForm.duration);
    
    if (isNaN(duration) || duration <= 0) {
      return "Invalid duration";
    }
    
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);
    
    return endDate.toLocaleDateString("en-GB");
  };

  const handleCreateQuotation = async () => {
    if (
      !quotationForm.name ||
      !quotationForm.description ||
      selectedServiceIds.length === 0
    ) {
      alert("Please fill all fields and select at least one service.");
      return;
    }

    // Validate client information
    if (clientMode === "existing" && !quotationForm.clientId) {
      alert("Please select a client.");
      return;
    }

    if (clientMode === "new") {
      if (!quotationForm.newClient?.name || !quotationForm.newClient?.email) {
        alert("Please fill in the required client information (name and email).");
        return;
      }
    }

    if (!enhancedUser.id) {
      alert("User not authenticated. Please try logging in again.");
      return;
    }

    try {
      await createQuotation({
        name: quotationForm.name,
        description: quotationForm.description,
        totalPrice: discountedTotal,
        serviceIds: selectedServiceIds,
        createdById: enhancedUser.id,
        clientId: clientMode === "existing" ? quotationForm.clientId : undefined,
        newClient: clientMode === "new" ? quotationForm.newClient : undefined,
        discountValue: quotationForm.discountValue
          ? parseFloat(quotationForm.discountValue)
          : undefined,
        discountType: quotationForm.discountValue
          ? quotationForm.discountType
          : undefined,
        duration: quotationForm.duration
          ? parseInt(quotationForm.duration)
          : undefined,
        startDate: quotationForm.startDate || undefined,
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating quotation:", error);
    }
  };

  const resetForm = () => {
    setQuotationForm({
      name: "",
      description: "",
      discountValue: "",
      discountType: "percentage",
      duration: "",
      startDate: "",
      clientId: "",
      newClient: {
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        notes: "",
      },
    });
    setSelectedServiceIds([]);
    setTotalPrice(0);
    setServiceSearchQuery("");
    setClientMode("existing");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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

            {/* Client Selection */}
            <ClientSelection
              selectedClientId={quotationForm.clientId}
              newClientData={quotationForm.newClient}
              onClientSelect={(clientId) =>
                setQuotationForm((prev) => ({ ...prev, clientId }))
              }
              onNewClientDataChange={(newClientData) =>
                setQuotationForm((prev) => ({ ...prev, newClient: newClientData }))
              }
              onModeChange={setClientMode}
              mode={clientMode}
            />
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
             <div className="grid gap-2">
               <Label htmlFor="startDate">Start Date</Label>
               <Input
                 id="startDate"
                 type="date"
                 value={quotationForm.startDate}
                 onChange={(e) =>
                   setQuotationForm((prev) => ({
                     ...prev,
                     startDate: e.target.value,
                   }))
                 }
               />
             </div>
             <div className="grid gap-2">
               <Label htmlFor="duration">Duration (Months)</Label>
               <Input
                 id="duration"
                 type="number"
                 min="1"
                 value={quotationForm.duration}
                 onChange={(e) =>
                   setQuotationForm((prev) => ({
                     ...prev,
                     duration: e.target.value,
                   }))
                 }
                 placeholder="e.g., 6"
               />
             </div>
             {quotationForm.startDate && quotationForm.duration && (
               <div className="grid gap-2">
                 <Label htmlFor="endDate">Calculated End Date</Label>
                 <div className="p-3 bg-muted rounded-md">
                   <span className="text-sm font-medium">
                     {calculateEndDate()}
                   </span>
                 </div>
               </div>
             )}

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
                            RM{service.basePrice.toFixed(2)}
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
                  step="0.10"
                  value={quotationForm.discountValue}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    const maxValue =
                      quotationForm.discountType === "percentage"
                        ? 100
                        : totalPrice;

                    if (value > maxValue) {
                      alert(
                        `Discount cannot exceed ${
                          quotationForm.discountType === "percentage"
                            ? "100%"
                            : `RM${totalPrice.toFixed(2)}`
                        }`
                      );
                      setQuotationForm((prev) => ({
                        ...prev,
                        discountValue: "",
                      }));
                      return;
                    }

                    setQuotationForm((prev) => ({
                      ...prev,
                      discountValue: e.target.value,
                    }));
                  }}
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
                    <SelectItem value="fixed">RM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="font-semibold">Total Price:</span>
              <div className="text-right">
                {quotationForm.discountValue &&
                parseFloat(quotationForm.discountValue) > 0 ? (
                  <div>
                    <span className="text-sm text-muted-foreground line-through">
                      RM{totalPrice.toFixed(2)}
                    </span>
                    <br />
                    <span className="text-2xl font-bold text-green-600">
                      RM{discountedTotal.toFixed(2)}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      Discount: RM {discountAmount.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <span className="text-2xl font-bold">
                    RM{totalPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 sticky bottom-0 bg-background pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateQuotation}>Create Quotation</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
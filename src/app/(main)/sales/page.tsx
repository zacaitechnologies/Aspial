"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAllServices,
  addService,
  editServiceById,
  deleteServiceById,
  createQuotation,
  getAllQuotations,
  editQuotationById,
  deleteQuotationById,
} from "./action";
import { Quotation, Services } from "@prisma/client";
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "../contexts/SessionProvider";

export default function Sales() {
  const { enhancedUser } = useSession();
  const [services, setServices] = useState<Services[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateQuotationOpen, setCreateQuotationOpen] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  // Service Form
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    basePrice: "",
  });

  const [editingService, setEditingService] = useState<Services | null>(null);

  // Quotation Form
  const [quotationForm, setQuotationForm] = useState({
    name: "",
    description: "",
    totalPrice: "",
    serviceIds: [] as string[],
  });

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Quotation Edit State
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [quotationEditForm, setQuotationEditForm] = useState({
    name: "",
    description: "",
    totalPrice: "",
    status: "",
  });
  const [isEditQuotationModalOpen, setIsEditQuotationModalOpen] = useState(false);

  useEffect(() => {
    const fetchServicesAndQuotations = async () => {
      try {
        // const [servicesData, quotationsData] = await Promise.all([
        //   getAllServices(),
        //   getAllQuotations(),
        // ]);

        const servicesData = await getAllServices();
        const quotationsData = await getAllQuotations();
        setServices(servicesData);
        setQuotations(quotationsData);
      } catch (error) {
        console.error("Failed to fetch services or quotations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServicesAndQuotations();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setServiceForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const basePrice = parseFloat(serviceForm.basePrice);
    if (!serviceForm.name || !serviceForm.description || isNaN(basePrice)) {
      alert("Please fill all fields correctly.");
      return;
    }

    try {
      const newService = await addService({
        name: serviceForm.name,
        description: serviceForm.description,
        basePrice,
      });
      setServices((prev) => [...prev, newService]);
      setServiceForm({ name: "", description: "", basePrice: "" });
    } catch (error) {
      console.error("Error adding service:", error);
    }
  };

  const handleDelete = async (serviceId: string) => {
    try {
      await deleteServiceById(serviceId);
      const updatedServices = await getAllServices();
      setServices(updatedServices);
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  const handleEdit = (service: Services) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      basePrice: service.basePrice.toString(),
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingService) return;

    const basePrice = parseFloat(serviceForm.basePrice);
    if (!serviceForm.name || !serviceForm.description || isNaN(basePrice)) {
      alert("Please fill all fields correctly.");
      return;
    }

    try {
      await editServiceById(editingService.id.toString(), {
        name: serviceForm.name,
        description: serviceForm.description,
        basePrice,
      });
      const updatedServices = await getAllServices();
      setServices(updatedServices);
      setEditingService(null);
      setServiceForm({ name: "", description: "", basePrice: "" });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setServiceForm({ name: "", description: "", basePrice: "" });
    setIsEditModalOpen(false);
  };

  if (loading) {
    return <div>Loading services and quotations...</div>;
  }

  const handleCheckboxChange = (serviceId: string) => {
    const service = services.find(
      (service) => service.id.toString() === serviceId
    );
    if (!service) return;

    setSelectedServiceIds((prev) => {
      let newSelection;
      let newTotal;

      if (prev.includes(serviceId)) {
        // Deselected
        newSelection = prev.filter((id) => id !== serviceId);
        newTotal = totalPrice - service.basePrice;
      } else {
        // Selected
        newSelection = [...prev, serviceId];
        newTotal = totalPrice + service.basePrice;
      }

      setTotalPrice(newTotal);
      console.log("Updated selectedServiceIds:", newSelection);
      console.log("Updated totalPrice:", newTotal.toFixed(2));
      return newSelection;
    });

    console.log("Checkbox changed for serviceId:", serviceId);
  };

  const handleCreateQuotation = async () => {
    if (!enhancedUser?.id) {
      alert("User not authenticated. Please try logging in again.");
      return;
    }

    const updatedQuotation = {
      ...quotationForm,
      serviceIds: selectedServiceIds,
      totalPrice: totalPrice,
      createdById: enhancedUser.id,
    };

    console.log("Quotation to submit:", updatedQuotation);

    // Reset form
    setQuotationForm({
      name: "",
      description: "",
      totalPrice: "",
      serviceIds: [],
    });
    setSelectedServiceIds([]);
    setTotalPrice(0);
    setCreateQuotationOpen(false);

    try {
      await createQuotation(updatedQuotation);
      console.log("Quotation created successfully");
      const updatedQuotations = await getAllQuotations();
      setQuotations(updatedQuotations);
    } catch (error) {
      console.error("Error creating quotation:", error);
    }
  };

  // Quotation Handlers
  const handleEditQuotation = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setQuotationEditForm({
      name: quotation.name,
      description: quotation.description,
      totalPrice: quotation.totalPrice.toString(),
      status: quotation.status,
    });
    setIsEditQuotationModalOpen(true);
  };

  const handleUpdateQuotation = async () => {
    if (!editingQuotation) return;
    const totalPrice = parseFloat(quotationEditForm.totalPrice);
    if (!quotationEditForm.name || !quotationEditForm.description || isNaN(totalPrice)) {
      alert("Please fill all fields correctly.");
      return;
    }
    
    // Validate status is one of the allowed values
    const validStatuses = ["draft", "sent", "accepted", "rejected"] as const;
    if (!validStatuses.includes(quotationEditForm.status as any)) {
      alert("Please select a valid status.");
      return;
    }
    
    try {
      await editQuotationById(editingQuotation.id.toString(), {
        name: quotationEditForm.name,
        description: quotationEditForm.description,
        totalPrice,
        status: quotationEditForm.status as "draft" | "sent" | "accepted" | "rejected",
      });
      const updatedQuotations = await getAllQuotations();
      setQuotations(updatedQuotations);
      setEditingQuotation(null);
      setIsEditQuotationModalOpen(false);
    } catch (error) {
      console.error("Error updating quotation:", error);
    }
  };

  const handleCancelEditQuotation = () => {
    setEditingQuotation(null);
    setIsEditQuotationModalOpen(false);
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    try {
      await deleteQuotationById(quotationId);
      const updatedQuotations = await getAllQuotations();
      setQuotations(updatedQuotations);
    } catch (error) {
      console.error("Error deleting quotation:", error);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-x-8">
      <div>
        <p className="text-2xl font-bold mb-4">Services Available</p>

        <div className="mt-6 p-4 border rounded-lg">
          <p className="text-lg font-semibold mb-2">Add New Service</p>

          <Input
            className="block w-full border p-2 mb-2 rounded"
            type="text"
            name="name"
            placeholder="Service Name"
            value={serviceForm.name}
            onChange={handleChange}
          />
          <Input
            className="block w-full border p-2 mb-2 rounded"
            name="description"
            placeholder="Service Description"
            value={serviceForm.description}
            onChange={handleChange}
          />
          <Input
            className="block w-full border p-2 mb-2 rounded"
            type="number"
            name="basePrice"
            placeholder="Base Price"
            value={serviceForm.basePrice}
            onChange={handleChange}
          />

          <Button onClick={handleSubmit}>Add Service</Button>
        </div>

        {/* Service List */}
        {services.map((service) => (
          <div key={service.id} className="mb-4 p-4 border rounded-lg">
            <p className="text-md font-medium">{service.name}</p>
            <p className="text-sm text-gray-500">{service.description}</p>
            <p className="text-sm text-gray-500">
              ${service.basePrice.toFixed(2)}
            </p>
            <div className="mt-2 space-x-2">
              <Button
                className="bg-green-500"
                onClick={() => handleEdit(service)}
              >
                Edit Service
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(service.id.toString())}
              >
                Delete Service
              </Button>
            </div>
          </div>
        ))}

        {/* Edit Service Form */}
        <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Edit Service</SheetTitle>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={serviceForm.name}
                  onChange={handleChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={serviceForm.description}
                  onChange={handleChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Update Service</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Quotation Form */}
      <div>
        <Button onClick={() => setCreateQuotationOpen(true)}>
          Create Quotation
        </Button>
        <Sheet
          open={isCreateQuotationOpen}
          onOpenChange={setCreateQuotationOpen}
        >
          <SheetContent className="overflow-y-auto p-4 scroll-smooth">
            <SheetHeader>
              <SheetTitle>Create Quotation</SheetTitle>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              {services.map((service) => (
                <div key={service.id} className="mb-4 p-4 border rounded-lg">
                  <p className="text-md font-medium">{service.name}</p>
                  <p className="text-sm text-gray-500">{service.description}</p>
                  <p className="text-sm text-gray-500">
                    ${service.basePrice.toFixed(2)}
                  </p>
                  <Checkbox
                    checked={selectedServiceIds.includes(service.id.toString())}
                    onCheckedChange={() =>
                      handleCheckboxChange(service.id.toString())
                    }
                  />
                </div>
              ))}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quotation-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="quotation-name"
                  name="name"
                  value={quotationForm.name}
                  onChange={(e) =>
                    setQuotationForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quotation-description" className="text-right">
                  Description
                </Label>
                <Input
                  id="quotation-description"
                  name="description"
                  value={quotationForm.description}
                  onChange={(e) =>
                    setQuotationForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="col-span-3"
                />
              </div>
              <p className="text-right font-semibold">
                Total Price: ${totalPrice.toFixed(2)}
              </p>

              <Button onClick={handleCreateQuotation}>Submit Quotation</Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Quotation List */}
        <div className="mt-8">
          <p className="text-2xl font-bold mb-4">Quotations</p>
          {quotations.length === 0 ? (
            <p className="text-gray-500">No quotations found.</p>
          ) : (
            quotations.map((quotation) => (
              <div key={quotation.id} className="mb-4 p-4 border rounded-lg">
                <p className="text-md font-medium">{quotation.name}</p>
                <p className="text-sm text-gray-500">{quotation.description}</p>
                <p className="text-sm text-gray-500">
                  Total: ${quotation.totalPrice.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">
                  Status: {quotation.status}
                </p>
                <p className="text-sm text-gray-400">
                  Created: {new Date(quotation.created_at).toLocaleString()}
                </p>
                <div className="mt-2 space-x-2">
                  <Button
                    className="bg-green-500"
                    onClick={() => handleEditQuotation(quotation)}
                  >
                    Edit Quotation
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteQuotation(quotation.id.toString())}
                  >
                    Delete Quotation
                  </Button>
                </div>
              </div>
            ))
          )}
          {/* Edit Quotation Modal */}
          <Sheet open={isEditQuotationModalOpen} onOpenChange={setIsEditQuotationModalOpen}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Edit Quotation</SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-quotation-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="edit-quotation-name"
                    name="name"
                    value={quotationEditForm.name}
                    onChange={e => setQuotationEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-quotation-description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="edit-quotation-description"
                    name="description"
                    value={quotationEditForm.description}
                    onChange={e => setQuotationEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-quotation-totalPrice" className="text-right">
                    Total Price
                  </Label>
                  <Input
                    id="edit-quotation-totalPrice"
                    name="totalPrice"
                    type="number"
                    value={quotationEditForm.totalPrice}
                    onChange={e => setQuotationEditForm(prev => ({ ...prev, totalPrice: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-quotation-status" className="text-right">
                    Status
                  </Label>
                  <Input
                    id="edit-quotation-status"
                    name="status"
                    value={quotationEditForm.status}
                    onChange={e => setQuotationEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancelEditQuotation}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateQuotation}>Update Quotation</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

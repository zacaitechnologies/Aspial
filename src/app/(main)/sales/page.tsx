"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllServices, addService, editServiceById, deleteServiceById } from "./action";
import { Services } from "@prisma/client";
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

export default function Sales() {
  const [services, setServices] = useState<Services[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
  });

  const [editingService, setEditingService] = useState<Services | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getAllServices();
        setServices(data);
      } catch (error) {
        console.error("Failed to fetch services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const basePrice = parseFloat(form.basePrice);
    if (!form.name || !form.description || isNaN(basePrice)) {
      alert("Please fill all fields correctly.");
      return;
    }

    try {
      const newService = await addService({
        name: form.name,
        description: form.description,
        basePrice,
      });
      setServices((prev) => [...prev, newService]);
      setForm({ name: "", description: "", basePrice: "" });
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
    setForm({
      name: service.name,
      description: service.description,
      basePrice: service.basePrice.toString(),
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingService) return;
    
    const basePrice = parseFloat(form.basePrice);
    if (!form.name || !form.description || isNaN(basePrice)) {
      alert("Please fill all fields correctly.");
      return;
    }

    try {
      await editServiceById(editingService.id, {
        name: form.name,
        description: form.description,
        basePrice,
      });
      const updatedServices = await getAllServices();
      setServices(updatedServices);
      setEditingService(null);
      setForm({ name: "", description: "", basePrice: "" });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setForm({ name: "", description: "", basePrice: "" });
    setIsEditModalOpen(false);
  };

  if (loading) {
    return <div>Loading services...</div>;
  }

  return (
    <div>
      <p className="text-2xl font-bold mb-4">Services Available</p>

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
              onClick={() => handleDelete(service.id)}
            >
              Delete Service
            </Button>
          </div>
        </div>
      ))}

      <div className="mt-6 p-4 border rounded-lg">
        <p className="text-lg font-semibold mb-2">Add New Service</p>

        <Input
          className="block w-full border p-2 mb-2 rounded"
          type="text"
          name="name"
          placeholder="Service Name"
          value={form.name}
          onChange={handleChange}
        />
        <Input
          className="block w-full border p-2 mb-2 rounded"
          name="description"
          placeholder="Service Description"
          value={form.description}
          onChange={handleChange}
        />
        <Input
          className="block w-full border p-2 mb-2 rounded"
          type="number"
          name="basePrice"
          placeholder="Base Price"
          value={form.basePrice}
          onChange={handleChange}
        />

        <Button onClick={handleSubmit}>Add Service</Button>
      </div>

      {/* Edit Service Modal */}
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
                value={form.name}
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
                value={form.description}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-price" className="text-right">
                Price
              </Label>
              <Input
                id="edit-price"
                type="number"
                name="basePrice"
                value={form.basePrice}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              Update Service
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

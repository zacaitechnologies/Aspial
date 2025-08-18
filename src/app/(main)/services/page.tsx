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
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  getAllServices,
  addService,
  editServiceById,
  deleteServiceById,
  searchServices,
} from "./action";
import type { Services } from "@prisma/client";

export default function ServicesPage() {
  const [services, setServices] = useState<Services[]>([]);
  const [filteredServices, setFilteredServices] = useState<Services[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<Services | null>(null);

  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    basePrice: "",
  });

  const handleSearch = useCallback(async () => {
    if (searchQuery.trim() === "") {
      setFilteredServices(services);
      return;
    }

    try {
      const results = await searchServices(searchQuery);
      setFilteredServices(results);
    } catch (error) {
      console.error("Search failed:", error);
    }
  }, [searchQuery, services]);

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    const searchOrReset = async () => {
      if (searchQuery.trim() === "") {
        const fresh = await getAllServices();
        setServices(fresh);
        setFilteredServices(fresh);
      } else {
        try {
          const results = await searchServices(searchQuery);
          setFilteredServices(results);
        } catch (error) {
          console.error("Search failed:", error);
        }
      }
    };

    searchOrReset();
  }, [searchQuery]);

  const fetchServices = async () => {
    try {
      const data = await getAllServices();
      setServices(data);
      setFilteredServices(data);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const basePrice = Number.parseFloat(serviceForm.basePrice);
    if (!serviceForm.name || !serviceForm.description || isNaN(basePrice)) {
      alert("Please fill all fields correctly.");
      return;
    }

    try {
      await addService({
        name: serviceForm.name,
        description: serviceForm.description,
        basePrice,
      });
      await fetchServices();
      setServiceForm({ name: "", description: "", basePrice: "" });
      setIsCreateOpen(false);
    } catch (error) {
      console.error("Error adding service:", error);
    }
  };

  const handleEdit = (service: Services) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      basePrice: service.basePrice.toString(),
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingService) return;

    const basePrice = Number.parseFloat(serviceForm.basePrice);
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
      await fetchServices();
      setEditingService(null);
      setServiceForm({ name: "", description: "", basePrice: "" });
      setIsEditOpen(false);
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      await deleteServiceById(serviceId);
      await fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  const resetForm = () => {
    setServiceForm({ name: "", description: "", basePrice: "" });
    setEditingService(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading services...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-muted-foreground">
            Manage your available services
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent
            className="w-[80vw] max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg"
            showCloseButton={false}
          >
            <DialogHeader>
              <DialogTitle>Create New Service</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={serviceForm.name}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter service name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Enter service description"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="basePrice">Base Price ($)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  value={serviceForm.basePrice}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      basePrice: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Create Service</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <Card key={service.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1 bg-accent">
                    ${service.basePrice.toFixed(2)}
                  </Badge>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(service)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(service.id.toString())}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{service.description}</CardDescription>
              <p className="text-xs text-muted-foreground mt-2">
                Created: {new Date(service.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No services found matching your search."
              : "No services available."}
          </p>
        </div>
      )}

      {/* Edit Service Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          className="w-[80vw] max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Service Name</Label>
              <Input
                id="edit-name"
                value={serviceForm.name}
                onChange={(e) =>
                  setServiceForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter service name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter service description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-basePrice">Base Price ($)</Label>
              <Input
                id="edit-basePrice"
                type="number"
                step="0.01"
                value={serviceForm.basePrice}
                onChange={(e) =>
                  setServiceForm((prev) => ({
                    ...prev,
                    basePrice: e.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsEditOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update Service</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

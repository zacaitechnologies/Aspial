"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Search, Plus, Loader2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteService, searchServices } from "../service-actions";
import { Service } from "../types";
import ServiceForm from "./ServiceForm";
import React from "react";
import { useServicesCacheContext } from "../contexts/ServicesCacheContext";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "@/components/ui/use-toast";

interface ServicesListProps {
  services: Service[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  isAdmin?: boolean;
}

export default function ServicesList({
  services,
  isLoading,
  onRefresh,
  isAdmin = false,
}: ServicesListProps) {
  const { invalidateAllCaches, serviceTags } = useServicesCacheContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredServices, setFilteredServices] = useState<Service[]>(services);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteServiceId, setDeleteServiceId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 12;

  // Calculate pagination
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTagFilter]);

  // Search as you type with debounce
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        // Reset to original services with tag filter applied
        let filtered = services;
        if (selectedTagFilter !== "all") {
          const tagId = parseInt(selectedTagFilter);
          filtered = filtered.filter((service) =>
            service.tags?.some((tag) => tag.id === tagId)
          );
        }
        setFilteredServices(filtered);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const searchResults = await searchServices(searchQuery);
        // Apply tag filter to search results
        let filtered = searchResults;
        if (selectedTagFilter !== "all") {
          const tagId = parseInt(selectedTagFilter);
          filtered = filtered.filter((service) =>
            service.tags?.some((tag) => tag.id === tagId)
          );
        }
        setFilteredServices(filtered);
      } catch (error) {
        console.error("Error searching services:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedTagFilter, services]);

  // Update filtered services when services prop or tag filter changes (when not searching)
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      let filtered = services;

      // Apply tag filter
      if (selectedTagFilter !== "all") {
        const tagId = parseInt(selectedTagFilter);
        filtered = filtered.filter((service) =>
          service.tags?.some((tag) => tag.id === tagId)
        );
      }

      setFilteredServices(filtered);
    }
  }, [services, selectedTagFilter, searchQuery]);

  const handleDeleteService = async (serviceId: number) => {
    setDeleteServiceId(serviceId);
  };

  const confirmDeleteService = async () => {
    if (!deleteServiceId) return;
    
    setIsDeleting(true);
    try {
      await deleteService(deleteServiceId);
      invalidateAllCaches();
      await onRefresh();
      // Clear search after deletion to show updated list
      setSearchQuery("");
      setDeleteServiceId(null);
      toast({
        title: "Success",
        description: "Service deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
  };

  const handleServiceSuccess = () => {
    setEditingService(null);
    invalidateAllCaches();
    onRefresh();
    // Clear search to show updated list
    setSearchQuery("");
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedTagFilter("all");
    setFilteredServices(services);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Services</h2>
          <p className="text-gray-600 mt-1">
            {filteredServices.length} service
            {filteredServices.length !== 1 ? "s" : ""} available
          </p>
        </div>
        {isAdmin && <ServiceForm onSuccess={handleServiceSuccess} />}
      </div>

      {/* Search and Filter Section */}
      <div className="space-y-4">
        {/* Search Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search services by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-2"
              style={{ borderColor: "#BDC4A5" }}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />
            )}
          </div>
          {(searchQuery || selectedTagFilter !== "all") && (
            <Button
              variant="outline"
              onClick={clearSearch}
              className="border-2 bg-white"
              style={{ borderColor: "#BDC4A5" }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Tag Filter Row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Filter by tag:
            </span>
          </div>
          <Select
            value={selectedTagFilter}
            onValueChange={setSelectedTagFilter}
          >
            <SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {serviceTags.tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: tag.color || "#3B82F6" }}
                    />
                    <span>{tag.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading services...</p>
          </div>
        </div>
      )}

      {/* Services Grid */}
      {!isLoading && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {paginatedServices.map((service) => (
            <Card key={service.id} className="card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800"
                      >
                        RM {service.basePrice.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditService(service)}
                        title="Edit Service"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete Service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {service.description}
                </p>

                {/* Tags */}
                {service.tags && service.tags.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {service.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          style={{
                            backgroundColor: tag.color || "#3B82F6",
                            color: "white",
                          }}
                          className="px-2 py-1 text-xs font-medium shadow-sm"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3">
                  Created: {new Date(service.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredServices.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? "No services found" : "No services yet"}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? "Try adjusting your search terms or create a new service."
              : "Get started by creating your first service."}
          </p>
          {!searchQuery && isAdmin && <ServiceForm onSuccess={handleServiceSuccess} />}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && filteredServices.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-6 px-2">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredServices.length)} of {filteredServices.length} services
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Service Dialog */}
      {editingService && (
        <ServiceForm
          service={editingService}
          onSuccess={handleServiceSuccess}
        />
      )}

      <ConfirmationDialog
        isOpen={deleteServiceId !== null}
        onClose={() => setDeleteServiceId(null)}
        onConfirm={confirmDeleteService}
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

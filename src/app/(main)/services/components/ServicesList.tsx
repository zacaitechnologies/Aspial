"use client";

import { useState } from "react";
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

interface ServicesListProps {
  services: Service[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export default function ServicesList({
  services,
  isLoading,
  onRefresh,
}: ServicesListProps) {
  const { invalidateAllCaches, serviceTags } = useServicesCacheContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredServices, setFilteredServices] = useState<Service[]>(services);

  // Update filtered services when services prop or tag filter changes
  React.useEffect(() => {
    let filtered = services;

    // Apply tag filter
    if (selectedTagFilter !== "all") {
      const tagId = parseInt(selectedTagFilter);
      filtered = filtered.filter((service) =>
        service.tags?.some((tag) => tag.id === tagId)
      );
    }

    setFilteredServices(filtered);
  }, [services, selectedTagFilter]);

  const handleSearch = async () => {
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

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      await deleteService(serviceId);
      invalidateAllCaches();
      await onRefresh();
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
  };

  const handleServiceSuccess = () => {
    setEditingService(null);
    invalidateAllCaches();
    onRefresh();
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedTagFilter("all");
    setFilteredServices(services);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Services</h2>
          <p className="text-gray-600 mt-1">
            {filteredServices.length} service
            {filteredServices.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <ServiceForm onSuccess={handleServiceSuccess} />
      </div>

      {/* Search and Filter Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-4">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search services by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search
            </Button>
            {(searchQuery || selectedTagFilter !== "all") && (
              <Button
                variant="outline"
                onClick={clearSearch}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
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
              <SelectTrigger className="w-48 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500">
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <Card
              key={service.id}
              className="hover:shadow-lg transition-all duration-200 border-gray-200 hover:border-blue-200 group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg font-semibold text-gray-900 leading-tight">
                    {service.name}
                  </CardTitle>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditService(service)}
                      className="h-8 w-8 p-0 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteService(service.id)}
                      className="h-8 w-8 p-0 border-gray-300 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-green-600">
                    RM {service.basePrice.toFixed(2)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                  {service.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {service.tags && service.tags.length > 0 ? (
                    service.tags.map((tag) => (
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
                    ))
                  ) : (
                    <Badge
                      style={{ backgroundColor: "#9CA3AF", color: "white" }}
                      className="px-2 py-1 text-xs font-medium shadow-sm"
                    >
                      No Tags
                    </Badge>
                  )}
                </div>
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
          {!searchQuery && <ServiceForm onSuccess={handleServiceSuccess} />}
        </div>
      )}

      {/* Edit Service Dialog */}
      {editingService && (
        <ServiceForm
          service={editingService}
          onSuccess={handleServiceSuccess}
        />
      )}
    </div>
  );
}

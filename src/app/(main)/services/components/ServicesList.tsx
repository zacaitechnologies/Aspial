"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Search, Loader2, Filter, Download, FileText, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteService,
  searchServices,
  toggleServiceHidden,
  getServiceDeletionImpact,
  getServiceImageSignedUrl,
  type DeletionImpact,
} from "../service-actions";
import { extractServiceStorageObjectKey, serviceAttachmentIsPdf } from "../service-utils";
import { Service } from "../types";
import ServiceForm from "./ServiceForm";

const SEARCH_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const searchResultCache = new Map<string, { data: Service[]; timestamp: number }>();
import React from "react";
import { useServicesCacheContext } from "../contexts/ServicesCacheContext";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "@/components/ui/use-toast";
import { DeletionImpactWarningDialog } from "@/components/ui/deletion-impact-warning-dialog";
import { formatNumber } from "@/lib/format-number";
import { FormattedDescription } from "@/components/FormattedDescription";

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
  const { invalidateAllCaches, serviceTags, hiddenFilter, setHiddenFilter } = useServicesCacheContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredServices, setFilteredServices] = useState<Service[]>(services);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteServiceId, setDeleteServiceId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null);
  const [hideConfirmService, setHideConfirmService] = useState<Service | null>(null);
  const [isTogglingHidden, setIsTogglingHidden] = useState(false);
  const itemsPerPage = 12;

  // Calculate pagination
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, endIndex);

  const [signedImageUrls, setSignedImageUrls] = useState<Record<number, string>>({});

  const paginatedImageSignature = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredServices
      .slice(start, start + itemsPerPage)
      .map((s) => `${s.id}:${s.imageUrl ?? ""}`)
      .join("|")
  }, [currentPage, filteredServices, itemsPerPage])

  useEffect(() => {
    let cancelled = false
    const start = (currentPage - 1) * itemsPerPage
    const slice = filteredServices.slice(start, start + itemsPerPage)
    const withFiles = slice.filter((s) => Boolean(s.imageUrl))
    if (withFiles.length === 0) {
      setSignedImageUrls({})
      return
    }

    void (async () => {
      const results = await Promise.all(
        withFiles.map(async (s) => {
          const { signedUrl } = await getServiceImageSignedUrl(s.imageUrl)
          return { id: s.id, signedUrl: signedUrl ?? null }
        })
      )
      if (cancelled) return
      setSignedImageUrls((prev) => {
        const next = { ...prev }
        for (const s of slice) {
          if (!s.imageUrl) delete next[s.id]
        }
        for (const { id, signedUrl } of results) {
          if (signedUrl) next[id] = signedUrl
          else delete next[id]
        }
        return next
      })
    })()

    return () => {
      cancelled = true
    }
  }, [paginatedImageSignature, currentPage, filteredServices])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTagFilter, hiddenFilter]);

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
        let searchResults: Service[];
        // Server-side search returns visible-only. In admin Hidden/All modes
        // we filter the already-loaded list client-side so hidden rows match.
        if (hiddenFilter !== "visible") {
          const q = searchQuery.trim().toLowerCase();
          searchResults = services.filter((s) =>
            s.name.toLowerCase().includes(q) ||
            (s.description ?? "").toLowerCase().includes(q),
          );
        } else {
          const cacheKey = searchQuery.trim().toLowerCase();
          const now = Date.now();
          const cached = searchResultCache.get(cacheKey);
          if (cached && now - cached.timestamp < SEARCH_CACHE_TTL) {
            searchResults = cached.data;
          } else {
            searchResults = await searchServices(searchQuery);
            searchResultCache.set(cacheKey, { data: searchResults, timestamp: now });
          }
        }
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
        if (process.env.NODE_ENV === "development") {
          console.error("Error searching services:", error);
        }
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedTagFilter, services, hiddenFilter]);

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
    try {
      const impact = await getServiceDeletionImpact(serviceId);
      setDeletionImpact(impact);
      if (impact.items.length > 0 && impact.items.some((item) => item.count > 0)) {
        setIsWarningDialogOpen(true);
      }
      // If no relations, the normal confirmation dialog will show (isOpen={deleteServiceId !== null && !isWarningDialogOpen})
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to get deletion impact:", error)
      }
      toast({
        title: "Error",
        description: "Failed to check deletion impact. Please try again.",
        variant: "destructive",
      });
      setDeleteServiceId(null);
    }
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
      setIsWarningDialogOpen(false);
      setDeletionImpact(null);
      toast({
        title: "Success",
        description: "Service deleted successfully.",
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error deleting service:", error)
      }
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleHidden = async (service: Service) => {
    // Unhide is instant; hide requires confirmation.
    if (!service.hidden) {
      setHideConfirmService(service);
      return;
    }
    setIsTogglingHidden(true);
    try {
      await toggleServiceHidden(service.id, false);
      invalidateAllCaches();
      await onRefresh();
      toast({
        title: "Service unhidden",
        description: `"${service.name}" is now visible to everyone.`,
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error toggling service visibility:", error);
      }
      toast({
        title: "Error",
        description: "Failed to update service visibility. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingHidden(false);
    }
  };

  const confirmHideService = async () => {
    if (!hideConfirmService) return;
    setIsTogglingHidden(true);
    try {
      await toggleServiceHidden(hideConfirmService.id, true);
      invalidateAllCaches();
      await onRefresh();
      toast({
        title: "Service hidden",
        description: `"${hideConfirmService.name}" is hidden from non-admins. Existing quotations and delivery orders are unaffected.`,
      });
      setHideConfirmService(null);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error hiding service:", error);
      }
      toast({
        title: "Error",
        description: "Failed to hide service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingHidden(false);
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

  const handleDownloadImage = async (service: Service) => {
    if (!service.imageUrl) return
    try {
      const { signedUrl, error } = await getServiceImageSignedUrl(service.imageUrl)
      if (!signedUrl) {
        throw new Error(error ?? "Could not resolve file URL")
      }
      const response = await fetch(signedUrl)
      if (!response.ok) {
        throw new Error("Failed to fetch file")
      }

      const blob = await response.blob()

      // Resolve extension from the stored object key (signed URL contains a JWT with dots)
      const objectKey = extractServiceStorageObjectKey(service.imageUrl) ?? ""
      const keyExtension = objectKey.includes(".")
        ? objectKey.split(".").pop()?.toLowerCase()
        : undefined
      const blobExtension = blob.type === "application/pdf"
        ? "pdf"
        : blob.type.startsWith("image/")
          ? blob.type.replace("image/", "")
          : undefined
      const extension = keyExtension || blobExtension || "bin"

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob)

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${service.name.replace(/\s+/g, "-")}-file.${extension}`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      
      toast({
        title: "Success",
        description: "File downloaded successfully",
      })
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error downloading file:", error)
      }
      toast({
        title: "Error",
        description: "Failed to download file. Please try again.",
        variant: "destructive",
      })
    }
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

        {/* Tag + Visibility Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
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

          {isAdmin && (
            <>
              <div className="flex items-center gap-2 sm:ml-4">
                <EyeOff className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Visibility:
                </span>
              </div>
              <Select
                value={hiddenFilter}
                onValueChange={(v) => setHiddenFilter(v as typeof hiddenFilter)}
              >
                <SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible">Visible only</SelectItem>
                  <SelectItem value="hidden">Hidden only</SelectItem>
                  <SelectItem value="all">Show all</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
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
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{service.name}</span>
                      {service.hidden && (
                        <Badge
                          variant="secondary"
                          className="bg-gray-200 text-gray-700 border border-gray-300"
                        >
                          Hidden
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800"
                      >
                        RM {formatNumber(service.basePrice)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Document/Image buttons - shown to all users if file exists */}
                    {service.imageUrl && (
                      <>
                        {serviceAttachmentIsPdf(service.imageUrl) ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const { signedUrl } = await getServiceImageSignedUrl(
                                  service.imageUrl
                                )
                                if (signedUrl) window.open(signedUrl, "_blank", "noopener,noreferrer")
                                else {
                                  toast({
                                    title: "Error",
                                    description: "Could not open PDF. Please try again.",
                                    variant: "destructive",
                                  })
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="View PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDownloadImage(service)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDownloadImage(service)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Download image"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                    {/* Admin buttons */}
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleToggleHidden(service)}
                          disabled={isTogglingHidden}
                          className={service.hidden ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"}
                          title={service.hidden ? "Unhide service" : "Hide service"}
                        >
                          {service.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
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
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Service Image - only show images, not PDFs */}
                {service.imageUrl &&
                  !serviceAttachmentIsPdf(service.imageUrl) &&
                  signedImageUrls[service.id] && (
                  <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 relative group">
                    <Image
                      src={signedImageUrls[service.id]}
                      alt={service.name}
                      width={600}
                      height={300}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                <FormattedDescription
                  text={service.description ?? ""}
                  className="text-sm text-muted-foreground mb-3"
                  truncate
                />

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
                  Created: {new Date(service.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
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
        isOpen={deleteServiceId !== null && !isWarningDialogOpen}
        onClose={() => {
          setDeleteServiceId(null);
          setDeletionImpact(null);
        }}
        onConfirm={confirmDeleteService}
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <DeletionImpactWarningDialog
        isOpen={isWarningDialogOpen}
        onClose={() => {
          setIsWarningDialogOpen(false);
          setDeleteServiceId(null);
          setDeletionImpact(null);
        }}
        onProceed={confirmDeleteService}
        title="Delete Service"
        entityName="service"
        impactItems={deletionImpact?.items || []}
        isLoading={isDeleting}
      />

      <ConfirmationDialog
        isOpen={hideConfirmService !== null}
        onClose={() => setHideConfirmService(null)}
        onConfirm={confirmHideService}
        title="Hide Service"
        description={
          hideConfirmService
            ? `Hide "${hideConfirmService.name}" from non-admin users? It will disappear from the services list and from quotation / delivery-order pickers. Existing quotations and delivery orders that already reference it are unaffected. You can unhide it at any time.`
            : ""
        }
        confirmText="Hide"
        cancelText="Cancel"
        isLoading={isTogglingHidden}
      />
    </div>
  );
}

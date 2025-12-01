"use client";

import { Button } from "@/components/ui/button";
import { Plus, FileText, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { getQuotationsPaginated, deleteQuotationById } from "./action";
import CreateQuotationForm from "./components/CreateQuotationForm";
import EditQuotationForm from "./components/EditQuotationForm";
import QuotationCard from "./components/QuotationCard";
import { QuotationWithServices, statusOptions } from "./types";
import { useSession } from "../contexts/SessionProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { ProjectPagination } from "../projects/components/ProjectPagination";
import { toast } from "@/components/ui/use-toast";

export default function QuotationsPage() {
  const { enhancedUser } = useSession();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] =
    useState<QuotationWithServices | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination with server-side filtering
  const {
    data: quotations,
    isLoading: loading,
    page,
    pageSize,
    total,
    totalPages,
    goToPage,
    setPageSize,
    refresh,
    invalidateCache,
  } = usePaginatedData<QuotationWithServices, any>({
    fetchFn: async (page, pageSize) => {
      return await getQuotationsPaginated(page, pageSize, {
        statusFilter,
      })
    },
    initialPage: 1,
    initialPageSize: 10,
    filters: { statusFilter },
  })

  const handleEditQuotation = (quotation: QuotationWithServices) => {
    setEditingQuotation(quotation);
    setIsEditOpen(true);
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    try {
      await deleteQuotationById(quotationId);
      invalidateCache()
      await refresh();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      toast({
        title: "Error",
        description: "Failed to delete quotation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSuccess = async () => {
    invalidateCache()
    await refresh()
  }

  return (
    <>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Quotations Management</h1>
            <p className="text-muted-foreground">
              Create and manage client quotations. Link quotations to projects using the integrated project selection.
            </p>
          </div>

          <Button onClick={() => setIsCreateOpen(true)} className="text-white" style={{ backgroundColor: "#202F21" }}>
            <Plus className="w-5 h-5 mr-2" />
            Create Quotation
          </Button>
        </div>

        {/* Filter Section */}
        <div className="mb-6 flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">Filter by status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusFilter !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="bg-white border-2"
              style={{ borderColor: "#BDC4A5" }}
            >
              Clear Filter
            </Button>
          )}
          <span className="text-sm text-muted-foreground ml-auto">
            Showing {quotations.length} of {total} quotations
          </span>
        </div>

        {/* Quotations Grid with Loading Overlay */}
        <div className="relative">
          <div className={`grid grid-cols-1 lg:grid-cols-2 justify-start gap-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {quotations.map((quotation) => (
              <QuotationCard
                key={quotation.id}
                quotation={quotation}
                onEdit={handleEditQuotation}
                onDelete={handleDeleteQuotation}
                onRefresh={handleSuccess}
              />
            ))}
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-3 text-primary">
                <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-sm font-medium">Loading quotations…</p>
              </div>
            </div>
          )}
        </div>

        {!loading && quotations.length === 0 && total === 0 && statusFilter === 'all' && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No quotations available.</p>
          </div>
        )}

        {!loading && quotations.length === 0 && statusFilter !== 'all' && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No quotations match the selected filter.</p>
            <Button
              variant="outline"
              className="mt-4 bg-white border-2"
              style={{ borderColor: "#BDC4A5" }}
              onClick={() => setStatusFilter("all")}
            >
              Clear Filter
            </Button>
          </div>
        )}

        {/* Pagination */}
        <ProjectPagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
        />

        {/* Create Quotation Form */}
        <CreateQuotationForm
          isOpen={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={handleSuccess}
        />

        {/* Edit Quotation Form */}
        <EditQuotationForm
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={handleSuccess}
          editingQuotation={editingQuotation}
        />
      </div>
    </>
  );
}

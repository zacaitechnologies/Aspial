"use client";

import { Button } from "@/components/ui/button";
import { Plus, FileText, Filter } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { getQuotationsPaginatedFresh, deleteQuotationById, invalidateQuotationsCache } from "../action";
import CreateQuotationForm from "./CreateQuotationForm";
import EditQuotationForm from "./EditQuotationForm";
import QuotationCard from "./QuotationCard";
import { QuotationWithServices, statusOptions } from "../types";
import { useSession } from "../../contexts/SessionProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectPagination } from "../../projects/components/ProjectPagination";
import { toast } from "@/components/ui/use-toast";

interface QuotationsClientProps {
  initialData: {
    data: QuotationWithServices[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  userId?: string;
}

export default function QuotationsClient({ initialData, userId }: QuotationsClientProps) {
  const { enhancedUser } = useSession();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<QuotationWithServices | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // State from initial data
  const [quotations, setQuotations] = useState<QuotationWithServices[]>(initialData.data);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSizeState] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);

  // Fetch fresh data when filters change
  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getQuotationsPaginatedFresh(page, pageSize, {
        statusFilter: statusFilter !== "all" ? statusFilter : undefined,
      });
      setQuotations(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  // Refetch when filters/pagination change
  useEffect(() => {
    // Skip initial load since we have initialData
    if (
      page === initialData.page &&
      pageSize === initialData.pageSize &&
      statusFilter === "all"
    ) {
      return;
    }
    fetchQuotations();
  }, [page, pageSize, statusFilter, fetchQuotations, initialData.page, initialData.pageSize]);

  const handleEditQuotation = (quotation: QuotationWithServices) => {
    setEditingQuotation(quotation);
    setIsEditOpen(true);
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    try {
      await deleteQuotationById(quotationId);
      await invalidateQuotationsCache();
      await fetchQuotations();
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
    await invalidateQuotationsCache();
    await fetchQuotations();
  };

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

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
          <div className={`grid grid-cols-1 lg:grid-cols-2 justify-start gap-6 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
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

        {!loading && quotations.length === 0 && total === 0 && statusFilter === "all" && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No quotations available.</p>
          </div>
        )}

        {!loading && quotations.length === 0 && statusFilter !== "all" && (
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
        <CreateQuotationForm isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={handleSuccess} />

        {/* Edit Quotation Form */}
        <EditQuotationForm isOpen={isEditOpen} onOpenChange={setIsEditOpen} onSuccess={handleSuccess} editingQuotation={editingQuotation} />
      </div>
    </>
  );
}


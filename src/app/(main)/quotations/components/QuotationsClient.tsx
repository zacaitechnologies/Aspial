"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Filter, Search, Calendar } from "lucide-react";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { QuotationFilters } from "@/lib/validation";
import { getQuotationsPaginatedFresh, deleteQuotationById, invalidateQuotationsCache } from "../action";
import CreateQuotationForm from "./CreateQuotationForm";
import EditQuotationForm from "./EditQuotationForm";
import QuotationCard from "./QuotationCard";
import { QuotationWithServices, statusOptions } from "../types";
import { useSession } from "../../contexts/SessionProvider";
import { checkHasFullAccess } from "../../actions/admin-actions";
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
  initialAdvisors: { id: string; firstName: string; lastName: string }[];
}

const WORKFLOW_STATUSES = ["draft", "in_review", "final", "accepted", "rejected", "cancelled"] as const;

function isWorkflowStatus(v: string): v is (typeof WORKFLOW_STATUSES)[number] {
  return (WORKFLOW_STATUSES as readonly string[]).includes(v);
}

export default function QuotationsClient({ initialData, initialAdvisors }: QuotationsClientProps) {
  const { enhancedUser } = useSession();
  const [isMounted, setIsMounted] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<QuotationWithServices | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [monthYearFilter, setMonthYearFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const monthYearOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: "all", label: "All months" }];
    const now = new Date();
    for (let i = 0; i < 36; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const value = `${y}-${String(m).padStart(2, "0")}`;
      const label = d.toLocaleString("en-GB", { month: "long", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  }, []);

  const buildListFilters = useCallback((): QuotationFilters => {
    return {
      statusFilter:
        statusFilter !== "all" && isWorkflowStatus(statusFilter) ? statusFilter : undefined,
      searchQuery: searchQuery || undefined,
      advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
      monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
    };
  }, [statusFilter, searchQuery, advisorFilter, monthYearFilter]);

  const [quotations, setQuotations] = useState<QuotationWithServices[]>(initialData.data);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSizeState] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (enhancedUser?.id) {
        try {
          const hasFullAccess = await checkHasFullAccess(enhancedUser.id);
          setIsAdmin(hasFullAccess);
        } catch (error: unknown) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Error checking admin status:", error);
          }
        }
      }
    };
    fetchAdminStatus();
  }, [enhancedUser?.id]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getQuotationsPaginatedFresh(page, pageSize, buildListFilters());
      setQuotations(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("Error fetching quotations:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, buildListFilters]);

  const handleStatusFilterChange = useCallback(
    async (value: string) => {
      setStatusFilter(value);
      setPage(1);
      setLoading(true);
      try {
        const result = await getQuotationsPaginatedFresh(1, pageSize, {
          statusFilter: value !== "all" && isWorkflowStatus(value) ? value : undefined,
          searchQuery: searchQuery || undefined,
          advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
          monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
        });
        setQuotations(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (error: unknown) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Error fetching quotations:", error);
        }
      } finally {
        setLoading(false);
      }
    },
    [pageSize, searchQuery, advisorFilter, monthYearFilter]
  );

  const handleAdvisorFilterChange = useCallback(
    async (value: string) => {
      setAdvisorFilter(value);
      setPage(1);
      setLoading(true);
      try {
        const result = await getQuotationsPaginatedFresh(1, pageSize, {
          statusFilter: statusFilter !== "all" && isWorkflowStatus(statusFilter) ? statusFilter : undefined,
          searchQuery: searchQuery || undefined,
          advisorFilter: value !== "all" ? value : undefined,
          monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
        });
        setQuotations(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (error: unknown) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Error fetching quotations:", error);
        }
      } finally {
        setLoading(false);
      }
    },
    [pageSize, statusFilter, searchQuery, monthYearFilter]
  );

  const handleMonthYearFilterChange = useCallback(
    async (value: string) => {
      setMonthYearFilter(value);
      setPage(1);
      setLoading(true);
      try {
        const result = await getQuotationsPaginatedFresh(1, pageSize, {
          statusFilter: statusFilter !== "all" && isWorkflowStatus(statusFilter) ? statusFilter : undefined,
          searchQuery: searchQuery || undefined,
          advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
          monthYear: value !== "all" ? value : undefined,
        });
        setQuotations(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (error: unknown) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Error fetching quotations:", error);
        }
      } finally {
        setLoading(false);
      }
    },
    [pageSize, statusFilter, searchQuery, advisorFilter]
  );

  const goToPage = useCallback(
    async (newPage: number) => {
      setPage(newPage);
      setLoading(true);
      try {
        const result = await getQuotationsPaginatedFresh(newPage, pageSize, {
          statusFilter: statusFilter !== "all" && isWorkflowStatus(statusFilter) ? statusFilter : undefined,
          searchQuery: searchQuery || undefined,
          advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
          monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
        });
        setQuotations(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (error: unknown) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Error fetching quotations:", error);
        }
      } finally {
        setLoading(false);
      }
    },
    [pageSize, statusFilter, searchQuery, advisorFilter, monthYearFilter]
  );

  const setPageSize = useCallback(
    async (size: number) => {
      setPageSizeState(size);
      setPage(1);
      setLoading(true);
      try {
        const result = await getQuotationsPaginatedFresh(1, size, {
          statusFilter: statusFilter !== "all" && isWorkflowStatus(statusFilter) ? statusFilter : undefined,
          searchQuery: searchQuery || undefined,
          advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
          monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
        });
        setQuotations(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (error: unknown) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Error fetching quotations:", error);
        }
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, searchQuery, advisorFilter, monthYearFilter]
  );

  const prevSearchQueryRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isMounted) return;
    if (prevSearchQueryRef.current === undefined) {
      prevSearchQueryRef.current = searchQuery;
      return;
    }
    if (prevSearchQueryRef.current === searchQuery) return;
    prevSearchQueryRef.current = searchQuery;
    setPage(1);
    setLoading(true);
    getQuotationsPaginatedFresh(1, pageSize, {
      statusFilter: statusFilter !== "all" && isWorkflowStatus(statusFilter) ? statusFilter : undefined,
      searchQuery: searchQuery || undefined,
      advisorFilter: advisorFilter !== "all" ? advisorFilter : undefined,
      monthYear: monthYearFilter !== "all" ? monthYearFilter : undefined,
    })
      .then((result) => {
        setQuotations(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Error fetching quotations:", err);
        }
      })
      .finally(() => setLoading(false));
  }, [searchQuery, isMounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditQuotation = useCallback((quotation: QuotationWithServices) => {
    setEditingQuotation(quotation);
    setIsEditOpen(true);
  }, []);

  const handleDeleteQuotation = useCallback(
    async (quotationId: string) => {
      try {
        await deleteQuotationById(quotationId);
        await invalidateQuotationsCache();
        await fetchQuotations();
        toast({
          title: "Success",
          description: "Quotation deleted successfully.",
        });
      } catch (error: unknown) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Error deleting quotation:", error);
        }
        const errorMessage = error instanceof Error ? error.message : "Failed to delete quotation. Please try again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [fetchQuotations]
  );

  const handleSuccess = useCallback(async () => {
    await invalidateQuotationsCache();
    await fetchQuotations();
  }, [fetchQuotations]);

  const hasActiveFilters =
    statusFilter !== "all" || advisorFilter !== "all" || monthYearFilter !== "all";

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

          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Create Quotation
          </Button>
        </div>

        {isMounted && (
          <div className="mb-6 flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search quotations, client..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full border-2 bg-white pl-9"
                style={{ borderColor: "#BDC4A5" }}
                aria-label="Search quotations"
              />
            </div>
            <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
              <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="shrink-0 text-sm font-medium">Filters</span>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger
                  className="h-9 w-[min(12rem,100%)] shrink-0 border-2 bg-white sm:w-48"
                  style={{ borderColor: "#BDC4A5" }}
                >
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
              {initialAdvisors.length > 0 && (
                <Select value={advisorFilter} onValueChange={handleAdvisorFilterChange}>
                  <SelectTrigger
                    className="h-9 w-[min(12rem,100%)] shrink-0 border-2 bg-white sm:w-48"
                    style={{ borderColor: "#BDC4A5" }}
                  >
                    <SelectValue placeholder="All Advisors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Advisors</SelectItem>
                    {initialAdvisors.map((advisor) => (
                      <SelectItem key={advisor.id} value={advisor.id}>
                        {advisor.firstName} {advisor.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex shrink-0 items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
                <Select value={monthYearFilter} onValueChange={handleMonthYearFilterChange}>
                  <SelectTrigger
                    className="h-9 w-[min(12.5rem,85vw)] border-2 bg-white sm:w-[200px]"
                    style={{ borderColor: "#BDC4A5" }}
                  >
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {monthYearOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setStatusFilter("all");
                    setAdvisorFilter("all");
                    setMonthYearFilter("all");
                    setPage(1);
                    setLoading(true);
                    try {
                      const result = await getQuotationsPaginatedFresh(1, pageSize, {
                        searchQuery: searchQuery || undefined,
                      });
                      setQuotations(result.data);
                      setTotal(result.total);
                      setTotalPages(result.totalPages);
                    } catch (error: unknown) {
                      if (process.env.NODE_ENV === "development") {
                        // eslint-disable-next-line no-console
                        console.error("Error fetching quotations:", error);
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="shrink-0 border-2 bg-white"
                  style={{ borderColor: "#BDC4A5" }}
                >
                  Clear Filters
                </Button>
              )}
              <span className="ml-auto shrink-0 pl-2 text-sm whitespace-nowrap text-muted-foreground">
                Showing {quotations.length} of {total} quotations
              </span>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="space-y-2">
            {quotations.map((quotation) => (
              <QuotationCard
                key={quotation.id}
                quotation={quotation}
                onEdit={handleEditQuotation}
                onDelete={handleDeleteQuotation}
                onRefresh={handleSuccess}
                isAdmin={isAdmin}
              />
            ))}
          </div>

          {loading && quotations.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                <span>Loading...</span>
              </div>
            </div>
          )}

          {loading && quotations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-primary">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <p className="text-lg font-medium">Loading quotations…</p>
            </div>
          )}
        </div>

        {!loading && quotations.length === 0 && total === 0 && !hasActiveFilters && !searchQuery && (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No quotations available.</p>
          </div>
        )}

        {!loading && quotations.length === 0 && hasActiveFilters && (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No quotations match the selected filter.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={async () => {
                setStatusFilter("all");
                setAdvisorFilter("all");
                setMonthYearFilter("all");
                setPage(1);
                setLoading(true);
                try {
                  const result = await getQuotationsPaginatedFresh(1, pageSize, {
                    searchQuery: searchQuery || undefined,
                  });
                  setQuotations(result.data);
                  setTotal(result.total);
                  setTotalPages(result.totalPages);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {!loading && quotations.length === 0 && !hasActiveFilters && searchQuery && (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No quotations match your search.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchInput("");
                setSearchQuery("");
              }}
            >
              Clear Search
            </Button>
          </div>
        )}

        <ProjectPagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
        />

        <CreateQuotationForm isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={handleSuccess} />

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

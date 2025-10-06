"use client";

import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getAllQuotations, deleteQuotationById } from "./action";
import CreateQuotationForm from "./components/CreateQuotationForm";
import EditQuotationForm from "./components/EditQuotationForm";
import QuotationCard from "./components/QuotationCard";
import { QuotationWithServices } from "./types";
import { useSession } from "../contexts/SessionProvider";

export default function QuotationsPage() {
  const { enhancedUser } = useSession();
  const [quotations, setQuotations] = useState<QuotationWithServices[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] =
    useState<QuotationWithServices | null>(null);

  const fetchData = useCallback(async () => {
    try {
      if (!enhancedUser?.id) {
        console.error("User not authenticated");
        return;
      }
      const quotationsData = await getAllQuotations(enhancedUser.id);
      setQuotations(quotationsData as QuotationWithServices[]);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [enhancedUser?.id]);

  useEffect(() => {
    if (enhancedUser?.id) {
      fetchData();
    }
  }, [enhancedUser?.id, fetchData]);

  const handleEditQuotation = (quotation: QuotationWithServices) => {
    setEditingQuotation(quotation);
    setIsEditOpen(true);
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    try {
      await deleteQuotationById(quotationId);
      await fetchData();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      alert("Failed to delete quotation. Please try again.");
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading quotations...
      </div>
    );
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

          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Quotation
          </Button>
        </div>

        {/* Quotations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {quotations.map((quotation) => (
            <QuotationCard
              key={quotation.id}
              quotation={quotation}
              onEdit={handleEditQuotation}
              onDelete={handleDeleteQuotation}
              onRefresh={fetchData}
            />
          ))}
        </div>

        {quotations.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No quotations available.</p>
          </div>
        )}

        {/* Create Quotation Form */}
        <CreateQuotationForm
          isOpen={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={fetchData}
        />

        {/* Edit Quotation Form */}
        <EditQuotationForm
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={fetchData}
          editingQuotation={editingQuotation}
        />
      </div>
    </>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import {
  getAllQuotations,
  deleteQuotationById,
} from "./action";
import { createProject } from "../projects/action";
import CreateQuotationForm from "./components/CreateQuotationForm"
import EditQuotationForm from "./components/EditQuotationForm"
import QuotationCard from "./components/QuotationCard";
import { QuotationWithServices } from "./types";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationWithServices[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] =
    useState<QuotationWithServices | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const quotationsData = await getAllQuotations();
      setQuotations(quotationsData as QuotationWithServices[]);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuotation = (quotation: QuotationWithServices) => {
    setEditingQuotation(quotation);
    setIsEditOpen(true);
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;

    try {
      await deleteQuotationById(quotationId);
      await fetchData();
    } catch (error) {
      console.error("Error deleting quotation:", error);
    }
  };

  const handleCreateProject = async (quotation: QuotationWithServices) => {
    if (quotation.status !== "accepted" && quotation.status !== "paid") {
      alert("Only accepted or paid quotations can be converted to projects.");
      return;
    }

    try {
      await createProject({
        name: `Project: ${quotation.name}`,
        description: quotation.description,
        quotationId: quotation.id,
      });

      alert("Project created successfully!");
    } catch (error) {
      console.error("Error creating project:", error);
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
              Create and manage client quotations
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
              onCreateProject={handleCreateProject}
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

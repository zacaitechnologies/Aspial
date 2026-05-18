"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useSession } from "../../contexts/SessionProvider";
import ClientSelection from "../../quotations/components/ClientSelection";
import QuotationPicker from "./QuotationPicker";
import { createProject } from "../action";

interface CreateProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface NewClientData {
  name: string;
  email: string;
  ic?: string;
  phone?: string;
  company?: string;
  companyRegistrationNumber?: string;
  address?: string;
  notes?: string;
  industry?: string;
  yearlyRevenue?: string;
  membershipType?: string;
}

const DEFAULT_NEW_CLIENT: NewClientData = {
  name: "",
  email: "",
  ic: "",
  phone: "",
  company: "",
  companyRegistrationNumber: "",
  address: "",
  notes: "",
  industry: "",
  yearlyRevenue: "",
  membershipType: "NON_MEMBER",
};

export default function CreateProjectDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const { enhancedUser } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedClientName, setSelectedClientName] = useState<string>("");
  const [newClientData, setNewClientData] = useState<NewClientData>(DEFAULT_NEW_CLIENT);

  const [selectedQuotationIds, setSelectedQuotationIds] = useState<number[]>([]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setPriority("medium");
    setClientMode("existing");
    setSelectedClientId(undefined);
    setSelectedClientName("");
    setNewClientData(DEFAULT_NEW_CLIENT);
    setSelectedQuotationIds([]);
  };

  const handleClose = (open: boolean) => {
    if (!open && !isSubmitting) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleQuotationChange = (
    ids: number[],
    primaryClient: { id: string; name: string } | null
  ) => {
    setSelectedQuotationIds(ids);

    // Auto-fill client from primary (first-selected) quotation when in existing mode
    if (primaryClient && clientMode === "existing") {
      if (selectedClientId !== primaryClient.id) {
        setSelectedClientId(primaryClient.id);
        setSelectedClientName(primaryClient.name);
      }
    }
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Project name is required.";

    if (clientMode === "existing") {
      if (!selectedClientId) return "Please select a client.";
    } else {
      if (!newClientData.name?.trim()) return "New client name is required.";
      if (!newClientData.email?.trim()) return "New client email is required.";
      if (!newClientData.ic?.trim()) return "New client IC is required.";
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return "End date must be after start date.";
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!enhancedUser?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a project.",
        variant: "destructive",
      });
      return;
    }

    const validationError = validate();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let clientId = selectedClientId;
      let clientName = selectedClientName;

      if (clientMode === "new") {
        const { createCustomerClient } = await import("../../clients/action");
        const created = await createCustomerClient({
          name: newClientData.name,
          email: newClientData.email,
          ic: newClientData.ic ?? "",
          phone: newClientData.phone,
          company: newClientData.company,
          companyRegistrationNumber: newClientData.companyRegistrationNumber,
          address: newClientData.address,
          notes: newClientData.notes,
          industry: newClientData.industry,
          yearlyRevenue: newClientData.yearlyRevenue
            ? parseFloat(newClientData.yearlyRevenue)
            : undefined,
          membershipType:
            (newClientData.membershipType as "MEMBER" | "NON_MEMBER") || "NON_MEMBER",
        });
        clientId = created.id;
        clientName = created.name;
      }

      if (!clientId) {
        throw new Error("Client could not be resolved.");
      }

      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        createdBy: enhancedUser.id,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        priority,
        clientId,
        clientName,
        quotationIds: selectedQuotationIds.length > 0 ? selectedQuotationIds : undefined,
      });

      toast({
        title: "Success",
        description: "Project created successfully.",
      });

      // Notify the projects list to refresh
      window.dispatchEvent(
        new CustomEvent("projectsCacheInvalidate", {
          detail: { timestamp: Date.now() },
        })
      );

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description:
          "Failed to create project: " +
          (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">
                Project Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter project description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="project-start-date">Start Date</Label>
                <Input
                  id="project-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-end-date">End Date</Label>
                <Input
                  id="project-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setPriority(value as "low" | "medium" | "high")
                  }
                >
                  <SelectTrigger id="project-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <ClientSelection
            selectedClientId={selectedClientId}
            newClientData={newClientData}
            mode={clientMode}
            onClientSelect={(clientId, clientName) => {
              setSelectedClientId(clientId);
              setSelectedClientName(clientName);
            }}
            onNewClientDataChange={(data) => setNewClientData(data)}
            onModeChange={(mode) => setClientMode(mode)}
          />

          <QuotationPicker
            selectedIds={selectedQuotationIds}
            onChange={handleQuotationChange}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Project"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, Mail } from "lucide-react";
import { getClientsForQuotationOptimized } from "../action";

interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
}

interface NewClientData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
}

interface ClientSelectionProps {
  selectedClientId?: string;
  newClientData?: NewClientData;
  onClientSelect: (clientId: string) => void;
  onNewClientDataChange: (data: NewClientData) => void;
  onModeChange: (mode: "existing" | "new") => void;
  mode: "existing" | "new";
}

export default function ClientSelection({
  selectedClientId,
  newClientData,
  onClientSelect,
  onNewClientDataChange,
  onModeChange,
  mode,
}: ClientSelectionProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const clientsData = await getClientsForQuotationOptimized();
      setClients(clientsData);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Use useMemo to optimize filtering - only recalculates when clients or searchQuery changes
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }
    
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.company?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const handleNewClientDataChange = (
    field: keyof NewClientData,
    value: string
  ) => {
    onNewClientDataChange({
      ...newClientData,
      [field]: value,
    } as NewClientData);
  };

  return (
    <div>
      <Label className="text-base font-semibold">Client Information</Label>

      <Tabs
        value={mode}
        onValueChange={(value) => onModeChange(value as "existing" | "new")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing">Select Existing Client</TabsTrigger>
          <TabsTrigger value="new">Create New Client</TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="space-y-4">
          <div className="border rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <Input
                  id="client-search"
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading clients...</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? "No clients found matching your search."
                          : "No clients available."}
                      </p>
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedClientId === client.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => onClientSelect(client.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{client.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {client.email}
                              </span>
                              {client.company && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {client.company}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedClientId === client.id && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <div className="border rounded-lg p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-client-name">Full Name *</Label>
                  <Input
                    id="new-client-name"
                    value={newClientData?.name || ""}
                    onChange={(e) =>
                      handleNewClientDataChange("name", e.target.value)
                    }
                    placeholder="Enter client's full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-client-email">Email *</Label>
                  <Input
                    id="new-client-email"
                    type="email"
                    value={newClientData?.email || ""}
                    onChange={(e) =>
                      handleNewClientDataChange("email", e.target.value)
                    }
                    placeholder="Enter client's email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-client-phone">Phone</Label>
                  <Input
                    id="new-client-phone"
                    value={newClientData?.phone || ""}
                    onChange={(e) =>
                      handleNewClientDataChange("phone", e.target.value)
                    }
                    placeholder="Enter client's phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-client-company">Company</Label>
                  <Input
                    id="new-client-company"
                    value={newClientData?.company || ""}
                    onChange={(e) =>
                      handleNewClientDataChange("company", e.target.value)
                    }
                    placeholder="Enter company name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-client-address">Address</Label>
                <Textarea
                  className="text-black"
                  id="new-client-address"
                  value={newClientData?.address || ""}
                  onChange={(e) =>
                    handleNewClientDataChange("address", e.target.value)
                  }
                  placeholder="Enter client's address"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-client-notes">Notes</Label>
                                  <Textarea
                    id="new-client-notes"
                    className="text-black"
                    value={newClientData?.notes || ""}
                    onChange={(e) =>
                      handleNewClientDataChange("notes", e.target.value)
                    }
                    placeholder="Additional notes about the client"
                    rows={2}
                  />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

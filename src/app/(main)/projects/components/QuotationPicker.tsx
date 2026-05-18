"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Building2, FileText } from "lucide-react";
import { getUnlinkedQuotations } from "../action";
import type { UnlinkedQuotation } from "../types";

interface QuotationPickerProps {
  selectedIds: number[];
  onChange: (
    ids: number[],
    primaryClient: { id: string; name: string } | null,
    hasMismatch: boolean
  ) => void;
}

export default function QuotationPicker({ selectedIds, onChange }: QuotationPickerProps) {
  const [quotations, setQuotations] = useState<UnlinkedQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUnlinkedQuotations();
      setQuotations(data);
    } catch (error) {
      console.error("Failed to fetch unlinked quotations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const filteredQuotations = useMemo(() => {
    if (!searchQuery.trim()) return quotations;
    const query = searchQuery.toLowerCase();
    return quotations.filter(
      (q) =>
        q.name.toLowerCase().includes(query) ||
        q.description.toLowerCase().includes(query) ||
        q.clientName.toLowerCase().includes(query)
    );
  }, [quotations, searchQuery]);

  const selectedQuotations = useMemo(
    () => quotations.filter((q) => selectedIds.includes(q.id)),
    [quotations, selectedIds]
  );

  const primaryClient = useMemo(() => {
    if (selectedQuotations.length === 0) return null;
    const first = selectedQuotations[0];
    return { id: first.clientId, name: first.clientName };
  }, [selectedQuotations]);

  const hasClientMismatch = useMemo(() => {
    if (selectedQuotations.length < 2) return false;
    const firstClientId = selectedQuotations[0].clientId;
    return selectedQuotations.some((q) => q.clientId !== firstClientId);
  }, [selectedQuotations]);

  const emitChange = useCallback(
    (nextIds: number[]) => {
      const nextSelected = quotations.filter((q) => nextIds.includes(q.id));
      const nextPrimary =
        nextSelected.length > 0
          ? { id: nextSelected[0].clientId, name: nextSelected[0].clientName }
          : null;
      const nextMismatch =
        nextSelected.length >= 2 &&
        nextSelected.some((q) => q.clientId !== nextSelected[0].clientId);
      onChange(nextIds, nextPrimary, nextMismatch);
    },
    [onChange, quotations]
  );

  const toggleQuotation = (id: number) => {
    if (selectedIds.includes(id)) {
      emitChange(selectedIds.filter((existing) => existing !== id));
    } else {
      emitChange([...selectedIds, id]);
    }
  };

  return (
    <div>
      <Label className="text-base font-semibold">
        Linked Quotations <span className="text-sm font-normal text-muted-foreground">(optional)</span>
      </Label>

      <div className="border rounded-lg p-6 mt-2 space-y-4">
        <Input
          placeholder="Search by quotation name, description, or client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {hasClientMismatch && primaryClient && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              Selected quotations belong to different clients. The project will use{" "}
              <span className="font-semibold">{primaryClient.name}</span> as the client.
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading quotations...</p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredQuotations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No quotations match your search."
                    : "No unlinked quotations available."}
                </p>
              </div>
            ) : (
              filteredQuotations.map((q) => {
                const checked = selectedIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleQuotation(q.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleQuotation(q.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{q.name}</p>
                          <span className="text-sm font-medium shrink-0">
                            RM {q.totalPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {q.clientName || "(no client)"}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {q.workflowStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

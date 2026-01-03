"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useCallback, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Building2,
  Package,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Send,
  History,
  Loader2,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { workflowStatusOptions, paymentStatusOptions } from "../types";
import { generateQuotationPDF } from "../utils/pdfExport";
import { useQuotationCache } from "../hooks/useQuotationCache";
import SendQuotationDialog from "../components/SendQuotationDialog";
import EmailHistoryDialog from "../components/EmailHistoryDialog";
import LoadingProgress from "../components/LoadingProgress";
import CreateInvoiceForm from "../../invoices/components/CreateInvoiceForm";
import { getInvoicesForQuotation } from "../action";

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { quotation, isLoading, onRefresh } = useQuotationCache(params.id as string, { fetchFullData: true });
  const [mounted, setMounted] = useState(false);
  const [isSendQuotationDialogOpen, setIsSendQuotationDialogOpen] = useState(false);
  const [isEmailHistoryDialogOpen, setIsEmailHistoryDialogOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isCreateInvoiceDialogOpen, setIsCreateInvoiceDialogOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load invoices for this quotation
  useEffect(() => {
    if (quotation?.id) {
      setIsLoadingInvoices(true);
      getInvoicesForQuotation(quotation.id)
        .then((data) => {
          setInvoices(data);
        })
        .catch((error) => {
          console.error("Error loading invoices:", error);
        })
        .finally(() => {
          setIsLoadingInvoices(false);
        });
    }
  }, [quotation?.id]);

  // Memoize badge functions to avoid recreating on every render
  const getWorkflowStatusBadge = useCallback((status: string) => {
    const statusConfig = workflowStatusOptions.find((opt) => opt.value === status);
    return (
      <Badge variant={statusConfig?.color || "secondary"} className={statusConfig?.className}>
        {statusConfig?.label || status}
      </Badge>
    );
  }, []);

  const getPaymentStatusBadge = useCallback((status: string) => {
    const statusConfig = paymentStatusOptions.find((opt) => opt.value === status);
    return (
      <Badge variant={statusConfig?.color || "secondary"} className={statusConfig?.className}>
        {statusConfig?.label || status}
      </Badge>
    );
  }, []);

  const getCustomServiceStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-600 text-white hover:bg-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Memoize calculations to avoid recalculating on every render
  const approvedCustomServicesTotal = useMemo(() => {
    if (!quotation?.customServices) return 0;
    return quotation.customServices
      .filter((cs: any) => cs.status === "APPROVED")
      .reduce((sum: number, cs: any) => sum + cs.price, 0);
  }, [quotation?.customServices]);

  const grandTotal = useMemo(() => {
    const fixedServicesTotal = quotation?.totalPrice || 0;
    return fixedServicesTotal + approvedCustomServicesTotal;
  }, [quotation?.totalPrice, approvedCustomServicesTotal]);

  // Prevent hydration mismatch by only showing loading after mount
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/quotations")}
            className="mb-4"
            disabled
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotations
          </Button>
        </div>
        <LoadingProgress message="Loading quotation details..." size="lg" className="h-64" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Quotation not found</p>
            <Button onClick={() => router.push("/quotations")} className="mt-4">
              Back to Quotations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/quotations")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quotations
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{quotation.name}</h1>
            <p className="text-muted-foreground mt-2">{quotation.description}</p>
          </div>
          <div className="flex gap-2">
            {quotation.workflowStatus === "final" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsSendQuotationDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEmailHistoryDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <History className="w-4 h-4" />
                  Email History
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateInvoiceDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Create Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setIsExportingPDF(true);
                    try {
                      await generateQuotationPDF(quotation);
                      toast({
                        title: "Success",
                        description: "PDF exported successfully.",
                      });
                    } catch (error) {
                      console.error("Error exporting PDF:", error);
                      toast({
                        title: "Error",
                        description: "Failed to export PDF. Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsExportingPDF(false);
                    }
                  }}
                  className="flex items-center gap-2"
                  disabled={isExportingPDF}
                >
                  {isExportingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export PDF
                    </>
                  )}
                </Button>
              </>
            )}
            {getWorkflowStatusBadge(quotation.workflowStatus)}
            {getPaymentStatusBadge(quotation.paymentStatus)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information */}
          {quotation.Client && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="font-medium">{quotation.Client.name}</p>
                  </div>
                  {quotation.Client.company && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p className="font-medium flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {quotation.Client.company}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {quotation.Client.email}
                    </p>
                  </div>
                  {quotation.Client.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="font-medium">{quotation.Client.phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fixed Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Fixed Services
              </CardTitle>
              <CardDescription>
                Standard services included in this quotation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quotation.services.map((qs: any) => (
                  <div
                    key={qs.id}
                    className="flex justify-between items-start p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{qs.service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {qs.service.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      RM{qs.service.basePrice.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Services */}
          {quotation.customServices && quotation.customServices.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Custom Services
                </CardTitle>
                <CardDescription>
                  Custom services requested for this quotation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quotation.customServices.map((cs: any) => (
                    <div
                      key={cs.id}
                      className={`p-4 border-2 rounded-lg ${
                        cs.status === "APPROVED"
                          ? "border-green-200 bg-green-50"
                          : cs.status === "REJECTED"
                          ? "border-red-200 bg-red-50"
                          : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{cs.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {cs.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Requested by: {cs.createdBy.firstName}{" "}
                            {cs.createdBy.lastName} ({cs.createdBy.email})
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <div className="text-right">
                            <Badge variant="outline" className="text-base">
                              RM{cs.price.toFixed(2)}
                            </Badge>
                          </div>
                          {getCustomServiceStatusBadge(cs.status)}
                        </div>
                      </div>

                      <Separator className="my-3" />

                      {/* Approval Comment */}
                      {cs.approvalComment && (
                        <div className="mt-3 p-3 bg-white rounded border border-green-200">
                          <p className="text-xs font-semibold text-green-800 mb-1">
                            Approval Comment:
                          </p>
                          <p className="text-sm">{cs.approvalComment}</p>
                          {cs.reviewedBy && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Approved by: {cs.reviewedBy.firstName}{" "}
                              {cs.reviewedBy.lastName}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {cs.rejectionComment && (
                        <div className="mt-3 p-3 bg-red-50 rounded border border-red-300">
                          <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Rejection Reason:
                          </p>
                          <p className="text-sm text-red-900">{cs.rejectionComment}</p>
                          {cs.reviewedBy && (
                            <p className="text-xs text-red-700 mt-2">
                              Rejected by: {cs.reviewedBy.firstName}{" "}
                              {cs.reviewedBy.lastName}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoices List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoices
              </CardTitle>
              <CardDescription>
                All invoices created from this quotation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No invoices created yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{invoice.invoiceNumber}</p>
                          <Badge variant="outline" className="text-xs">
                            {invoice.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(invoice.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">RM{invoice.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fixed Services:</span>
                <span className="font-semibold">
                  RM{quotation.totalPrice.toFixed(2)}
                </span>
              </div>

              {approvedCustomServicesTotal > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-green-600">
                    <span className="font-semibold">
                      Custom Services Total:
                    </span>
                    <span className="font-bold">
                      RM{approvedCustomServicesTotal.toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    Grand Total:
                  </p>
                  <p className="text-xs text-blue-600">
                    {quotation.totalPrice.toFixed(2)} + {approvedCustomServicesTotal.toFixed(2)}
                  </p>
                </div>
                <span className="text-2xl font-bold text-blue-800">
                  RM{grandTotal.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quotation.startDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {new Date(quotation.startDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {quotation.endDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {new Date(quotation.endDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {quotation.duration && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duration</p>
                  <p className="font-medium">{quotation.duration} months</p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="font-medium">
                  {new Date(quotation.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created By</p>
                <p className="font-medium">
                  {quotation.createdBy.firstName} {quotation.createdBy.lastName}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Project Link */}
          {quotation.project && quotation.project.status !== "cancelled" && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-sm">Linked Project</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{quotation.project.name}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => router.push(`/projects/${quotation.project.id}`)}
                >
                  View Project
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Cancelled Project Warning */}
          {quotation.project && quotation.project.status === "cancelled" && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-4 h-4" />
                  Project Cancelled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-red-800">{quotation.project.name}</p>
                <p className="text-sm text-red-600 mt-2">
                  The project linked to this quotation has been cancelled.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => router.push(`/projects/${quotation.project.id}`)}
                >
                  View Project Details
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Send Quotation Dialog */}
      {quotation.workflowStatus === "final" && (
        <SendQuotationDialog
          isOpen={isSendQuotationDialogOpen}
          onOpenChange={setIsSendQuotationDialogOpen}
          quotationId={quotation.id}
          clientEmail={quotation.Client?.email || ""}
          onSuccess={() => {
            if (onRefresh) {
              onRefresh();
            }
          }}
        />
      )}

      {/* Email History Dialog */}
      {quotation.workflowStatus === "final" && (
        <EmailHistoryDialog
          isOpen={isEmailHistoryDialogOpen}
          onOpenChange={setIsEmailHistoryDialogOpen}
          quotationId={quotation.id}
        />
      )}

      {/* Create Invoice Dialog */}
      {quotation.workflowStatus === "final" && (
        <CreateInvoiceForm
          isOpen={isCreateInvoiceDialogOpen}
          onOpenChange={setIsCreateInvoiceDialogOpen}
          prefilledQuotationId={quotation.id}
          onSuccess={() => {
            if (onRefresh) {
              onRefresh();
            }
            // Refresh invoices list
            if (quotation?.id) {
              getInvoicesForQuotation(quotation.id)
                .then((data) => {
                  setInvoices(data);
                })
                .catch((error) => {
                  console.error("Error loading invoices:", error);
                });
            }
          }}
        />
      )}
    </div>
  );
}


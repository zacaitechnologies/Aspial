"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Bell, Check, X, Package } from "lucide-react";
import {
  getAllPendingCustomServices,
  getAllCustomServices,
  approveCustomService,
  rejectCustomService,
} from "../../quotations/action";

type CustomServiceRequest = {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  createdAt: Date;
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  approvedBy: {
    firstName: string;
    lastName: string;
  } | null;
  quotation: {
    id: number;
    name: string;
    Client: {
      name: string;
      company: string | null;
    } | null;
  };
  approvalComment: string | null;
  rejectionComment: string | null;
};

interface CustomServiceNotificationsProps {
  userId: string;
}

export default function CustomServiceNotifications({
  userId,
}: CustomServiceNotificationsProps) {
  const [pendingServices, setPendingServices] = useState<CustomServiceRequest[]>([]);
  const [allServices, setAllServices] = useState<CustomServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<CustomServiceRequest | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");
  const [approvalComment, setApprovalComment] = useState("");

  const fetchCustomServices = async () => {
    try {
      setLoading(true);
      const pending = await getAllPendingCustomServices();
      const all = await getAllCustomServices();
      setPendingServices(pending as CustomServiceRequest[]);
      setAllServices(all as CustomServiceRequest[]);
    } catch (error) {
      console.error("Failed to fetch custom services:", error);
      setPendingServices([]);
      setAllServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomServices();
  }, []);

  const handleApprove = (service: CustomServiceRequest) => {
    setSelectedService(service);
    setApprovalComment("");
    setIsApproveDialogOpen(true);
  };

  const handleReject = (service: CustomServiceRequest) => {
    setSelectedService(service);
    setRejectionComment("");
    setIsRejectDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedService) return;

    try {
      await approveCustomService(
        selectedService.id,
        userId,
        approvalComment || undefined
      );
      setIsApproveDialogOpen(false);
      setSelectedService(null);
      setApprovalComment("");
      fetchCustomServices();
      alert("Custom service approved successfully!");
    } catch (error) {
      console.error("Error approving custom service:", error);
      alert("Failed to approve custom service. Please try again.");
    }
  };

  const confirmReject = async () => {
    if (!selectedService || !rejectionComment.trim()) {
      alert("Rejection reason is required!");
      return;
    }

    try {
      await rejectCustomService(selectedService.id, userId, rejectionComment);
      setIsRejectDialogOpen(false);
      setSelectedService(null);
      setRejectionComment("");
      fetchCustomServices();
      alert("Custom service rejected.");
    } catch (error) {
      console.error("Error rejecting custom service:", error);
      alert("Failed to reject custom service. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="default"
            className="bg-yellow-500 text-white hover:bg-yellow-600"
          >
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="default"
            className="bg-green-600 text-white hover:bg-green-700"
          >
            Approved
          </Badge>
        );
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div>Loading custom service requests...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Pending Custom Services</h2>
          <Badge variant="secondary">{pendingServices.length}</Badge>
        </div>

        {pendingServices.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No pending custom service requests.
              </p>
            </CardContent>
          </Card>
        ) : (
          pendingServices.map((service) => (
            <Card key={service.id} className="p-4">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription>
                      Requested by {service.createdBy.firstName}{" "}
                      {service.createdBy.lastName}
                    </CardDescription>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Service Details</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>Service:</strong> {service.name}
                      </p>
                      <p>
                        <strong>Description:</strong> {service.description}
                      </p>
                      <p>
                        <strong>Price:</strong> RM{service.price.toFixed(2)}
                      </p>
                      <p>
                        <strong>Quotation:</strong> {service.quotation.name}
                      </p>
                      <p>
                        <strong>Client:</strong>{" "}
                        {service.quotation.Client?.company ||
                          service.quotation.Client?.name ||
                          "N/A"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Request Info</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>Requested by:</strong>{" "}
                        {service.createdBy.firstName}{" "}
                        {service.createdBy.lastName}
                      </p>
                      <p>
                        <strong>Email:</strong> {service.createdBy.email}
                      </p>
                      <p>
                        <strong>Requested:</strong>{" "}
                        {new Date(service.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {service.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(service)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(service)}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Custom Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve "{selectedService?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-comment">
                Comment (Optional)
              </Label>
              <Textarea
                id="approval-comment"
                placeholder="Add any comments or notes..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Custom Service</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedService?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-comment">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-comment"
                placeholder="Please provide a clear reason for rejection..."
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectionComment.trim()}
            >
              Reject Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


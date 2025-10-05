"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, User } from "lucide-react";

interface MembershipStatusDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientCompany?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function MembershipStatusDialog({
  isOpen,
  onOpenChange,
  clientName,
  clientCompany,
  onConfirm,
  onCancel,
}: MembershipStatusDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating membership status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            Upgrade to Member Status
          </DialogTitle>
          <DialogDescription className="text-left">
            A project has been created for{" "}
            <span className="font-semibold">{clientName}</span>
            {clientCompany && (
              <span className="text-muted-foreground"> ({clientCompany})</span>
            )}
            . Would you like to upgrade this client to Member status?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <User className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Current Status</p>
              <Badge variant="secondary" className="mt-1">
                Non-Member
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Crown className="w-4 h-4 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">Upgrade to</p>
              <Badge variant="default" className="mt-1 bg-yellow-600 hover:bg-yellow-700">
                Member
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Keep as Non-Member
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isLoading ? "Upgrading..." : "Upgrade to Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

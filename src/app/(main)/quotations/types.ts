import type { Services } from "@prisma/client";

export type QuotationWithServices = {
  id: number;
  name: string;
  description: string;
  totalPrice: number;
  status: string;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  created_at: Date;
  updated_at: Date;
  services: {
    id: number;
    service: Services;
  }[];
  projects: {
    id: number;
    name: string;
    description?: string;
    status: string;
    startDate?: Date;
    endDate?: Date;
    created_at: Date;
    updated_at: Date;
  }[];
};

export type QuotationFormData = {
  name: string;
  description: string;
  discountValue: string;
  discountType: "percentage" | "fixed";
};

export type EditFormData = {
  name: string;
  description: string;
  totalPrice: string;
  status: string;
  discountValue: string;
  discountType: "percentage" | "fixed";
};

export const statusOptions = [
  { value: "draft", label: "Draft", color: "secondary" as const },
  { value: "sent", label: "Sent", color: "default" as const },
  { value: "accepted", label: "Accepted", color: "default" as const },
  { value: "rejected", label: "Rejected", color: "destructive" as const },
  { value: "paid", label: "Paid", color: "default" as const },
  { value: "unpaid", label: "Unpaid", color: "destructive" as const },
  {
    value: "partially_paid",
    label: "Partially Paid",
    color: "secondary" as const,
  },
  { value: "deposit_paid", label: "Deposit Paid", color: "secondary" as const },
] as const; 
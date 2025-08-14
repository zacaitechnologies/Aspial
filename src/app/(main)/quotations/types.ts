import type { Services } from "@prisma/client";

export type QuotationWithServices = {
  id: number;
  name: string;
  description: string;
  totalPrice: number;
  status: string;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  duration?: number;
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
  Client?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    notes?: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
    created_at: Date;
    updated_at: Date;
  };
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
  duration: string;
  startDate: string;
  clientId?: string;
  newClient?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    notes?: string;
  };
};

export type EditFormData = {
  name: string;
  description: string;
  totalPrice: string;
  status: string;
  discountValue: string;
  discountType: "percentage" | "fixed";
  duration: string;
  startDate: string;
  clientId?: string;
  newClient?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    notes?: string;
  };
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
import type { Services } from "@prisma/client";

export type QuotationWithServices = {
  id: number;
  name: string;
  description: string;
  totalPrice: number;
  workflowStatus: string;
  paymentStatus: string;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  duration?: number;
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
  // Computed property for grand total
  grandTotal?: number;
  Client?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    notes?: string;
    industry?: string;
    yearlyRevenue?: number;
    membershipType?: string;
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
    quotationId: number;
    serviceId: number | null; // null when row links a custom service (customServiceId set)
    customServiceId?: string;
    service: Services | null; // null when customServiceId is set
    customService?: {
      id: string;
      quotationId: number;
      name: string;
      description?: string;
      price: number;
      status: string;
      createdById?: string;
      created_at: Date;
      updated_at: Date;
    };
  }[];
  customServices?: {
    id: string;
    quotationId: number;
    name: string;
    description?: string;
    price: number;
    status: string;
    createdById?: string;
    created_at: Date;
    updated_at: Date;
  }[];
  project: {
    id: number;
    name: string;
    description?: string;
    status: string;
    startDate?: Date;
    endDate?: Date;
    created_at: Date;
    updated_at: Date;
  } | null;
};

export type QuotationFormData = {
  description: string;
  discountValue: string;
  discountType: "percentage" | "fixed";
  duration: string;
  startDate: string;
  clientId?: string;
  selectedClientName?: string;
  projectId?: number;
  newClient?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    companyRegistrationNumber?: string;
    address?: string;
    notes?: string;
    industry?: string;
    yearlyRevenue?: string;
    membershipType?: string;
  };
  newProject?: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    priority: "low" | "medium" | "high";
  };
};

export type EditFormData = {
  name: string; // Keep for display purposes (read-only)
  description: string;
  totalPrice: string;
  workflowStatus: "draft" | "in_review" | "final" | "accepted" | "rejected" | "cancelled";
  paymentStatus: "unpaid" | "partially_paid" | "deposit_paid" | "fully_paid";
  discountValue: string;
  discountType: "percentage" | "fixed";
  duration: string;
  startDate: string;
  clientId?: string;
  projectId?: number;
  newClient?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    companyRegistrationNumber?: string;
    address?: string;
    notes?: string;
    industry?: string;
    yearlyRevenue?: string;
    membershipType?: string;
  };
  newProject?: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    priority: "low" | "medium" | "high";
  };
};

export const workflowStatusOptions = [
  { value: "draft", label: "Draft", color: "secondary" as const },
  { value: "in_review", label: "In Review", color: "default" as const },
  { value: "final", label: "Final", color: "default" as const },
  { value: "accepted", label: "Accepted", color: "default" as const },
  { value: "rejected", label: "Rejected", color: "destructive" as const },
  { value: "cancelled", label: "Cancelled", color: "destructive" as const },
] as const;

export const paymentStatusOptions = [
  { value: "unpaid", label: "Unpaid", color: "destructive" as const },
  { value: "partially_paid", label: "Partially Paid", color: "secondary" as const },
  { value: "deposit_paid", label: "Deposit Paid", color: "default" as const },
  { value: "fully_paid", label: "Fully Paid", color: "default" as const },
] as const;

// Limited payment status options for non-admin users editing finalized quotations
export const limitedPaymentStatusOptions = [
  { value: "unpaid", label: "Unpaid", color: "destructive" as const },
  { value: "partially_paid", label: "Partially Paid", color: "secondary" as const },
  { value: "fully_paid", label: "Fully Paid", color: "default" as const },
] as const;

// Backwards compatibility - use workflow status
export const statusOptions = workflowStatusOptions; 
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
    service: Services;
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
  name: string;
  description: string;
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
  name: string;
  description: string;
  totalPrice: string;
  workflowStatus: "draft" | "in_review" | "final" | "accepted" | "rejected";
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
  { value: "draft", label: "Draft", color: "default" as const, className: "bg-gray-200 text-gray-800" },
  { value: "in_review", label: "In Review", color: "default" as const, className: "bg-blue-500 text-white" },
  { value: "final", label: "Final", color: "default" as const, className: "bg-purple-600 text-white" },
  { value: "accepted", label: "Accepted", color: "default" as const, className: "bg-green-600 text-white hover:bg-green-700" },
  { value: "rejected", label: "Rejected", color: "destructive" as const, className: "" },
] as const;

export const paymentStatusOptions = [
  { value: "unpaid", label: "Unpaid", color: "destructive" as const, className: "" },
  { value: "partially_paid", label: "Partially Paid", color: "secondary" as const, className: "bg-yellow-500 text-white" },
  { value: "deposit_paid", label: "Deposit Paid", color: "default" as const, className: "bg-orange-500 text-white" },
  { value: "fully_paid", label: "Fully Paid", color: "default" as const, className: "bg-green-600 text-white" },
] as const;

// Backwards compatibility - use workflow status
export const statusOptions = workflowStatusOptions; 
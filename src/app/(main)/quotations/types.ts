import type { Services } from "@prisma/client";

export type QuotationWithServices = {
  id: number;
  name: string;
  description: string;
  totalPrice: number;
  status: string;
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
  status: string;
  paymentStatus: string;
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

export const statusOptions = [
  { value: "draft", label: "Draft", color: "default" as const, className: "bg-gray-100 text-gray-800" },
  { value: "in_review", label: "In Review", color: "default" as const, className: "bg-blue-100 text-blue-800" },
  { value: "accepted", label: "Accepted", color: "default" as const, className: "bg-green-600 text-white hover:bg-green-700" },
  { value: "rejected", label: "Rejected", color: "destructive" as const, className: "bg-red-600 text-white" },
] as const;

export const paymentStatusOptions = [
  { value: "unpaid", label: "Unpaid", color: "destructive" as const, className: "bg-red-100 text-red-800" },
  { value: "partially_paid", label: "Partially Paid", color: "secondary" as const, className: "bg-yellow-100 text-yellow-800" },
  { value: "deposit_paid", label: "Deposit Paid", color: "secondary" as const, className: "bg-orange-100 text-orange-800" },
  { value: "fully_paid", label: "Fully Paid", color: "default" as const, className: "bg-green-100 text-green-800" },
] as const; 
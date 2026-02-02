import { z } from "zod";

const requiredString = z.string().trim().min(1, "Required");

export const signUpSchema = z.object({
  email: requiredString.email("Invalid email address"),
  firstName: requiredString,
  lastName: requiredString,
  password: requiredString
    .min(8, "Must be at least 8 characters.")
    .regex(/(?=.*[A-Z])/, "Must contain at least one uppercase letter")
    .regex(/(?=.*[a-z])/, "Must contain at least one lowercase letter")
    .regex(/(?=.*\d)/, "Must contain at least one number")
    .regex(/(?=.*[!@#$%^&*_-])/, "Must contain at least one special character"),
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: requiredString.email("Invalid email address"),
  password: requiredString,
});

export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: requiredString.email("Invalid email address"),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: requiredString
    .min(8, "Must be at least 8 characters.")
    .regex(/(?=.*[A-Z])/, "Must contain at least one uppercase letter")
    .regex(/(?=.*[a-z])/, "Must contain at least one lowercase letter")
    .regex(/(?=.*\d)/, "Must contain at least one number")
    .regex(/(?=.*[!@#$%^&*_-])/, "Must contain at least one special character"),
  confirmPassword: requiredString,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

// Client validation schemas
export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  ic: z.string().trim().min(1, "IC is required"),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  companyRegistrationNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  yearlyRevenue: z.number().positive().optional(),
  membershipType: z.enum(["MEMBER", "NON_MEMBER"]),
});

export type CreateClientValues = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().trim().email("Invalid email address").optional(),
  ic: z.string().trim().min(1, "IC is required").optional(),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  companyRegistrationNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  yearlyRevenue: z.number().positive().optional(),
  membershipType: z.enum(["MEMBER", "NON_MEMBER"]).optional(),
});

export type UpdateClientValues = z.infer<typeof updateClientSchema>;

export const clientFiltersSchema = z.object({
  searchTerm: z.string().optional(),
  industry: z.string().optional(),
  membershipType: z.enum(["all", "MEMBER", "NON_MEMBER"]).optional(),
  sortBy: z.enum(["name", "yearlyRevenue", "totalValue", "created_at"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
});

export type ClientFilters = z.infer<typeof clientFiltersSchema>;

export const salesDataFiltersSchema = z.object({
  year: z.number().int().positive().optional(),
  month: z.number().int().min(0).max(11).optional(),
  advisorId: z.string().optional(),
  viewMode: z.enum(["monthly", "yearly"]).optional(),
});

export type SalesDataFilters = z.infer<typeof salesDataFiltersSchema>;

// Time entry validation schemas
export const createTimeEntrySchema = z.object({
  projectId: z.number().int().positive("Project ID must be a positive integer"),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().int().min(0, "Duration must be non-negative"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
});

export type CreateTimeEntryValues = z.infer<typeof createTimeEntrySchema>;

export const updateTimeEntrySchema = z.object({
  endTime: z.date().optional(),
  duration: z.number().int().min(0, "Duration must be non-negative"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
});

export type UpdateTimeEntryValues = z.infer<typeof updateTimeEntrySchema>;

export const pauseTimeEntrySchema = z.object({
  id: z.number().int().positive("Time entry ID must be a positive integer"),
  duration: z.number().int().min(0, "Duration must be non-negative"),
});

export type PauseTimeEntryValues = z.infer<typeof pauseTimeEntrySchema>;

export const resumeTimeEntrySchema = z.object({
  id: z.number().int().positive("Time entry ID must be a positive integer"),
});

export type ResumeTimeEntryValues = z.infer<typeof resumeTimeEntrySchema>;

export const stopTimeEntrySchema = z.object({
  id: z.number().int().positive("Time entry ID must be a positive integer"),
  duration: z.number().int().min(0, "Duration must be non-negative"),
});

export type StopTimeEntryValues = z.infer<typeof stopTimeEntrySchema>;

// Quotation validation schemas
export const quotationFiltersSchema = z.object({
  statusFilter: z.enum(["all", "draft", "in_review", "final", "accepted", "rejected", "cancelled"]).optional(),
});

export type QuotationFilters = z.infer<typeof quotationFiltersSchema>;

export const quotationPaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  filters: quotationFiltersSchema.optional(),
});

export type QuotationPagination = z.infer<typeof quotationPaginationSchema>;

export const workflowStatusSchema = z.enum(["draft", "in_review", "final", "accepted", "rejected", "cancelled"]);

export const paymentStatusSchema = z.enum(["unpaid", "partially_paid", "deposit_paid", "fully_paid"]);

export const discountTypeSchema = z.enum(["percentage", "fixed"]);

export const newClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  ic: z.string().trim().min(1, "IC is required"),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  companyRegistrationNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  yearlyRevenue: z.string().trim().optional(),
  membershipType: z.enum(["MEMBER", "NON_MEMBER"]).optional(),
});

export const createQuotationSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  totalPrice: z.number().positive("Total price must be positive"),
  serviceIds: z.array(z.string()).min(1, "At least one service is required"),
  createdById: z.string().min(1, "Creator ID is required"),
  workflowStatus: workflowStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  discountValue: z.number().nonnegative().optional(),
  discountType: discountTypeSchema.optional(),
  duration: z.number().int().nonnegative().optional(),
  startDate: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.number().int().positive().optional(),
  newClient: newClientSchema.optional(),
}).refine((data) => {
  // If no clientId, newClient must be provided
  if (!data.clientId && !data.newClient) {
    return false;
  }
  return true;
}, {
  message: "Either clientId or newClient must be provided",
  path: ["clientId"],
});

export type CreateQuotationValues = z.infer<typeof createQuotationSchema>;

export const editQuotationSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  totalPrice: z.number().positive("Total price must be positive"),
  workflowStatus: workflowStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  discountValue: z.number().nonnegative().optional(),
  discountType: discountTypeSchema.optional(),
  serviceIds: z.array(z.string()).optional(),
  duration: z.number().int().nonnegative().optional(),
  startDate: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.number().int().positive().optional().nullable(),
  createdById: z.string().optional(),
  newClient: newClientSchema.optional(),
});

export type EditQuotationValues = z.infer<typeof editQuotationSchema>;

// Invoice validation schemas
export const invoiceTypeSchema = z.enum(["SO", "EPO", "EO"]);

export const invoiceStatusSchema = z.enum(["active", "cancelled"]);

export const createInvoiceSchema = z.object({
	quotationId: z.number().int().positive("Quotation ID must be a positive integer"),
	type: invoiceTypeSchema,
	amount: z.number().positive("Invoice amount must be greater than 0"),
	createdById: z.string().optional(),
});

export type CreateInvoiceValues = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceAdminSchema = z.object({
	createdById: z.string().optional(),
	status: invoiceStatusSchema.optional(),
}).refine((data) => {
	// At least one field must be provided
	return data.createdById !== undefined || data.status !== undefined;
}, {
	message: "At least one field must be provided",
});

export type UpdateInvoiceAdminValues = z.infer<typeof updateInvoiceAdminSchema>;

export const sendInvoiceEmailSchema = z.object({
	invoiceId: z.string().min(1, "Invoice ID is required"),
	recipientEmail: z.string().trim().email("Invalid email address"),
});

export type SendInvoiceEmailValues = z.infer<typeof sendInvoiceEmailSchema>;

export const invoiceIdSchema = z.string().min(1, "Invoice ID is required");

export const searchQuotationsForInvoiceSchema = z.string().trim().min(1, "Search term is required");

export const quotationIdSchema = z.string().transform((val) => {
  const parsed = Number.parseInt(val, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new z.ZodError([{
      code: "custom",
      path: [],
      message: "Invalid quotation ID",
    }]);
  }
  return parsed;
});

export const customServiceStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const createCustomServiceSchema = z.object({
  quotationId: z.number().int().positive(),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().min(1, "Description is required"),
  price: z.number().positive("Price must be positive"),
});

export type CreateCustomServiceValues = z.infer<typeof createCustomServiceSchema>;

export const updateCustomServiceStatusSchema = z.object({
  customServiceId: z.string().min(1, "Custom service ID is required"),
  status: customServiceStatusSchema,
  comment: z.string().trim().optional(),
});

export type UpdateCustomServiceStatusValues = z.infer<typeof updateCustomServiceStatusSchema>;

export const sendQuotationEmailSchema = z.object({
  quotationId: z.number().int().positive(),
  recipientEmail: z.string().email("Invalid email address"),
});

export type SendQuotationEmailValues = z.infer<typeof sendQuotationEmailSchema>;

export const updateClientMembershipSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  membershipType: z.enum(["MEMBER", "NON_MEMBER"]),
});

export type UpdateClientMembershipValues = z.infer<typeof updateClientMembershipSchema>;
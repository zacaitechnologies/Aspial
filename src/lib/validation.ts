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
  /** Omitted when creating a client inline (e.g. project flow); server assigns the current user. */
  advisorIds: z.array(z.string()).optional(),
});

const ZOD_FIELD_LABELS: Record<string, string> = {
  name: "Client name",
  email: "Email",
  ic: "IC / NRIC",
  phone: "Phone",
  company: "Company",
  companyRegistrationNumber: "Company registration number",
  address: "Address",
  notes: "Notes",
  industry: "Industry",
  yearlyRevenue: "Yearly revenue",
  membershipType: "Membership type",
  advisorIds: "Advisor",
};

/** Turns Zod issues into user-facing sentences (e.g. "Email is required."). */
export function formatZodErrorMessage(error: z.ZodError): string {
  const messages = error.errors.map((issue) => {
    const fieldKey = issue.path.length > 0 ? String(issue.path[issue.path.length - 1]) : "";
    const label =
      ZOD_FIELD_LABELS[fieldKey] ??
      (fieldKey
        ? fieldKey.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
        : "This field");

    if (issue.code === "invalid_type" && issue.received === "undefined") {
      return `${label} is required.`;
    }
    if (issue.message === "Required") {
      return `${label} is required.`;
    }
    if (issue.message === "Invalid email address") {
      return "Please enter a valid email address.";
    }
    if (fieldKey && !issue.message.toLowerCase().includes(label.toLowerCase())) {
      return `${label}: ${issue.message}`;
    }
    return issue.message;
  });

  return [...new Set(messages)].join(" ");
}

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
  advisorIds: z.array(z.string()).min(1, "At least one advisor is required").optional(),
});

export type UpdateClientValues = z.infer<typeof updateClientSchema>;

export const clientFiltersSchema = z.object({
  searchTerm: z.string().optional(),
  industry: z.string().optional(),
  membershipType: z.enum(["all", "MEMBER", "NON_MEMBER"]).optional(),
  sortBy: z.enum(["name", "yearlyRevenue", "totalValue", "created_at"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  createdByMeOnly: z.boolean().optional(),
});

export type ClientFilters = z.infer<typeof clientFiltersSchema>;

export const salesDataFiltersSchema = z.object({
  year: z.number().int().positive().optional(),
  month: z.number().int().min(0).max(11).optional(),
  advisorId: z.string().optional(),
  viewMode: z.enum(["monthly", "yearly"]).optional(),
  invoicePage: z.number().int().min(1).optional(),
  invoicePageSize: z.number().int().min(1).max(100).optional(),
  receiptPage: z.number().int().min(1).optional(),
  receiptPageSize: z.number().int().min(1).max(100).optional(),
});

export type SalesDataFilters = z.infer<typeof salesDataFiltersSchema>;

// Time entry validation schemas
export const createTimeEntrySchema = z.object({
  projectId: z.number().int().positive("Project ID must be a positive integer").optional(),
  taskId: z.number().int().positive("Task ID must be a positive integer").optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().int().min(0, "Duration must be non-negative"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
}).refine(
  (d) => d.projectId !== undefined || (d.description?.trim().length ?? 0) > 0,
  {
    message: "Select a project or fill in a description to start the timer.",
    path: ["projectId"],
  }
);

export type CreateTimeEntryValues = z.infer<typeof createTimeEntrySchema>;

export const updateTimeEntryDescriptionSchema = z.object({
  id: z.number().int().positive("Time entry ID must be a positive integer"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters"),
});

export type UpdateTimeEntryDescriptionValues = z.infer<typeof updateTimeEntryDescriptionSchema>;

export const timeEntriesFilterSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  userId: z.string().optional(),
  projectId: z.number().int().positive().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
});

export type TimeEntriesFilterValues = z.infer<typeof timeEntriesFilterSchema>;

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
  searchQuery: z.string().max(200).optional(),
  advisorFilter: z.string().optional(),
  /** YYYY-MM — filters by quotation document date (quotationDate) within that calendar month */
  monthYear: z.string().optional(),
});

export type QuotationFilters = z.infer<typeof quotationFiltersSchema>;

/** Paginated receipts list filters */
export const receiptListFiltersSchema = z.object({
  searchQuery: z.string().max(200).optional(),
  advisorFilter: z.string().optional(),
  /** YYYY-MM — filters by receipt document date (receiptDate) within that calendar month */
  monthYear: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export type ReceiptListFilters = z.infer<typeof receiptListFiltersSchema>;

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
  services: z.array(z.object({
    serviceId: z.string(),
    price: z.number().nonnegative("Price must be non-negative"),
    quantity: z.number().int().positive("Quantity must be at least 1"),
    descriptionOverride: z.string().max(2000).optional(),
  })).min(1, "At least one service is required"),
  createdById: z.string().min(1, "Creator ID is required"),
  // When provided, must contain at least one advisor. Omit the field entirely to fall back
  // to the default (creator auto-added server-side, e.g. inline client creation from quotations).
  advisorIds: z.array(z.string()).min(1, "At least one advisor is required").optional(),
  workflowStatus: workflowStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  discountValue: z.number().nonnegative().optional(),
  discountType: discountTypeSchema.optional(),
  duration: z.number().int().nonnegative().optional(),
  startDate: z.string().optional(),
  quotationDate: z.string().optional(), // Added for editable quotation date
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
  services: z.array(z.object({
    serviceId: z.string(),
    price: z.number().nonnegative("Price must be non-negative"),
    quantity: z.number().int().positive("Quantity must be at least 1"),
    descriptionOverride: z.string().max(2000).optional(),
  })).optional(),
  duration: z.number().int().nonnegative().optional(),
  startDate: z.string().optional(),
  quotationDate: z.string().optional(), // Added for editable quotation date
  clientId: z.string().optional(),
  projectId: z.number().int().positive().optional().nullable(),
  createdById: z.string().optional(),
  advisorIds: z.array(z.string()).min(1, "At least one advisor is required").optional(),
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
	advisorIds: z.array(z.string()).min(1, "At least one advisor is required").optional(),
	/** Photographer IDs — only applicable for EPO invoices. */
	photographerIds: z.array(z.string()).optional(),
	/** Invoice document date (`invoiceDate`), HTML date input `YYYY-MM-DD`. */
	invoiceDate: z.string().optional(),
});

export type CreateInvoiceValues = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceAdminSchema = z.object({
	advisorIds: z.array(z.string()).min(1, "At least one advisor is required").optional(),
	/** Photographer IDs — only applicable for EPO invoices. */
	photographerIds: z.array(z.string()).optional(),
	status: invoiceStatusSchema.optional(),
	/** Invoice document date (invoiceDate). Admin only. */
	invoiceDate: z.string().optional(),
}).refine((data) => {
	return data.advisorIds !== undefined || data.photographerIds !== undefined || data.status !== undefined || data.invoiceDate !== undefined;
}, {
	message: "At least one field must be provided",
});

export type UpdateInvoiceAdminValues = z.infer<typeof updateInvoiceAdminSchema>;

export const sendInvoiceEmailSchema = z.object({
	invoiceId: z.string().min(1, "Invoice ID is required"),
	recipientEmail: z.string().trim().email("Invalid email address"),
});

export type SendInvoiceEmailValues = z.infer<typeof sendInvoiceEmailSchema>;

/** Filters for paginated invoice list (`monthYear`: YYYY-MM, matches **invoiceDate** month). */
export const invoiceListFiltersSchema = z.object({
	typeFilter: z.string().optional(),
	searchQuery: z.string().optional(),
	advisorFilter: z.string().optional(),
	monthYear: z.string().optional(),
});

export type InvoiceListFilters = z.infer<typeof invoiceListFiltersSchema>;

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

// Leave dates are exchanged as YYYY-MM-DD strings; the server converts to MYT-anchored
// UTC instants via parseDateInBusinessTZ. Strings compare lexicographically thanks to the
// fixed YYYY-MM-DD format, so refinements like "endDate >= startDate" work directly.
const leaveDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (expected YYYY-MM-DD)");

// Leave-type codes are now stored as strings (FK to leave_type.code) so the schemas
// accept any non-empty string. Server actions verify the code exists in the DB.
const leaveTypeCode = z.string().trim().min(1, "Leave type is required").max(64);

// Leave Application validation schemas
export const applyLeaveSchema = z.object({
  leaveType: leaveTypeCode,
  startDate: leaveDateString,
  endDate: leaveDateString.optional(),
  halfDay: z.enum(["NONE", "FIRST_HALF", "SECOND_HALF"]).default("NONE"),
  reason: z.string().trim().min(1, "Reason is required").max(500, "Reason must be 500 characters or less"),
  attachmentUrl: z.string().url().optional(),
}).transform((data) => ({
  ...data,
  endDate: data.endDate ?? data.startDate,
})).refine(data => data.endDate >= data.startDate, {
  message: "End date must be on or after start date",
  path: ["endDate"],
}).refine(data => {
  if (data.halfDay !== "NONE") {
    return data.startDate === data.endDate;
  }
  return true;
}, {
  message: "Half day leave must be a single day",
  path: ["halfDay"],
});

export type ApplyLeaveValues = z.infer<typeof applyLeaveSchema>;

export const reviewLeaveSchema = z.object({
  leaveId: z.number().int().positive(),
  remarks: z.string().max(500).optional(),
});

export type ReviewLeaveValues = z.infer<typeof reviewLeaveSchema>;

export const adminEditLeaveSchema = z.object({
  leaveId: z.number().int().positive(),
  leaveType: leaveTypeCode.optional(),
  startDate: leaveDateString.optional(),
  endDate: leaveDateString.optional(),
  halfDay: z.enum(["NONE", "FIRST_HALF", "SECOND_HALF"]).optional(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export type AdminEditLeaveValues = z.infer<typeof adminEditLeaveSchema>;

export const leaveChangeRequestSchema = z.object({
  leaveApplicationId: z.number().int().positive(),
  type: z.enum(["CANCEL", "EDIT"]),
  reason: z.string().trim().min(1, "Reason is required").max(500),
  newStartDate: leaveDateString.optional(),
  newEndDate: leaveDateString.optional(),
  newLeaveType: leaveTypeCode.optional(),
  newHalfDay: z.enum(["NONE", "FIRST_HALF", "SECOND_HALF"]).optional(),
  newReason: z.string().max(500).optional(),
});

export type LeaveChangeRequestValues = z.infer<typeof leaveChangeRequestSchema>;

/** Employee cancels their own pending application (no admin / change request). */
export const cancelOwnPendingLeaveSchema = z.object({
  leaveApplicationId: z.number().int().positive(),
  reason: z.string().trim().max(500).optional(),
});

export type CancelOwnPendingLeaveValues = z.infer<typeof cancelOwnPendingLeaveSchema>;

/** Employee withdraws a pending change request before admin review. */
export const withdrawChangeRequestSchema = z.object({
  requestId: z.number().int().positive(),
});

export type WithdrawChangeRequestValues = z.infer<typeof withdrawChangeRequestSchema>;

export const reviewChangeRequestSchema = z.object({
  requestId: z.number().int().positive(),
  remarks: z.string().max(500).optional(),
});

export type ReviewChangeRequestValues = z.infer<typeof reviewChangeRequestSchema>;

export const leaveFiltersSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  leaveType: leaveTypeCode.optional(),
  userId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type LeaveFilters = z.infer<typeof leaveFiltersSchema>;

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const leaveExportFiltersSchema = z
  .object({
    startDate: isoDateString,
    endDate: isoDateString,
    statuses: z
      .array(z.enum(["PENDING", "APPROVED", "REJECTED"]))
      .min(1, "Select at least one status"),
    userIds: z.array(z.string()).default([]),
    leaveTypeCodes: z.array(leaveTypeCode).default([]),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export type LeaveExportFilters = z.infer<typeof leaveExportFiltersSchema>;

export const updateEmployeeBalanceSchema = z.object({
  userId: z.string().min(1),
  leaveType: leaveTypeCode,
  year: z.number().int().positive(),
  entitled: z.number().min(0),
});

const leaveTypeCodeFormat = z
  .string()
  .trim()
  .min(1, "Code is required")
  .max(64, "Code must be 64 characters or less")
  .regex(/^[A-Z][A-Z0-9_]*$/, "Code must be UPPERCASE letters, digits or underscores");

export const createLeaveTypeSchema = z.object({
  code: leaveTypeCodeFormat,
  name: z.string().trim().min(1, "Name is required").max(64),
  defaultEntitlement: z.number().min(0).default(0),
  isUnpaid: z.boolean().default(false),
  requiresReplacementDate: z.boolean().default(false),
  requiresAttachment: z.boolean().default(false),
  sortOrder: z.number().int().optional(),
});

export type CreateLeaveTypeValues = z.infer<typeof createLeaveTypeSchema>;

export const updateLeaveTypeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(64).optional(),
  defaultEntitlement: z.number().min(0).optional(),
  isUnpaid: z.boolean().optional(),
  requiresReplacementDate: z.boolean().optional(),
  requiresAttachment: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type UpdateLeaveTypeValues = z.infer<typeof updateLeaveTypeSchema>;

export const bulkUpsertLeaveBalancesSchema = z.object({
  userId: z.string().min(1),
  year: z.number().int().positive(),
  entries: z.array(z.object({
    leaveType: leaveTypeCode,
    entitled: z.number().min(0),
  })).min(1),
});

export type BulkUpsertLeaveBalancesValues = z.infer<typeof bulkUpsertLeaveBalancesSchema>;

export const receiptServiceItemSchema = z.object({
  serviceId: z.number().int().positive(),
  descriptionOverride: z.string().min(1, "Description is required").max(2000),
  price: z.number().min(0, "Price must be 0 or more"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  sortOrder: z.number().int().min(0).optional(),
});

export type ReceiptServiceItem = z.infer<typeof receiptServiceItemSchema>;

// Receipt validation schema — invoiceId XOR clientId.
export const createReceiptSchema = z
  .object({
    invoiceId: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
    amount: z.number().positive("Amount must be greater than 0"),
    paymentMethod: z.enum(["cash", "bank_transfer", "mydebit", "visa", "mastercard", "qr"]),
    receiptDate: z.string().optional(),
    advisorIds: z.array(z.string()).min(1, "At least one advisor is required"),
    remarks: z.string().max(2000).optional(),
    services: z.array(receiptServiceItemSchema).optional(),
  })
  .refine((d) => Boolean(d.invoiceId) !== Boolean(d.clientId), {
    message: "Provide exactly one of invoiceId or clientId",
    path: ["invoiceId"],
  });

export type CreateReceiptValues = z.infer<typeof createReceiptSchema>;

// ===== Delivery Order =====
export const deliveryOrderStatusSchema = z.enum(["active", "cancelled"]);

export const deliveryOrderServiceItemSchema = z.object({
  serviceId: z.number().int().positive(),
  descriptionOverride: z.string().min(1, "Description is required").max(2000),
  price: z.number().min(0, "Price must be 0 or more"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  sortOrder: z.number().int().min(0).optional(),
});

export type DeliveryOrderServiceItem = z.infer<typeof deliveryOrderServiceItemSchema>;

export const createDeliveryOrderSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  /** DO document date (`deliveryOrderDate`), HTML date input `YYYY-MM-DD`. */
  deliveryOrderDate: z.string().optional(),
  discountType: discountTypeSchema.optional(),
  discountValue: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  services: z.array(deliveryOrderServiceItemSchema).min(1, "Add at least one service"),
  advisorIds: z.array(z.string()).min(1, "At least one advisor is required"),
  projectId: z.number().int().positive().nullable().optional(),
});

export type CreateDeliveryOrderValues = z.infer<typeof createDeliveryOrderSchema>;

export const updateDeliveryOrderSchema = z.object({
  clientId: z.string().min(1).optional(),
  deliveryOrderDate: z.string().optional(),
  discountType: discountTypeSchema.nullable().optional(),
  discountValue: z.number().min(0).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  services: z.array(deliveryOrderServiceItemSchema).min(1).optional(),
  advisorIds: z.array(z.string()).min(1).optional(),
  status: deliveryOrderStatusSchema.optional(),
  projectId: z.number().int().positive().nullable().optional(),
});

export type UpdateDeliveryOrderValues = z.infer<typeof updateDeliveryOrderSchema>;

export const sendDeliveryOrderEmailSchema = z.object({
  deliveryOrderId: z.string().min(1),
  recipientEmail: z.string().trim().email("Invalid email address"),
});

export type SendDeliveryOrderEmailValues = z.infer<typeof sendDeliveryOrderEmailSchema>;

export const deliveryOrderListFiltersSchema = z.object({
  searchQuery: z.string().optional(),
  clientId: z.string().optional(),
  advisorFilter: z.string().optional(),
  monthYear: z.string().optional(),
  status: deliveryOrderStatusSchema.optional(),
  projectId: z.number().int().positive().nullable().optional(),
});

export type DeliveryOrderListFilters = z.infer<typeof deliveryOrderListFiltersSchema>;

export const deliveryOrderIdSchema = z.string().min(1, "Delivery Order ID is required");

export type UpdateEmployeeBalanceValues = z.infer<typeof updateEmployeeBalanceSchema>;
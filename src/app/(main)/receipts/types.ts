export type PaymentMethodType = "cash" | "bank_transfer" | "mydebit" | "visa" | "mastercard" | "qr"

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
	cash: "Cash",
	bank_transfer: "Bank Transfer",
	mydebit: "MyDebit",
	visa: "VISA",
	mastercard: "MasterCard",
	qr: "QR",
}

export interface ReceiptServiceSnapshot {
	id: number
	serviceId: number
	descriptionOverride: string
	price: number
	quantity: number
	sortOrder: number
	service: {
		id: number
		name: string
	}
}

export interface ReceiptWithInvoice {
	id: string
	receiptNumber: string
	amount: number
	/** Null for standalone (cash sale) receipts that aren't linked to an invoice. */
	invoiceId: string | null
	/** Set on standalone receipts to record which client paid. */
	clientId?: string | null
	status: "active" | "cancelled"
	paymentMethod: PaymentMethodType
	created_at: Date
	updated_at: Date
	receiptDate: Date
	invoice: {
		id: string
		invoiceNumber: string
		type: "SO" | "EPO" | "EO"
		amount: number
		status: "active" | "cancelled"
		created_at?: Date
		quotation?: {
			id: number
			name: string
			description: string
			Client?: {
				id: string
				name: string
				email: string
				company?: string | null
			}
		}
	} | null
	quotation?: {
		id: number
		name: string
		description: string
	} | null
	/** For invoice-linked receipts this is the invoice's client; for standalone it's the receipt's own client. */
	Client?: {
		id: string
		name: string
		email: string
		company?: string | null
	} | null
	/** True when invoiceId is null (i.e. a standalone cash sale). */
	isStandalone?: boolean
	createdBy: {
		id: string
		firstName: string
		lastName: string
		email: string
		supabase_id: string
		created_at: Date
		updated_at: Date
	}
	advisors: Array<{
		id: string
		firstName: string
		lastName: string
		email: string
	}>
	/** Internal note — not shown on the PDF. */
	remarks?: string | null
	/** Optional service line items (standalone receipts only). */
	services?: ReceiptServiceSnapshot[]
}

export interface ReceiptFormData {
	invoiceId?: string
	clientId?: string
	amount: string
	/** Receipt document date (receiptDate). Editable only by admin. */
	receiptDate: string
}


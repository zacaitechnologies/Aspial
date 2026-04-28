export type PaymentMethodType = "cash" | "bank_transfer" | "mydebit" | "visa" | "mastercard" | "qr"

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
	cash: "Cash",
	bank_transfer: "Bank Transfer",
	mydebit: "MyDebit",
	visa: "VISA",
	mastercard: "MasterCard",
	qr: "QR",
}

export interface ReceiptWithInvoice {
	id: string
	receiptNumber: string
	amount: number
	invoiceId: string
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
	Client?: {
		id: string
		name: string
		email: string
		company?: string | null
	} | null
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
}

export interface ReceiptFormData {
	invoiceId?: string
	amount: string
	/** Receipt document date (receiptDate). Editable only by admin. */
	receiptDate: string
}


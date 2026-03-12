export interface ReceiptWithInvoice {
	id: string
	receiptNumber: string
	amount: number
	invoiceId: string
	status: "active" | "cancelled"
	created_at: Date
	updated_at: Date
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
	advisedBy?: {
		id: string
		firstName: string
		lastName: string
		email: string
	} | null
}

export interface ReceiptFormData {
	invoiceId?: string
	amount: string
	/** Receipt date (created_at). Editable only by admin. */
	receiptDate: string
}


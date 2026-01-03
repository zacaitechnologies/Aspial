export interface ReceiptWithInvoice {
	id: string
	receiptNumber: string
	amount: number
	invoiceId: string
	created_at: Date
	updated_at: Date
	invoice: {
		id: string
		invoiceNumber: string
		type: "SO" | "EPO" | "EO"
		amount: number
		quotation?: {
			id: number
			name: string
			description: string
			Client?: {
				id: string
				name: string
				email: string
				company?: string
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
		company?: string
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
}

export interface ReceiptFormData {
	invoiceId?: string
	amount: string
}


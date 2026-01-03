import type { InvoiceType } from "@prisma/client"

export type InvoiceWithQuotation = {
	id: string
	invoiceNumber: string
	type: InvoiceType
	amount: number
	quotationId: number
	status: "active" | "cancelled"
	created_at: Date
	updated_at: Date
	quotation: {
		id: number
		name: string
		description: string
		totalPrice: number
		workflowStatus: string
		discountValue?: number
		discountType?: "percentage" | "fixed"
		duration?: number
		startDate?: Date
		endDate?: Date
		Client?: {
			id: string
			name: string
			email: string
			phone?: string
			company?: string
			address?: string
			notes?: string
			industry?: string
			yearlyRevenue?: number
			membershipType?: string
		}
		createdBy: {
			id: string
			firstName: string
			lastName: string
			email: string
			supabase_id: string
			created_at: Date
			updated_at: Date
		}
		services: {
			id: number
			quotationId: number
			serviceId: number
			customServiceId?: string
			service: {
				id: number
				name: string
				description: string
				basePrice: number
			}
			customService?: any
		}[]
		customServices?: {
			id: string
			quotationId: number
			name: string
			description?: string
			price: number
			status: string
			createdById?: string
			created_at: Date
			updated_at: Date
		}[]
		project: {
			id: number
			name: string
			description?: string
			status: string
			startDate?: Date
			endDate?: Date
			created_at: Date
			updated_at: Date
		} | null
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

export type InvoiceFormData = {
	quotationId?: number
	type: "SO" | "EPO" | "EO"
	amount: string
}

export const invoiceTypeOptions = [
	{ value: "SO", label: "SO" },
	{ value: "EPO", label: "EPO" },
	{ value: "EO", label: "EO" },
] as const


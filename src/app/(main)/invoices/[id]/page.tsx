import { getCachedUser } from "@/lib/auth-cache"
import { getInvoiceFullById } from "../action"
import { getReceiptsForInvoice } from "../../receipts/action"
import { checkHasFullAccess } from "../../actions/admin-actions"
import InvoiceDetailClient from "./InvoiceDetailClient"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function InvoiceDetailPage({
	params,
}: {
	params: Promise<{ id: string }> | { id: string }
}) {
	const user = await getCachedUser()
	if (!user) {
		return null
	}

	// Await params if it's a Promise (Next.js 15+)
	const resolvedParams = await Promise.resolve(params)
	
	// Validate params.id exists
	if (!resolvedParams?.id || typeof resolvedParams.id !== 'string') {
		notFound()
	}

	// Fetch invoice data, receipts, and admin status in parallel
	const [invoice, receipts, isAdmin] = await Promise.all([
		getInvoiceFullById(resolvedParams.id).catch(() => null),
		// Get all receipts for this invoice (include cancelled for display)
		getReceiptsForInvoice(resolvedParams.id, undefined, false).catch(() => []),
		checkHasFullAccess(user.id),
	])

	if (!invoice) {
		notFound()
	}

	// Calculate quotation grand total on server
	let quotationGrandTotal = 0
	if (invoice.quotation) {
		const regularServices = invoice.quotation.services.filter((qs) => !qs.customServiceId)
		const servicesTotal = regularServices.reduce(
			(sum, serviceItem) => sum + (serviceItem.service?.basePrice ?? 0),
			0
		)
		const approvedCustomServicesTotal = (invoice.quotation.customServices || [])
			.filter((cs) => cs.status === "APPROVED")
			.reduce((sum, cs) => sum + cs.price, 0)
		const subtotal = servicesTotal + approvedCustomServicesTotal

		let discountAmount = 0
		if (invoice.quotation.discountValue && invoice.quotation.discountValue > 0) {
			discountAmount =
				invoice.quotation.discountType === "percentage"
					? (subtotal * invoice.quotation.discountValue) / 100
					: invoice.quotation.discountValue
		}

		quotationGrandTotal = subtotal - discountAmount
	}

	// Calculate remaining amount: invoice amount minus sum of active (non-cancelled) receipts
	const totalActiveReceipts = receipts
		.filter((receipt) => receipt.status === "active")
		.reduce((sum, receipt) => sum + receipt.amount, 0)
	const remainingAmount = invoice.amount - totalActiveReceipts

	return (
		<InvoiceDetailClient
			invoice={invoice}
			receipts={receipts}
			isAdmin={isAdmin}
			userId={user.id}
			quotationGrandTotal={quotationGrandTotal}
			remainingAmount={remainingAmount}
		/>
	)
}

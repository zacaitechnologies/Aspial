import { getCachedUser } from "@/lib/auth-cache"
import { getQuotationFullById, getInvoicesForQuotation } from "../action"
import { checkHasFullAccess } from "../../actions/admin-actions"
import QuotationDetailClient from "./QuotationDetailClient"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function QuotationDetailPage({
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

	// Fetch quotation data, invoices, and admin status in parallel
	const [quotation, invoices, isAdmin] = await Promise.all([
		getQuotationFullById(resolvedParams.id).catch(() => null),
		getInvoicesForQuotation(parseInt(resolvedParams.id, 10)).catch(() => []),
		checkHasFullAccess(user.id),
	])

	if (!quotation) {
		notFound()
	}

	return (
		<QuotationDetailClient
			quotation={quotation}
			invoices={invoices}
			isAdmin={isAdmin}
		/>
	)
}

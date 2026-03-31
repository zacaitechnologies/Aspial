import { getCachedUser } from "@/lib/auth-cache"
import { getReceiptFullById, getReceiptsForInvoice } from "../action"
import { checkHasFullAccess } from "../../actions/admin-actions"
import ReceiptDetailClient from "./ReceiptDetailClient"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function ReceiptDetailPage({
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

	// Fetch receipt data and admin status in parallel
	const [receipt, isAdmin] = await Promise.all([
		getReceiptFullById(resolvedParams.id).catch(() => null),
		checkHasFullAccess(user.id),
	])

	if (!receipt) {
		notFound()
	}

	// Calculate remaining amount on server
	let remainingAmount: number | null = null
	if (receipt.invoiceId && receipt.receiptDate) {
		const receiptDocumentDate = new Date(receipt.receiptDate)
		const allReceipts = await getReceiptsForInvoice(receipt.invoiceId, receiptDocumentDate, true)
		const totalReceived = allReceipts.reduce((sum, r) => sum + r.amount, 0)
		const invoiceAmount = receipt.invoice?.amount || 0
		remainingAmount = Math.max(0, invoiceAmount - totalReceived)
	}

	return (
		<ReceiptDetailClient
			receipt={receipt}
			isAdmin={isAdmin}
			remainingAmount={remainingAmount}
		/>
	)
}

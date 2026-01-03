"use client"

import { useState, useEffect } from "react"
import { getInvoicesPaginated } from "./action"
import InvoicesClient from "./components/InvoicesClient"
import { useSession } from "../contexts/SessionProvider"
import { checkIsOperationUser } from "../actions/admin-actions"
import AccessDenied from "../components/AccessDenied"

export default function InvoicesPage() {
	const { enhancedUser } = useSession()
	const [initialData, setInitialData] = useState<any>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isOperationUser, setIsOperationUser] = useState<boolean | null>(null)

	useEffect(() => {
		const fetchInitialData = async () => {
			if (!enhancedUser?.id) {
				setIsLoading(false)
				return
			}

			try {
				const [data, operationUserStatus] = await Promise.all([
					getInvoicesPaginated(1, 10, {}, true),
					checkIsOperationUser(enhancedUser.id)
				])
				setInitialData(data)
				setIsOperationUser(operationUserStatus)
			} catch (error) {
				console.error("Error fetching initial invoices data:", error)
			} finally {
				setIsLoading(false)
			}
		}

		fetchInitialData()
	}, [enhancedUser?.id])

	if (!enhancedUser) {
		return null
	}

	if (isLoading || isOperationUser === null) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex flex-col items-center justify-center py-20 text-primary">
					<div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
					<p className="text-lg font-medium">Loading invoices…</p>
				</div>
			</div>
		)
	}

	if (isOperationUser) {
		return <AccessDenied />
	}

	return <InvoicesClient initialData={initialData} userId={enhancedUser.id} />
}


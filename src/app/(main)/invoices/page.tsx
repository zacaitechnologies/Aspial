"use client"

import { useState, useEffect } from "react"
import { getInvoicesPaginated } from "./action"
import InvoicesClient from "./components/InvoicesClient"
import { useSession } from "../contexts/SessionProvider"

export default function InvoicesPage() {
	const { enhancedUser } = useSession()
	const [initialData, setInitialData] = useState<any>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const fetchInitialData = async () => {
			if (!enhancedUser?.id) {
				setIsLoading(false)
				return
			}

			try {
				const data = await getInvoicesPaginated(1, 10, {}, true)
				setInitialData(data)
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

	if (isLoading || !initialData) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex flex-col items-center justify-center py-20 text-primary">
					<div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
					<p className="text-lg font-medium">Loading invoices…</p>
				</div>
			</div>
		)
	}

	return <InvoicesClient initialData={initialData} userId={enhancedUser.id} />
}


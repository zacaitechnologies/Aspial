"use client"

import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AccessDenied() {
	return (
		<div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#F0E8D8" }}>
			<Card className="max-w-md w-full">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-red-600">
						<AlertTriangle className="w-5 h-5" />
						Access Denied
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-gray-700">
						You don't have permission to access this page. Operation users can only view projects they're involved in.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}


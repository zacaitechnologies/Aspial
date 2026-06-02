import { Building2, Mail, Phone, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface ClientInformation {
	name: string
	email: string
	company?: string | null
	companyRegistrationNumber?: string | null
	phone?: string | null
	address?: string | null
}

interface ClientInformationCardProps {
	client: ClientInformation
}

export function ClientInformationCard({ client }: ClientInformationCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<User className="w-5 h-5" />
					Client Information
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<p className="text-sm font-medium text-muted-foreground">Name</p>
						<p className="font-medium">{client.name}</p>
					</div>
					{client.company && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Company</p>
							<p className="font-medium flex items-center gap-1">
								<Building2 className="w-4 h-4" />
								{client.company}
							</p>
						</div>
					)}
					{client.companyRegistrationNumber && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Registration No.</p>
							<p className="font-medium">{client.companyRegistrationNumber}</p>
						</div>
					)}
					{client.email && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Email</p>
							<p className="font-medium flex items-center gap-1">
								<Mail className="w-4 h-4" />
								{client.email}
							</p>
						</div>
					)}
					{client.phone && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Phone</p>
							<p className="font-medium flex items-center gap-1">
								<Phone className="w-4 h-4" />
								{client.phone}
							</p>
						</div>
					)}
				</div>
				{client.address && (
					<div>
						<p className="text-sm font-medium text-muted-foreground">Address</p>
						<p className="font-medium whitespace-pre-line">{client.address}</p>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

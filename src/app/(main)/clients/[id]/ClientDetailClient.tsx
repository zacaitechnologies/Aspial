"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, Mail, Phone, Calendar, FileText, FolderOpen, Edit, User, IdCard, Receipt, Eye } from "lucide-react"
import Link from "next/link"
import EditClientDialog from "../components/EditClientDialog"
import { getClientById } from "../action"

type ClientData = NonNullable<Awaited<ReturnType<typeof getClientById>>>

interface ClientDetailClientProps {
	client: ClientData
	isAdmin: boolean
	currentUserId: string | null
}

const formatDate = (date: Date) => {
	return new Date(date).toLocaleDateString()
}

export default function ClientDetailClient({
	client: initialClient,
	isAdmin,
	currentUserId,
}: ClientDetailClientProps) {
	const router = useRouter()
	const [client, setClient] = useState(initialClient)
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

	// Check if user can edit this client
	const canEditClient = () => {
		if (!client) return false
		if (isAdmin) return true
		if (!currentUserId || !client.createdById) return false
		return client.createdById === currentUserId
	}

	const handleSuccess = async () => {
		// Refresh client data
		try {
			const updatedClient = await getClientById(client.id)
			setClient(updatedClient)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error("Failed to fetch client:", error)
			}
		}
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto p-6">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-4">
						<Link href="/clients">
							<Button
								variant="outline"
								size="sm"
								className="border-2 bg-transparent border-border"
							>
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to Clients
							</Button>
						</Link>
					</div>

					<div className="flex items-start justify-between">
						<div>
							<h1 className="text-3xl font-bold mb-2 text-foreground">
								{client.name}
							</h1>
							<div className="flex items-center gap-4">
								{client.company && (
									<p className="flex items-center gap-1 text-muted-foreground">
										<Building2 className="h-4 w-4" />
										{client.company}
									</p>
								)}
								<Badge className="bg-green-100 text-green-800">Active</Badge>
							</div>
						</div>
						{canEditClient() && (
							<Button 
								className="bg-primary text-primary-foreground hover:bg-primary/90"
								onClick={() => setIsEditDialogOpen(true)}
							>
								<Edit className="h-4 w-4 mr-2" />
								Edit Client
							</Button>
						)}
					</div>
				</div>

				{/* Client Info Card */}
				<div className="mb-8">
					<Card className="bg-card border-2 border-border h-full">
						<CardHeader>
							<CardTitle className="text-foreground">Client Information</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<div className="flex items-center gap-3 text-muted-foreground">
										<Mail className="h-4 w-4" />
										<span>{client.email}</span>
									</div>
									{client.ic != null && client.ic !== "" && (
										<div className="flex items-center gap-3 text-muted-foreground">
											<IdCard className="h-4 w-4" />
											<span>IC: {client.ic}</span>
										</div>
									)}
									{client.companyRegistrationNumber != null && client.companyRegistrationNumber !== "" && (
										<div className="flex items-center gap-3 text-muted-foreground">
											<Building2 className="h-4 w-4" />
											<span>Company Reg. No: {client.companyRegistrationNumber}</span>
										</div>
									)}
									{client.phone && (
										<div className="flex items-center gap-3 text-muted-foreground">
											<Phone className="h-4 w-4" />
											<span>{client.phone}</span>
										</div>
									)}
								</div>

								<div className="space-y-4">
									<div className="flex items-center gap-3 text-muted-foreground">
										<Calendar className="h-4 w-4" />
										<span>Client since {formatDate(client.created_at)}</span>
									</div>
									<div className="flex items-center gap-3 text-muted-foreground">
										<FileText className="h-4 w-4" />
										<span>{client.quotations.length} Quotations</span>
									</div>
									<div className="flex items-center gap-3 text-muted-foreground">
										<FolderOpen className="h-4 w-4" />
										<span>{client.projects.length} Projects</span>
									</div>
									{client.createdBy && (
										<div className="flex items-center gap-3 text-muted-foreground">
											<User className="h-4 w-4" />
											<span>
												Created by: {client.createdBy.firstName || ''} {client.createdBy.lastName || ''} {client.createdBy.firstName || client.createdBy.lastName ? '' : client.createdBy.email}
											</span>
										</div>
									)}
								</div>

								{client.notes && (
									<div className="md:col-span-2">
										<h4 className="font-medium mb-2 text-foreground">
											Notes
										</h4>
										<p className="text-sm leading-relaxed text-muted-foreground">
											{client.notes}
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Tabs Section */}
				<Tabs defaultValue="quotations" className="space-y-4">
					<TabsList>
						<TabsTrigger value="quotations">Quotations</TabsTrigger>
						<TabsTrigger value="invoices">Invoices</TabsTrigger>
						<TabsTrigger value="projects">Projects</TabsTrigger>
					</TabsList>
					<TabsContent value="quotations">
						{/* Quotations Content */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{client.quotations.length === 0 ? (
								<div className="col-span-full text-center py-8">
									<FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
									<p className="text-muted-foreground">No quotations found for this client.</p>
								</div>
							) : (
								client.quotations.map((quotation) => (
									<Card key={quotation.id} className="card bg-card border-2 border-border gap-0">
										<CardHeader className="pb-3">
											<CardTitle className="text-lg text-foreground">
												{quotation.name}
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-3">
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium text-muted-foreground">Amount:</span>
												<span className="text-lg font-bold text-foreground">
													RM {quotation.totalPrice.toLocaleString()}
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium text-muted-foreground">Workflow:</span>
												<Badge 
													variant="outline" 
													className="capitalize border-border text-foreground"
												>
													{quotation.workflowStatus.replace('_', ' ')}
												</Badge>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium text-muted-foreground">Payment:</span>
												<Badge 
													variant="outline" 
													className="capitalize border-border text-foreground"
												>
													{quotation.paymentStatus.replace('_', ' ')}
												</Badge>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium text-muted-foreground">Created:</span>
												<span className="text-sm text-muted-foreground">
													{formatDate(quotation.created_at)}
												</span>
											</div>
											<Link href={`/quotations/${quotation.id}`}>
												<Button variant="outline" size="sm" className="w-full mt-2">
													<Eye className="w-4 h-4 mr-2" />
													View Quotation
												</Button>
											</Link>
										</CardContent>
									</Card>
								))
							)}
						</div>
					</TabsContent>
					<TabsContent value="invoices">
						{/* Invoices Content */}
						{(() => {
							type QuotationWithInvoices = { id: number; name: string; invoices?: { id: string; invoiceNumber: string; amount: number; type: string; status: string; created_at: Date }[] }
							const invoiceWithQuotation = client.quotations.flatMap((q) => {
								const quotation = q as QuotationWithInvoices
								return (quotation.invoices ?? []).map((invoice) => ({ invoice, quotation }))
							})
							return invoiceWithQuotation.length === 0 ? (
								<div className="col-span-full text-center py-8">
									<Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
									<p className="text-muted-foreground">No invoices found for this client.</p>
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{invoiceWithQuotation.map(({ invoice, quotation }) => (
										<Card key={invoice.id} className="card bg-card border-2 border-border gap-0">
											<CardHeader className="pb-3">
												<CardTitle className="text-lg text-foreground">
													{invoice.invoiceNumber}
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-3">
												<div className="flex items-center justify-between">
													<span className="text-sm font-medium text-muted-foreground">Quotation:</span>
													<span className="text-sm font-medium text-foreground truncate max-w-[180px]" title={quotation.name}>
														{quotation.name}
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-sm font-medium text-muted-foreground">Amount:</span>
													<span className="text-lg font-bold text-foreground">
														RM {invoice.amount.toLocaleString()}
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-sm font-medium text-muted-foreground">Type:</span>
													<Badge variant="outline" className="capitalize border-border text-foreground">
														{invoice.type}
													</Badge>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-sm font-medium text-muted-foreground">Status:</span>
													<Badge variant="outline" className="capitalize border-border text-foreground">
														{invoice.status}
													</Badge>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-sm font-medium text-muted-foreground">Created:</span>
													<span className="text-sm text-muted-foreground">
														{formatDate(invoice.created_at)}
													</span>
												</div>
												<div className="flex gap-2 mt-2">
													<Link href={`/invoices/${invoice.id}`} className="flex-1">
														<Button variant="outline" size="sm" className="w-full">
															View Invoice
														</Button>
													</Link>
													<Link href={`/quotations/${quotation.id}`} className="flex-1">
														<Button variant="outline" size="sm" className="w-full">
															<Eye className="w-4 h-4 mr-1" />
															View Quotation
														</Button>
													</Link>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							)
						})()}
					</TabsContent>
					<TabsContent value="projects">
						{/* Projects Content */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{client.projects.length === 0 ? (
								<div className="col-span-full text-center py-8">
									<FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
									<p className="text-muted-foreground">No projects found for this client.</p>
								</div>
							) : (
								client.projects.map((project) => (
									<Card key={project.id} className="card bg-card border-2 border-border">
										<CardHeader className="pb-3">
											<CardTitle className="text-lg text-foreground">
												{project.name}
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-3">
											{project.description && (
												<div>
													<span className="text-sm font-medium text-muted-foreground">Description:</span>
													<p className="text-sm mt-1 text-muted-foreground">
														{project.description}
													</p>
												</div>
											)}
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium text-muted-foreground">Status:</span>
												<Badge 
													variant="outline" 
													className="capitalize border-border text-foreground"
												>
													{project.status.replace('_', ' ')}
												</Badge>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium text-muted-foreground">Created:</span>
												<span className="text-sm text-muted-foreground">
													{formatDate(project.created_at)}
												</span>
											</div>
										</CardContent>
									</Card>
								))
							)}
						</div>
					</TabsContent>
				</Tabs>

				{/* Edit Client Dialog */}
				<EditClientDialog
					client={{
						id: client.id,
						name: client.name,
						email: client.email,
						phone: client.phone || undefined,
						company: client.company || undefined,
						companyRegistrationNumber: client.companyRegistrationNumber || undefined,
						ic: client.ic || undefined,
						address: client.address || undefined,
						notes: client.notes || undefined,
						industry: client.industry || undefined,
						yearlyRevenue: client.yearlyRevenue || undefined,
						membershipType: client.membershipType,
						quotationsCount: client.quotations.length,
						totalValue: client.quotations.reduce(
							(sum, q) => sum + ((q as { invoices?: { amount: number }[] }).invoices?.reduce((s, i) => s + i.amount, 0) ?? 0),
							0
						),
						created_at: client.created_at.toISOString(),
					}}
					isOpen={isEditDialogOpen}
					onOpenChange={setIsEditDialogOpen}
					onSuccess={handleSuccess}
				/>
			</div>
		</div>
	)
}

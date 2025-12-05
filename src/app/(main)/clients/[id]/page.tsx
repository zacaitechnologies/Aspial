"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, FileText, FolderOpen, Edit, User } from "lucide-react"
import Link from "next/link"
import { getClientById, checkIsAdmin, getCurrentUserId } from "../action"
import { useSession } from "../../contexts/SessionProvider"
import EditClientDialog from "../components/EditClientDialog"

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  notes: string | null
  industry: string | null
  yearlyRevenue: number | null
  membershipType: "MEMBER" | "NON_MEMBER"
  created_at: Date
  updated_at: Date
  createdById?: string
  createdBy?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  quotations: Quotation[]
  projects: Project[]
}

interface Quotation {
  id: number
  name: string
  totalPrice: number
  workflowStatus: string
  paymentStatus: string
  created_at: Date
}

interface Project {
  id: number
  name: string
  description: string | null
  status: string
  created_at: Date
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString()
}

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string
  const { enhancedUser } = useSession()

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true)
      const clientData = await getClientById(clientId)
      setClient(clientData)
    } catch (error) {
      console.error("Failed to fetch client:", error)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (clientId) {
      fetchClient()
    }
  }, [fetchClient, clientId])

  // Check admin status and get current user ID
  useEffect(() => {
    const checkAdminAndUser = async () => {
      if (enhancedUser?.id) {
        const [adminStatus, userId] = await Promise.all([
          checkIsAdmin(enhancedUser.id),
          getCurrentUserId()
        ])
        setIsAdmin(adminStatus)
        setCurrentUserId(userId)
      }
    }
    checkAdminAndUser()
  }, [enhancedUser?.id])

  // Check if user can edit this client
  const canEditClient = () => {
    if (!client) return false
    if (isAdmin) return true
    if (!currentUserId || !client.createdById) return false
    return client.createdById === currentUserId
  }

  const handleSuccess = async () => {
    await fetchClient()
  }

  // Photo handling function

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F0E8D8" }}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <p style={{ color: "#898D74" }}>Loading client...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F0E8D8" }}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <p style={{ color: "#898D74" }}>Client not found.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0E8D8" }}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/clients">
              <Button
                variant="outline"
                size="sm"
                className="border-2 bg-transparent"
                style={{ borderColor: "#BDC4A5" }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: "#202F21" }}>
                {client.name}
              </h1>
              <div className="flex items-center gap-4">
                {client.company && (
                  <p className="flex items-center gap-1" style={{ color: "#898D74" }}>
                    <Building2 className="h-4 w-4" />
                    {client.company}
                  </p>
                )}
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
            {canEditClient() && (
              <Button 
                className="text-white" 
                style={{ backgroundColor: "#202F21" }}
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
          <Card className="bg-white border-2 h-full" style={{ borderColor: "#BDC4A5" }}>
              <CardHeader>
                <CardTitle style={{ color: "#202F21" }}>Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3" style={{ color: "#898D74" }}>
                      <Mail className="h-4 w-4" />
                      <span>{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-3" style={{ color: "#898D74" }}>
                        <Phone className="h-4 w-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}

                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3" style={{ color: "#898D74" }}>
                      <Calendar className="h-4 w-4" />
                      <span>Client since {formatDate(client.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-3" style={{ color: "#898D74" }}>
                      <FileText className="h-4 w-4" />
                      <span>{client.quotations.length} Quotations</span>
                    </div>
                    <div className="flex items-center gap-3" style={{ color: "#898D74" }}>
                      <FolderOpen className="h-4 w-4" />
                      <span>{client.projects.length} Projects</span>
                    </div>
                    {client.createdBy && (
                      <div className="flex items-center gap-3" style={{ color: "#898D74" }}>
                        <User className="h-4 w-4" />
                        <span>
                          Created by: {client.createdBy.firstName || ''} {client.createdBy.lastName || ''} {client.createdBy.firstName || client.createdBy.lastName ? '' : client.createdBy.email}
                        </span>
                      </div>
                    )}
                  </div>

                  {client.notes && (
                    <div className="md:col-span-2">
                      <h4 className="font-medium mb-2" style={{ color: "#202F21" }}>
                        Notes
                      </h4>
                      <p className="text-sm leading-relaxed" style={{ color: "#898D74" }}>
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
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
          <TabsContent value="quotations">
            {/* Quotations Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.quotations.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: "#898D74" }} />
                  <p style={{ color: "#898D74" }}>No quotations found for this client.</p>
                </div>
              ) : (
                client.quotations.map((quotation) => (
                  <Card key={quotation.id} className="card bg-white border-2 gap-0" style={{ borderColor: "#BDC4A5" }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg" style={{ color: "#202F21" }}>
                        {quotation.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#898D74" }}>Amount:</span>
                        <span className="text-lg font-bold" style={{ color: "#202F21" }}>
                          RM {quotation.totalPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#898D74" }}>Workflow:</span>
                        <Badge 
                          variant="outline" 
                          className="capitalize"
                          style={{ borderColor: "#BDC4A5", color: "#202F21" }}
                        >
                          {quotation.workflowStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#898D74" }}>Payment:</span>
                        <Badge 
                          variant="outline" 
                          className="capitalize"
                          style={{ borderColor: "#BDC4A5", color: "#202F21" }}
                        >
                          {quotation.paymentStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#898D74" }}>Created:</span>
                        <span className="text-sm" style={{ color: "#898D74" }}>
                          {formatDate(quotation.created_at)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="projects">
            {/* Projects Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.projects.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4" style={{ color: "#898D74" }} />
                  <p style={{ color: "#898D74" }}>No projects found for this client.</p>
                </div>
              ) : (
                client.projects.map((project) => (
                  <Card key={project.id} className="card bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg" style={{ color: "#202F21" }}>
                        {project.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {project.description && (
                        <div>
                          <span className="text-sm font-medium" style={{ color: "#898D74" }}>Description:</span>
                          <p className="text-sm mt-1" style={{ color: "#898D74" }}>
                            {project.description}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#898D74" }}>Status:</span>
                        <Badge 
                          variant="outline" 
                          className="capitalize"
                          style={{ borderColor: "#BDC4A5", color: "#202F21" }}
                        >
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#898D74" }}>Created:</span>
                        <span className="text-sm" style={{ color: "#898D74" }}>
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
        {client && (
          <EditClientDialog
            client={{
              id: client.id,
              name: client.name,
              email: client.email,
              phone: client.phone || undefined,
              company: client.company || undefined,
              address: client.address || undefined,
              notes: client.notes || undefined,
              industry: client.industry || undefined,
              yearlyRevenue: client.yearlyRevenue || undefined,
              membershipType: client.membershipType,
              quotationsCount: client.quotations.length,
              totalValue: 0,
              created_at: client.created_at.toISOString(),
            }}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Search,
  Filter,
  Mail,
  Phone,
  Building2,
  MapPin,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  User,
  FileText,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getAllClients, deleteClient } from "./action"
import CreateClientDialog from "./components/CreateClientDialog"
import EditClientDialog from "./components/EditClientDialog"
import DeleteClientDialog from "./components/DeleteClientDialog"

type ClientStatus = "active" | "inactive" | "prospect" | "archived"

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  country?: string
  status: ClientStatus
  notes?: string
  quotationsCount: number
  totalValue: number
  created_at: string
  photo?: string
}



export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const clientsData = await getAllClients()
      setClients(clientsData)
    } catch (error) {
      console.error("Failed to fetch clients:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClient = (client: Client) => {
    setDeletingClient(client)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteClient = async () => {
    if (!deletingClient) return
    
    try {
      await deleteClient(deletingClient.id)
      await fetchClients()
    } catch (error) {
      console.error("Failed to delete client:", error)
      alert("Failed to delete client. Please try again.")
    }
  }

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case "active":
        return "bg-[#BDC4A5] text-[#202F21] border-[#898D74]"
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "prospect":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "archived":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalClients = clients.length
  const activeClients = clients.filter((c) => c.status === "active").length
  const totalValue = clients.reduce((sum, client) => sum + client.totalValue, 0)
  const avgValue = totalClients > 0 ? totalValue / totalClients : 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0E8D8" }}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: "#202F21" }}>
              Client Management
            </h1>
            <p className="text-lg" style={{ color: "#898D74" }}>
              Manage your client relationships and track business opportunities
            </p>
          </div>
                     <CreateClientDialog onSuccess={fetchClients} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#898D74" }}>
                    Total Clients
                  </p>
                  <p className="text-3xl font-bold" style={{ color: "#202F21" }}>
                    {totalClients}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#BDC4A5" }}
                >
                  <Building2 className="w-6 h-6" style={{ color: "#202F21" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#898D74" }}>
                    Active Clients
                  </p>
                  <p className="text-3xl font-bold" style={{ color: "#202F21" }}>
                    {activeClients}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#898D74" }}
                >
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#898D74" }}>
                    Total Value
                  </p>
                  <p className="text-3xl font-bold" style={{ color: "#202F21" }}>
                    ${totalValue.toLocaleString()}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#202F21" }}
                >
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#898D74" }}>
                    Avg. Value
                  </p>
                  <p className="text-3xl font-bold" style={{ color: "#202F21" }}>
                    ${avgValue.toLocaleString()}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#BDC4A5" }}
                >
                  <Building2 className="w-6 h-6" style={{ color: "#202F21" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search
              className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2"
              style={{ color: "#898D74" }}
            />
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-2"
              style={{ borderColor: "#BDC4A5" }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ClientStatus | "all")}>
            <SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
              <Filter className="w-4 h-4 mr-2" style={{ color: "#898D74" }} />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: "#898D74" }}>Loading clients...</p>
          </div>
        )}

        {/* Clients Grid */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="bg-white border-2 hover:shadow-lg transition-shadow"
              style={{ borderColor: "#BDC4A5" }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {client.photo ? (
                      <Image
                        src={client.photo || "/placeholder.svg"}
                        alt={`${client.name} profile`}
                        width={60}
                        height={60}
                        className="rounded-full object-cover border-2"
                        style={{ borderColor: "#BDC4A5" }}
                      />
                    ) : (
                      <div
                        className="w-15 h-15 rounded-full flex items-center justify-center border-2"
                        style={{ backgroundColor: "#BDC4A5", borderColor: "#898D74" }}
                      >
                        <User className="w-8 h-8" style={{ color: "#202F21" }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl font-semibold mb-2" style={{ color: "#202F21" }}>
                          {client.name}
                        </CardTitle>
                        <Badge className={getStatusColor(client.status)} variant="outline">
                          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" style={{ color: "#898D74" }}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4" style={{ color: "#898D74" }} />
                    <span style={{ color: "#202F21" }}>{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4" style={{ color: "#898D74" }} />
                      <span style={{ color: "#202F21" }}>{client.phone}</span>
                    </div>
                  )}
                  {client.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4" style={{ color: "#898D74" }} />
                      <span style={{ color: "#202F21" }}>{client.company}</span>
                    </div>
                  )}
                  {client.city && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" style={{ color: "#898D74" }} />
                      <span style={{ color: "#202F21" }}>
                        {client.city}, {client.country}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "#BDC4A5" }}>
                  <div className="text-sm">
                    <p style={{ color: "#898D74" }}>Quotations: {client.quotationsCount}</p>
                    <p className="font-semibold" style={{ color: "#202F21" }}>
                      ${client.totalValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/clients/${client.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 bg-transparent"
                        style={{ borderColor: "#BDC4A5", color: "#202F21" }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 bg-transparent"
                      style={{ borderColor: "#BDC4A5", color: "#202F21" }}
                      onClick={() => handleEditClient(client)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                      onClick={() => handleDeleteClient(client)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}

                 {!loading && clients.length === 0 && (
           <div className="text-center py-12">
             <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
             <p className="text-muted-foreground">No clients available.</p>
           </div>
         )}

                   {/* Edit Client Dialog */}
          <EditClientDialog
            client={editingClient}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSuccess={fetchClients}
          />

          {/* Delete Client Dialog */}
          <DeleteClientDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={confirmDeleteClient}
            clientName={deletingClient?.name || ""}
          />
       </div>
     </div>
   )
 }

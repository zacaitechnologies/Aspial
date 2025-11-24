"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Search,
  DollarSign,
  Mail,
  Phone,
  Building2,
  MapPin,
  Edit,
  Trash2,
  Eye,
  User,
  FileText,
  ArrowUp,
  ArrowDown,
  Crown,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getClientsPaginated, deleteClient } from "./action"
import CreateClientDialog from "./components/CreateClientDialog"
import EditClientDialog from "./components/EditClientDialog"
import DeleteClientDialog from "./components/DeleteClientDialog"
import { usePaginatedData } from "@/hooks/use-paginated-data"
import { ProjectPagination } from "../projects/components/ProjectPagination"


interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  country?: string
  notes?: string
  industry?: string
  yearlyRevenue?: number
  membershipType: "MEMBER" | "NON_MEMBER"
  quotationsCount: number
  totalValue: number
  created_at: string
  photo?: string
}



type SortOption = "name" | "yearlyRevenue" | "totalValue" | "created_at"
type SortDirection = "asc" | "desc"

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [industryFilter, setIndustryFilter] = useState<string>("all")
  const [membershipFilter, setMembershipFilter] = useState<"all" | "MEMBER" | "NON_MEMBER">("all")
  const [sortBy, setSortBy] = useState<SortOption>("created_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)

  // Pagination with server-side filtering
  const {
    data: clients,
    isLoading: loading,
    page,
    pageSize,
    total,
    totalPages,
    goToPage,
    setPageSize,
    refresh,
    invalidateCache,
  } = usePaginatedData<Client, any>({
    fetchFn: async (page, pageSize) => {
      return await getClientsPaginated(page, pageSize, {
        searchTerm,
        industry: industryFilter,
        membershipType: membershipFilter,
        sortBy,
        sortDirection,
      })
    },
    initialPage: 1,
    initialPageSize: 12,
    filters: { searchTerm, industryFilter, membershipFilter, sortBy, sortDirection },
  })

  // Get unique industries (note: this is now from current page only)
  const uniqueIndustries = useMemo(
    () => Array.from(new Set(clients.filter(client => client.industry).map(client => client.industry!))).sort(),
    [clients]
  )

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortBy(option)
      setSortDirection("asc")
    }
    // Cache will auto-invalidate and refetch with new sort
  }

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
      invalidateCache()
      await refresh()
    } catch (error) {
      console.error("Failed to delete client:", error)
      alert("Failed to delete client. Please try again.")
    }
  }

  const handleSuccess = async () => {
    invalidateCache()
    await refresh()
  }

  // Calculate stats from total
  const totalClients = total
  const memberClients = clients.filter((c) => c.membershipType === "MEMBER").length
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
                     <CreateClientDialog onSuccess={handleSuccess} />
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
                    Member Clients
                  </p>
                  <p className="text-3xl font-bold" style={{ color: "#202F21" }}>
                    {memberClients}
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

        {/* Filters and Sorting */}
        <div className="space-y-4 mb-6">
          {/* Search and Primary Filters */}
          <div className="flex items-center gap-4">
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
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
                <Building2 className="w-4 h-4 mr-2" style={{ color: "#898D74" }} />
                <SelectValue placeholder="Filter by industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {uniqueIndustries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={membershipFilter} onValueChange={(value) => setMembershipFilter(value as "all" | "MEMBER" | "NON_MEMBER")}>
              <SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
                <User className="w-4 h-4 mr-2" style={{ color: "#898D74" }} />
                <SelectValue placeholder="Filter by membership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="MEMBER">Members</SelectItem>
                <SelectItem value="NON_MEMBER">Non-Members</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sorting Controls */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium" style={{ color: "#202F21" }}>
              Sort by:
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort("name")}
              className={`border-2 ${sortBy === "name" ? "bg-[#BDC4A5] text-[#202F21]" : "bg-white"}`}
              style={{ borderColor: "#BDC4A5" }}
            >
              Name {sortBy === "name" && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort("yearlyRevenue")}
              className={`border-2 ${sortBy === "yearlyRevenue" ? "bg-[#BDC4A5] text-[#202F21]" : "bg-white"}`}
              style={{ borderColor: "#BDC4A5" }}
            >
              Revenue {sortBy === "yearlyRevenue" && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort("totalValue")}
              className={`border-2 ${sortBy === "totalValue" ? "bg-[#BDC4A5] text-[#202F21]" : "bg-white"}`}
              style={{ borderColor: "#BDC4A5" }}
            >
              Total Purchased {sortBy === "totalValue" && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort("created_at")}
              className={`border-2 ${sortBy === "created_at" ? "bg-[#BDC4A5] text-[#202F21]" : "bg-white"}`}
              style={{ borderColor: "#BDC4A5" }}
            >
              Date Added {sortBy === "created_at" && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
            </Button>
          </div>
        </div>

        {/* Clients Grid with Loading Overlay */}
        <div className="relative">
          <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          {clients.map((client) => (
            <Card
              key={client.id}
              className="card bg-white border-2"
              style={{ borderColor: "#BDC4A5" }}
            >
              <CardHeader className="">
                <div className="flex justify-between items-start">
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
                      <CardTitle className="text-xl font-semibold mb-1" style={{ color: "#202F21" }}>
                        {client.company || client.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={client.membershipType === "MEMBER" ? "bg-yellow-600 hover:bg-yellow-700 text-white" : "bg-gray-100 text-gray-700"} 
                          variant="outline"
                        >
                          <Crown className="w-3 h-3 mr-1" />
                          {client.membershipType === "MEMBER" ? "Member" : "Non-Member"}
                        </Badge>
                        {client.industry && (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                            {client.industry}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Link href={`/clients/${client.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View Client"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClient(client)}
                      title="Edit Client"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteClient(client)}
                      title="Delete Client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
                  {client.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4" style={{ color: "#898D74" }} />
                      <span style={{ color: "#202F21" }}>{client.name}</span>
                    </div>
                  )}
                  {client.yearlyRevenue && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4" style={{ color: "#898D74" }} />
                      <span style={{ color: "#202F21" }}>RM {client.yearlyRevenue.toLocaleString()}</span>
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

                <div className="pt-4 border-t" style={{ borderColor: "#BDC4A5" }}>
                  <div className="text-sm">
                    <p style={{ color: "#898D74" }}>Quotations: {client.quotationsCount}</p>
                    <p className="font-semibold" style={{ color: "#202F21" }}>
                      ${client.totalValue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3" style={{ color: "#202F21" }}>
              <div className="h-10 w-10 border-4 border-[#BDC4A5] border-t-[#202F21] rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading clients…</p>
            </div>
          </div>
        )}
      </div>

        {!loading && clients.length === 0 && total === 0 && (
           <div className="text-center py-12">
             <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
             <p className="text-muted-foreground">No clients available.</p>
           </div>
         )}

         {/* Pagination */}
        <ProjectPagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
        />

        {/* Edit Client Dialog */}
        <EditClientDialog
          client={editingClient}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleSuccess}
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

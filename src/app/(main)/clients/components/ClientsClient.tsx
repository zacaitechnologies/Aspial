"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { deleteClient, getCurrentUserId, getClientsPaginatedFresh, invalidateClientsCache, getClientDeletionImpact, type DeletionImpact } from "../action"
import { checkHasFullAccess } from "../../actions/admin-actions"
import CreateClientDialog from "./CreateClientDialog"
import EditClientDialog from "./EditClientDialog"
import DeleteClientDialog from "./DeleteClientDialog"
import SalesAnalytics from "./SalesAnalytics"
import { ProjectPagination } from "../../projects/components/ProjectPagination"
import { toast } from "@/components/ui/use-toast"
import { useSession } from "../../contexts/SessionProvider"
import { DeletionImpactWarningDialog } from "@/components/ui/deletion-impact-warning-dialog"

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
  createdById?: string
  createdBy?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
}

type SortOption = "name" | "yearlyRevenue" | "totalValue" | "created_at"
type SortDirection = "asc" | "desc"

interface ClientsClientProps {
  initialData: {
    data: Client[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  userId?: string
}

export default function ClientsClient({ initialData, userId }: ClientsClientProps) {
  const { enhancedUser } = useSession()
  const [searchTerm, setSearchTerm] = useState("")
  const [industryFilter, setIndustryFilter] = useState<string>("all")
  const [membershipFilter, setMembershipFilter] = useState<"all" | "MEMBER" | "NON_MEMBER">("all")
  const [sortBy, setSortBy] = useState<SortOption>("created_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false)
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null)
  const [activeTab, setActiveTab] = useState("clients")

  // State from initial data
  const [clients, setClients] = useState<Client[]>(initialData.data)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(initialData.page)
  const [pageSize, setPageSizeState] = useState(initialData.pageSize)
  const [total, setTotal] = useState(initialData.total)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)

  // Fetch fresh data when filters change
  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getClientsPaginatedFresh(page, pageSize, {
        searchTerm: searchTerm || undefined,
        industry: industryFilter !== "all" ? industryFilter : undefined,
        membershipType: membershipFilter,
        sortBy,
        sortDirection,
      })
      setClients(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (error) {
      console.error("Error fetching clients:", error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchTerm, industryFilter, membershipFilter, sortBy, sortDirection])

  // Refetch when filters/pagination change
  useEffect(() => {
    fetchClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchTerm, industryFilter, membershipFilter, sortBy, sortDirection])

  // Check admin/brand-advisor status and get current user ID
  useEffect(() => {
    const checkAdminAndUser = async () => {
      if (enhancedUser?.id) {
        const [hasFullAccess, fetchedUserId] = await Promise.all([
          checkHasFullAccess(enhancedUser.id),
          getCurrentUserId(),
        ])
        setIsAdmin(hasFullAccess)
        setCurrentUserId(fetchedUserId)
      }
    }
    checkAdminAndUser()
  }, [enhancedUser?.id])

  const uniqueIndustries = useMemo(
    () => Array.from(new Set(clients.filter((client) => client.industry).map((client) => client.industry!))).sort(),
    [clients]
  )

  const canEditClient = (client: Client) => {
    if (isAdmin) return true
    if (!currentUserId || !client.createdById) return false
    return client.createdById === currentUserId
  }

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortBy(option)
      setSortDirection("asc")
    }
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClient = async (client: Client) => {
    setDeletingClient(client)
    try {
      const impact = await getClientDeletionImpact(client.id)
      setDeletionImpact(impact)
      if (impact.items.length > 0 && impact.items.some((item) => item.count > 0)) {
        setIsWarningDialogOpen(true)
      } else {
        setIsDeleteDialogOpen(true)
      }
    } catch (error) {
      console.error("Failed to get deletion impact:", error)
      toast({
        title: "Error",
        description: "Failed to check deletion impact. Please try again.",
        variant: "destructive",
      })
    }
  }

  const confirmDeleteClient = async () => {
    if (!deletingClient) return

    try {
      await deleteClient(deletingClient.id)
      await invalidateClientsCache()
      await fetchClients()
      setIsDeleteDialogOpen(false)
      setIsWarningDialogOpen(false)
      setDeletingClient(null)
      setDeletionImpact(null)
      toast({
        title: "Success",
        description: "Client deleted successfully.",
      })
    } catch (error) {
      console.error("Failed to delete client:", error)
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSuccess = async () => {
    await invalidateClientsCache()
    await fetchClients()
  }

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    setPage(1)
  }, [])

  // Calculate stats
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

        {/* Tabs */}
        <Tabs defaultValue="clients" className="w-full" onValueChange={setActiveTab}>
          <div className="relative">
            <TabsList className="grid w-full grid-cols-2 bg-transparent border-primary border transition-all duration-300 ease-in-out">
              <TabsTrigger 
                value="clients" 
                className="flex items-center gap-2 transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
              >
                <Building2 className="w-4 h-4" />
                Client List
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center gap-2 transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-white"
              >
                <TrendingUp className="w-4 h-4" />
                Sales Analytics
              </TabsTrigger>
            </TabsList>
            {/* Sliding indicator */}
            <div 
              className={`absolute top-1 h-[calc(100%-8px)] bg-secondary transition-all duration-300 ease-in-out rounded-md z-0 ${
                activeTab === "clients" ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
              }`}
              style={{ backgroundColor: "#202F21" }}
            />
          </div>

          <TabsContent value="clients" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#898D74" }}>Total Clients</p>
                  <p className="text-3xl font-bold" style={{ color: "#202F21" }}>{totalClients}</p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#BDC4A5" }}>
                  <Building2 className="w-6 h-6" style={{ color: "#202F21" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#898D74" }}>Member Clients</p>
                  <p className="text-3xl font-bold" style={{ color: "#202F21" }}>{memberClients}</p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#898D74" }}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Sorting */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: "#898D74" }} />
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
                  <SelectItem key={industry} value={industry}>{industry}</SelectItem>
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
            <Label className="text-sm font-medium" style={{ color: "#202F21" }}>Sort by:</Label>
            {(["name", "yearlyRevenue", "totalValue", "created_at"] as SortOption[]).map((option) => (
              <Button
                key={option}
                variant="outline"
                size="sm"
                onClick={() => handleSort(option)}
                className={`border-2 ${sortBy === option ? "bg-[#BDC4A5] text-[#202F21]" : "bg-white"}`}
                style={{ borderColor: "#BDC4A5" }}
              >
                {option === "name" ? "Name" : option === "yearlyRevenue" ? "Revenue" : option === "totalValue" ? "Total Purchased" : "Date Added"}
                {sortBy === option && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
              </Button>
            ))}
          </div>
        </div>

        {/* Clients Grid with Loading Overlay */}
        <div className="relative">
          <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
            {clients.map((client) => (
              <Card key={client.id} className="card bg-white border-2 flex flex-col h-full overflow-hidden" style={{ borderColor: "#BDC4A5" }}>
                <CardHeader className="block!">
                  <div className="flex items-center gap-2 mb-2 w-full">
                    <h3 
                      className="text-xl font-semibold truncate flex-1 min-w-0" 
                      style={{ color: "#202F21" }} 
                      title={client.company || client.name}
                    >
                      {client.company || client.name}
                    </h3>
                    <div className="flex shrink-0">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="ghost" size="sm" title="View Client">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      {canEditClient(client) && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEditClient(client)} title="Edit Client">
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
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Mail className="w-4 h-4 shrink-0" style={{ color: "#898D74" }} />
                      <span 
                        className="truncate" 
                        style={{ color: "#202F21" }} 
                        title={client.email}
                      >
                        {client.email}
                      </span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4" style={{ color: "#898D74" }} />
                        <span style={{ color: "#202F21" }}>{client.phone}</span>
                      </div>
                    )}
                    {client.name && (
                      <div className="flex items-center gap-2 text-sm min-w-0">
                        <User className="w-4 h-4 shrink-0" style={{ color: "#898D74" }} />
                        <span 
                          className="truncate" 
                          style={{ color: "#202F21" }} 
                          title={client.name}
                        >
                          {client.name}
                        </span>
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
                        <span style={{ color: "#202F21" }}>{client.city}, {client.country}</span>
                      </div>
                    )}
                    {client.createdBy && (
                      <div className="flex items-center gap-2 text-sm min-w-0">
                        <User className="w-4 h-4 shrink-0" style={{ color: "#898D74" }} />
                        <span 
                          className="truncate" 
                          style={{ color: "#202F21" }}
                          title={`Created by: ${client.createdBy.firstName || ""} ${client.createdBy.lastName || ""} ${client.createdBy.firstName || client.createdBy.lastName ? "" : client.createdBy.email}`.trim()}
                        >
                          Created by: {client.createdBy.firstName || ""} {client.createdBy.lastName || ""}{" "}
                          {client.createdBy.firstName || client.createdBy.lastName ? "" : client.createdBy.email}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t mt-4" style={{ borderColor: "#BDC4A5" }}>
                    <div className="text-sm">
                      <p style={{ color: "#898D74" }}>Quotations: {client.quotationsCount}</p>
                      <p className="font-semibold" style={{ color: "#202F21" }}>RM {client.totalValue.toLocaleString()}</p>
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
          </TabsContent>

          <TabsContent value="analytics">
            <SalesAnalytics />
          </TabsContent>
        </Tabs>

        {/* Edit Client Dialog */}
        <EditClientDialog client={editingClient} isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} onSuccess={handleSuccess} />

        {/* Delete Client Dialog */}
        <DeleteClientDialog isOpen={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} onConfirm={confirmDeleteClient} clientName={deletingClient?.name || ""} />

        {/* Deletion Impact Warning Dialog */}
        <DeletionImpactWarningDialog
          isOpen={isWarningDialogOpen}
          onClose={() => {
            setIsWarningDialogOpen(false)
            setDeletingClient(null)
            setDeletionImpact(null)
          }}
          onProceed={confirmDeleteClient}
          title="Delete Client"
          entityName="client"
          impactItems={deletionImpact?.items || []}
          isLoading={false}
        />
      </div>
    </div>
  )
}


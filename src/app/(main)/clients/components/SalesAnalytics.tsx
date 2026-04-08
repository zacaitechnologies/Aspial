"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, TrendingUp, Users, FileText, Search, Calendar, Building2, User as UserIcon } from "lucide-react"
import { getSalesData, getAllAdvisors } from "../action"
import { checkIsAdmin } from "../../actions/admin-actions"
import { useSession } from "../../contexts/SessionProvider"
import { formatNumber } from "@/lib/format-number"

interface SalesAnalyticsProps {
  defaultYear?: number
  defaultMonth?: number
}

export default function SalesAnalytics({ defaultYear, defaultMonth }: SalesAnalyticsProps) {
  const { enhancedUser } = useSession()
  const currentDate = new Date()
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly')
  const [year, setYear] = useState<string>(defaultYear?.toString() || currentDate.getFullYear().toString())
  const [month, setMonth] = useState<string>(defaultMonth !== undefined ? defaultMonth.toString() : currentDate.getMonth().toString())
  const [advisorId, setAdvisorId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<{
    totalSales: number
    totalClients: number
    totalInvoices: number
    monthlyBreakdown?: Array<{
      month: string
      monthIndex: number
      sales: number
      invoices: number
      clients: number
    }>
    invoices: Array<{
      id: string
      invoiceNumber: string
      type: string
      amount: number
      invoiceDate: string
      created_at: string
      quotation: { id: number; name: string }
      client: { id: string; name: string; email: string; company: string | null; membershipType: string | null }
      advisors: Array<{ id: string; name: string; email: string }>
    }>
    salesByAdvisor: Array<{
      advisorId: string
      advisorName: string
      totalSales: number
      invoicesCount: number
      clientsCount: number
    }>
  } | null>(null)
  const [advisors, setAdvisors] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [isAdmin, setIsAdmin] = useState(false)

  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      if (enhancedUser?.id) {
        try {
          const adminStatus = await checkIsAdmin(enhancedUser.id)
          setIsAdmin(adminStatus)
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error checking admin status:', error)
          }
        }
      }
    }
    checkAdmin()
  }, [enhancedUser?.id])

  // Fetch advisors on mount (only for admin users)
  useEffect(() => {
    const fetchAdvisors = async () => {
      if (!isAdmin) return // Non-admin users don't need advisor list
      
      try {
        const data = await getAllAdvisors()
        setAdvisors(data)
      } catch (error) {
        console.error('Error fetching advisors:', error)
      }
    }
    fetchAdvisors()
  }, [isAdmin])

  // Fetch sales data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await getSalesData({
          year: parseInt(year),
          month: viewMode === 'monthly' ? parseInt(month) : undefined,
          advisorId: advisorId !== 'all' ? advisorId : undefined,
          viewMode,
        })
        setSalesData(data)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error fetching sales data:', error)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [year, month, advisorId, viewMode])

  // Generate year options (current year and past 5 years)
  const years = Array.from({ length: 6 }, (_, i) => currentDate.getFullYear() - i)
  
  // Month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Filter invoices based on search term
  const filteredInvoices = salesData?.invoices?.filter((invoice) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      invoice.quotation?.name?.toLowerCase().includes(searchLower) ||
      invoice.client?.name?.toLowerCase().includes(searchLower) ||
      invoice.advisors?.some(a => a.name?.toLowerCase().includes(searchLower))
    )
  }) || []

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-2 bg-card border-border"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-md">
            <Label htmlFor="view-mode" className={`text-sm font-medium whitespace-nowrap ${viewMode === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
              Yearly
            </Label>
            <Switch
              id="view-mode"
              checked={viewMode === "monthly"}
              onCheckedChange={(checked) => setViewMode(checked ? "monthly" : "yearly")}
            />
            <Label htmlFor="view-mode" className={`text-sm font-medium whitespace-nowrap ${viewMode === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </Label>
          </div>

          {/* Year Select */}
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[130px] border-2 bg-card border-border">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Select (only in monthly view) */}
          {viewMode === 'monthly' && (
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[150px] border-2 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Advisor Select (only for admin users) */}
          {isAdmin && (
            <Select value={advisorId} onValueChange={setAdvisorId}>
              <SelectTrigger className="w-[180px] border-2 bg-card border-border">
                <UserIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Advisors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Advisors</SelectItem>
                {advisors.map((advisor) => (
                  <SelectItem key={advisor.id} value={advisor.id}>
                    {advisor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-foreground">
            <div className="h-10 w-10 border-4 border-accent border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading sales data…</p>
          </div>
        </div>
      ) : salesData ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card border-2 border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                    <p className="text-3xl font-bold text-foreground tabular-nums">
                      RM {formatNumber(salesData.totalSales)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-accent">
                    <DollarSign className="w-6 h-6 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-2 border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Clients</p>
                    <p className="text-3xl font-bold text-foreground">
                      {salesData.totalClients}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-accent">
                    <Users className="w-6 h-6 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-2 border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Invoices</p>
                    <p className="text-3xl font-bold text-foreground">
                      {salesData.totalInvoices}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-accent">
                    <FileText className="w-6 h-6 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-2 border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg per Invoice</p>
                    <p className="text-3xl font-bold text-foreground tabular-nums">
                      RM{" "}
                      {salesData.totalInvoices > 0
                        ? formatNumber(salesData.totalSales / salesData.totalInvoices)
                        : formatNumber(0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-accent">
                    <TrendingUp className="w-6 h-6 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown for Yearly View */}
          {viewMode === 'yearly' && salesData.monthlyBreakdown && salesData.monthlyBreakdown.length > 0 && (
            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Calendar className="w-5 h-5" />
                  Monthly Sales Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {salesData.monthlyBreakdown.map((monthData) => (
                    <Card 
                      key={monthData.monthIndex} 
                      className={`border-2 ${monthData.sales > 0 ? "border-secondary bg-muted" : "border-border bg-card"}`}
                    >
                      <CardContent className="p-4">
                        <div className="text-sm font-bold mb-2 text-muted-foreground">
                          {monthData.month}
                        </div>
                        <div className="text-2xl font-bold mb-1 text-foreground tabular-nums break-words">
                          RM {formatNumber(monthData.sales)}
                        </div>
                        <div className="text-xs space-y-1 text-muted-foreground">
                          <div>{monthData.invoices} invoices</div>
                          <div>{monthData.clients} clients</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales by Advisor (only for admin users) */}
          {isAdmin && salesData.salesByAdvisor && salesData.salesByAdvisor.length > 0 && (
            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Sales by Advisor</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-foreground">Advisor</TableHead>
                      <TableHead className="text-right font-bold text-foreground">Total Sales</TableHead>
                      <TableHead className="text-center font-bold text-foreground">Invoices</TableHead>
                      <TableHead className="text-center font-bold text-foreground">Clients</TableHead>
                      <TableHead className="text-right font-bold text-foreground">Avg per Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.salesByAdvisor.map((advisor) => (
                      <TableRow key={advisor.advisorId} className="hover:bg-muted">
                        <TableCell className="font-medium text-foreground">
                          {advisor.advisorName}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground tabular-nums">
                          RM {formatNumber(advisor.totalSales)}
                        </TableCell>
                        <TableCell className="text-center text-foreground">
                          {advisor.invoicesCount}
                        </TableCell>
                        <TableCell className="text-center text-foreground">
                          {advisor.clientsCount}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground tabular-nums">
                          RM{" "}
                          {formatNumber(
                            advisor.invoicesCount > 0 ? advisor.totalSales / advisor.invoicesCount : 0
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Invoices Table */}
          <Card className="bg-card border-2 border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">
                  {viewMode === 'yearly' ? `All Invoices (${filteredInvoices.length})` : `Invoices for ${months[parseInt(month)]} ${year} (${filteredInvoices.length})`}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="font-bold whitespace-nowrap text-foreground">Invoice Number</TableHead>
                        <TableHead className="font-bold whitespace-nowrap text-foreground">Type</TableHead>
                        <TableHead className="font-bold whitespace-nowrap text-foreground">Quotation</TableHead>
                        <TableHead className="font-bold whitespace-nowrap text-foreground">Client</TableHead>
                        <TableHead className="font-bold whitespace-nowrap text-foreground">Advisor</TableHead>
                        <TableHead className="text-right font-bold whitespace-nowrap text-foreground">Amount</TableHead>
                        <TableHead className="font-bold whitespace-nowrap text-foreground">Invoice date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => {
                        const badgeColor = invoice.type === 'SO' ? 'bg-green-600' : invoice.type === 'EPO' ? 'bg-yellow-500' : 'bg-blue-500'
                        return (
                          <TableRow key={invoice.id} className="hover:bg-muted">
                            <TableCell className="font-medium text-foreground">
                              {invoice.invoiceNumber}
                            </TableCell>
                            <TableCell>
                              <Badge className={`whitespace-nowrap ${badgeColor} text-white`}>
                                {invoice.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-foreground">
                              {invoice.quotation?.name || 'N/A'}
                            </TableCell>
                            <TableCell className="text-foreground">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {invoice.client?.name || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground">
                              <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                                {invoice.advisors?.map(a => a.name).join(', ') || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-foreground tabular-nums whitespace-nowrap">
                              RM {formatNumber(invoice.amount)}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {new Date(invoice.invoiceDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    {searchTerm ? 'No invoices match your search' : 'No invoices found'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-card border-2 border-border">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No sales data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

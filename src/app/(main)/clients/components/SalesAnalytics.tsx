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

interface SalesAnalyticsProps {
  defaultYear?: number
  defaultMonth?: number
}

export default function SalesAnalytics({ defaultYear, defaultMonth }: SalesAnalyticsProps) {
  const currentDate = new Date()
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly')
  const [year, setYear] = useState<string>(defaultYear?.toString() || currentDate.getFullYear().toString())
  const [month, setMonth] = useState<string>(defaultMonth !== undefined ? defaultMonth.toString() : currentDate.getMonth().toString())
  const [advisorId, setAdvisorId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<any>(null)
  const [advisors, setAdvisors] = useState<Array<{ id: string; name: string; email: string }>>([])

  // Fetch advisors on mount
  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        const data = await getAllAdvisors()
        setAdvisors(data)
      } catch (error) {
        console.error('Error fetching advisors:', error)
      }
    }
    fetchAdvisors()
  }, [])

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
        console.error('Error fetching sales data:', error)
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

  // Filter quotations based on search term
  const filteredQuotations = salesData?.quotations?.filter((quotation: any) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      quotation.name.toLowerCase().includes(searchLower) ||
      quotation.client.name.toLowerCase().includes(searchLower) ||
      quotation.createdBy.name.toLowerCase().includes(searchLower)
    )
  }) || []

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: "#898D74" }} />
          <Input
            placeholder="Search quotations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-2 bg-white"
            style={{ borderColor: "#BDC4A5" }}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 rounded-md" style={{ borderColor: "#BDC4A5" }}>
            <Label htmlFor="view-mode" className="text-sm font-medium whitespace-nowrap" style={{ color: viewMode === "yearly" ? "#202F21" : "#898D74" }}>
              Yearly
            </Label>
            <Switch
              id="view-mode"
              checked={viewMode === "monthly"}
              onCheckedChange={(checked) => setViewMode(checked ? "monthly" : "yearly")}
            />
            <Label htmlFor="view-mode" className="text-sm font-medium whitespace-nowrap" style={{ color: viewMode === "monthly" ? "#202F21" : "#898D74" }}>
              Monthly
            </Label>
          </div>

          {/* Year Select */}
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[130px] border-2 bg-white" style={{ borderColor: "#BDC4A5" }}>
              <Calendar className="h-4 w-4 mr-2" style={{ color: "#898D74" }} />
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
              <SelectTrigger className="w-[150px] border-2 bg-white" style={{ borderColor: "#BDC4A5" }}>
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

          {/* Advisor Select */}
          <Select value={advisorId} onValueChange={setAdvisorId}>
            <SelectTrigger className="w-[180px] border-2 bg-white" style={{ borderColor: "#BDC4A5" }}>
              <UserIcon className="h-4 w-4 mr-2" style={{ color: "#898D74" }} />
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
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3" style={{ color: "#202F21" }}>
            <div className="h-10 w-10 border-4 border-[#BDC4A5] border-t-[#202F21] rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading sales data…</p>
          </div>
        </div>
      ) : salesData ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#898D74" }}>Total Sales</p>
                    <p className="text-3xl font-bold" style={{ color: "#202F21" }}>
                      RM {(salesData.totalSales / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#BDC4A5" }}>
                    <DollarSign className="w-6 h-6" style={{ color: "#202F21" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#898D74" }}>Clients</p>
                    <p className="text-3xl font-bold" style={{ color: "#202F21" }}>
                      {salesData.totalClients}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#BDC4A5" }}>
                    <Users className="w-6 h-6" style={{ color: "#202F21" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#898D74" }}>Quotations</p>
                    <p className="text-3xl font-bold" style={{ color: "#202F21" }}>
                      {salesData.totalQuotations}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#BDC4A5" }}>
                    <FileText className="w-6 h-6" style={{ color: "#202F21" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#898D74" }}>Avg per Quote</p>
                    <p className="text-3xl font-bold" style={{ color: "#202F21" }}>
                      RM {salesData.totalQuotations > 0 ? (salesData.totalSales / salesData.totalQuotations / 1000).toFixed(1) : '0'}K
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#BDC4A5" }}>
                    <TrendingUp className="w-6 h-6" style={{ color: "#202F21" }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown for Yearly View */}
          {viewMode === 'yearly' && salesData.monthlyBreakdown && salesData.monthlyBreakdown.length > 0 && (
            <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: "#202F21" }}>
                  <Calendar className="w-5 h-5" />
                  Monthly Sales Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {salesData.monthlyBreakdown.map((monthData: any) => (
                    <Card 
                      key={monthData.monthIndex} 
                      className="border-2"
                      style={{ 
                        borderColor: monthData.sales > 0 ? "#898D74" : "#BDC4A5",
                        backgroundColor: monthData.sales > 0 ? "#F5F5F0" : "white"
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="text-sm font-bold mb-2" style={{ color: "#898D74" }}>
                          {monthData.month}
                        </div>
                        <div className="text-2xl font-bold mb-1" style={{ color: "#202F21" }}>
                          RM {(monthData.sales / 1000).toFixed(1)}K
                        </div>
                        <div className="text-xs space-y-1" style={{ color: "#898D74" }}>
                          <div>{monthData.quotations} quotes</div>
                          <div>{monthData.clients} clients</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales by Advisor */}
          {salesData.salesByAdvisor && salesData.salesByAdvisor.length > 0 && (
            <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
              <CardHeader>
                <CardTitle style={{ color: "#202F21" }}>Sales by Advisor</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold" style={{ color: "#202F21" }}>Advisor</TableHead>
                      <TableHead className="text-right font-bold" style={{ color: "#202F21" }}>Total Sales</TableHead>
                      <TableHead className="text-center font-bold" style={{ color: "#202F21" }}>Quotations</TableHead>
                      <TableHead className="text-center font-bold" style={{ color: "#202F21" }}>Clients</TableHead>
                      <TableHead className="text-right font-bold" style={{ color: "#202F21" }}>Avg per Quote</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.salesByAdvisor.map((advisor: any) => (
                      <TableRow key={advisor.advisorId} className="hover:bg-gray-50">
                        <TableCell className="font-medium" style={{ color: "#202F21" }}>
                          {advisor.advisorName}
                        </TableCell>
                        <TableCell className="text-right font-bold" style={{ color: "#202F21" }}>
                          RM {(advisor.totalSales / 1000).toFixed(1)}K
                        </TableCell>
                        <TableCell className="text-center" style={{ color: "#202F21" }}>
                          {advisor.quotationsCount}
                        </TableCell>
                        <TableCell className="text-center" style={{ color: "#202F21" }}>
                          {advisor.clientsCount}
                        </TableCell>
                        <TableCell className="text-right font-medium" style={{ color: "#202F21" }}>
                          RM {(advisor.totalSales / advisor.quotationsCount / 1000).toFixed(1)}K
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Quotations Table */}
          <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle style={{ color: "#202F21" }}>
                  {viewMode === 'yearly' ? `All Quotations (${filteredQuotations.length})` : `Quotations for ${months[parseInt(month)]} ${year} (${filteredQuotations.length})`}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {filteredQuotations.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-bold whitespace-nowrap" style={{ color: "#202F21" }}>Quotation Name</TableHead>
                        <TableHead className="font-bold whitespace-nowrap" style={{ color: "#202F21" }}>Client</TableHead>
                        <TableHead className="font-bold whitespace-nowrap" style={{ color: "#202F21" }}>Advisor</TableHead>
                        <TableHead className="text-right font-bold whitespace-nowrap" style={{ color: "#202F21" }}>Amount</TableHead>
                        <TableHead className="text-center font-bold whitespace-nowrap" style={{ color: "#202F21" }}>Status</TableHead>
                        <TableHead className="font-bold whitespace-nowrap" style={{ color: "#202F21" }}>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotations.map((quotation: any) => (
                        <TableRow key={quotation.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium" style={{ color: "#202F21" }}>
                            {quotation.name}
                          </TableCell>
                          <TableCell style={{ color: "#202F21" }}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" style={{ color: "#898D74" }} />
                              {quotation.client.name}
                            </div>
                          </TableCell>
                          <TableCell style={{ color: "#202F21" }}>
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4" style={{ color: "#898D74" }} />
                              {quotation.createdBy.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold" style={{ color: "#202F21" }}>
                            RM {(quotation.totalPrice / 1000).toFixed(1)}K
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className="whitespace-nowrap"
                              style={{ 
                                backgroundColor: quotation.paymentStatus === 'fully_paid' ? '#4CAF50' : 
                                                quotation.paymentStatus === 'deposit_paid' ? '#FFC107' : '#898D74',
                                color: 'white'
                              }}
                            >
                              {quotation.paymentStatus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </Badge>
                          </TableCell>
                          <TableCell style={{ color: "#202F21" }}>
                            {new Date(quotation.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: "#898D74" }} />
                  <p className="text-lg" style={{ color: "#898D74" }}>
                    {searchTerm ? 'No quotations match your search' : 'No quotations found'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-white border-2" style={{ borderColor: "#BDC4A5" }}>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: "#898D74" }} />
            <p className="text-lg" style={{ color: "#898D74" }}>No sales data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

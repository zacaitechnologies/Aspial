"use server"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { getCachedUser } from "@/lib/auth-cache"
import { formatLocalDate } from "@/lib/date-utils"
import { unstable_noStore, unstable_cache, revalidateTag } from "next/cache"

export interface MonthlyPerformance {
  month: string
  sales: number
  level: number
  stars: number
  year: number
}

export interface EmployeeSalesData {
  userId: string
  userName: string
  currentYearlySales: number
  currentMonthlySales: number
  monthlyData: MonthlyPerformance[]
  currentLevel: number
  commissionRate: string
}

export type ComplaintData = {
  date: string
  customer: string | null
  reason: string | null
}

// Tier targets based on new company policy (monthly targets)
const tierTargets = {
  TIER_1: { min: 50000, max: 70000 }, // User fills in their own target within range
  TIER_2: 80000,
  TIER_3: 120000,
  TIER_4: 150000,
}

// Legacy sales targets (kept for backwards compatibility if needed)
const salesTargets = {
  level1: 720000, // 720K yearly / 60K monthly
  level2: 1200000, // 1.20M yearly / 100K monthly
  level3: 2100000, // 2.10M yearly / 175K monthly
  level4: 3360000, // 3.36M yearly / 280K monthly
}

const monthlySalesTargets = {
  level1: 60000,
  level2: 100000,
  level3: 175000,
  level4: 280000,
}

// Determine level based on sales
function calculateLevel(sales: number, isMonthly: boolean = false): number {
  const targets = isMonthly ? monthlySalesTargets : salesTargets
  
  if (sales >= targets.level4) return 4
  if (sales >= targets.level3) return 3
  if (sales >= targets.level2) return 2
  if (sales >= targets.level1) return 1
  return 0
}

// Get commission rate - fixed at 3% for all tiers
function getCommissionRate(level: number): string {
  return "3%"
}

// Calculate stars: 1 star if monthly sales >= 100K (legacy, not used in new tier system)
function calculateStars(monthlySales: number): number {
  return monthlySales >= 100000 ? 1 : 0
}

// Get tier monthly target (with custom target support for Tier 1)
function getTierMonthlyTarget(tier: string, customTarget?: number): number {
  switch (tier) {
    case 'TIER_1':
      return customTarget || 60000 // Use custom target if provided, otherwise default
    case 'TIER_2':
      return tierTargets.TIER_2
    case 'TIER_3':
      return tierTargets.TIER_3
    case 'TIER_4':
      return tierTargets.TIER_4
    default:
      return 60000
  }
}

// Internal function - not cached, used by cached version
async function _getEmployeeSalesDataInternal(
  userId: string,
  year: number = new Date().getFullYear(),
  month?: number
): Promise<EmployeeSalesData> {
  // Fetch user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      supabase_id: true,
      firstName: true,
      lastName: true,
    },
  })

  if (!user) {
    throw new Error("User not found")
  }

    // Check if user is operation-user - if so, filter by project permissions
    const { isUserOperationUser } = await import("../projects/permissions")
    const isOperationUser = await isUserOperationUser(user.supabase_id)
    
    // Determine date range based on parameters
    let startDate: Date
    let endDate: Date

    if (month !== undefined) {
      // Specific month
      startDate = new Date(year, month, 1)
      endDate = new Date(year, month + 1, 0, 23, 59, 59)
    } else {
      // Full year
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31, 23, 59, 59)
    }

    // Build where clause for invoices based on user role (sales attributed by invoice document date)
    const whereClause: Prisma.InvoiceWhereInput = {
      status: "active", // Exclude cancelled invoices
      invoiceDate: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (isOperationUser) {
      // For operation-users: filter by project permissions
      const userProjects = await prisma.projectPermission.findMany({
        where: { 
          userId: user.supabase_id,
          canView: true
        },
        select: { projectId: true }
      })
      const projectIds = userProjects.map(p => p.projectId)
      
      if (projectIds.length === 0) {
        // User has no projects, return empty data
        return {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          currentYearlySales: 0,
          currentMonthlySales: 0,
          monthlyData: Array.from({ length: 12 }, (_, i) => ({
            month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
            sales: 0,
            level: 0,
            stars: 0,
            year: year,
          })),
          currentLevel: 0,
          commissionRate: "3%", // Fixed at 3% for all tiers
        }
      }
      
      // Filter invoices by quotation's project IDs
      whereClause.quotation = {
        projectId: { in: projectIds }
      }
    } else {
      // For admin and brand-advisor: filter by quotation advisedById (User.id cuid)
      whereClause.quotation = {
        advisedById: user.id
      }
    }

    // Fetch invoices for the selected period
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        invoiceDate: true,
        quotation: {
          select: {
            id: true,
            advisedById: true,
            projectId: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    })

    // Group invoices by month
    const monthlyDataMap: Map<string, { sales: number; month: string; monthIndex: number; year: number }> = new Map()
    
    // Initialize all 12 months
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for (let i = 0; i < 12; i++) {
      const key = `${year}-${i}`
      monthlyDataMap.set(key, {
        month: monthNames[i],
        sales: 0,
        monthIndex: i,
        year: year,
      })
    }

    // Aggregate sales by month from invoices
    invoices.forEach((invoice) => {
      const date = new Date(invoice.invoiceDate)
      const monthIndex = date.getMonth()
      const year = date.getFullYear()
      const key = `${year}-${monthIndex}`

      if (monthlyDataMap.has(key)) {
        const monthData = monthlyDataMap.get(key)!
        monthData.sales += invoice.amount
      }
    })

    // Convert map to array with calculated levels and stars
    const monthlyData: MonthlyPerformance[] = Array.from(monthlyDataMap.values())
      .sort((a, b) => a.monthIndex - b.monthIndex)
      .map((data) => ({
        month: data.month,
        sales: data.sales,
        level: calculateLevel(data.sales, true),
        stars: calculateStars(data.sales),
        year: data.year,
      }))

    // Calculate total yearly sales from invoices
    const currentYearlySales = invoices.reduce((sum, inv) => sum + inv.amount, 0)

    // Calculate current month sales
    const currentMonth = new Date().getMonth()
    const currentMonthData = monthlyData[currentMonth]
    const currentMonthlySales = currentMonthData ? currentMonthData.sales : 0

    // Determine current level based on yearly sales
    const currentLevel = calculateLevel(currentYearlySales, false)
    const commissionRate = getCommissionRate(currentLevel)

  return {
    userId: user.id,
    userName: `${user.firstName} ${user.lastName}`,
    currentYearlySales,
    currentMonthlySales,
    monthlyData,
    currentLevel,
    commissionRate,
  }
}

export async function getEmployeeSalesData(
  userId: string,
  year: number = new Date().getFullYear(),
  month?: number
): Promise<EmployeeSalesData> {
  try {
    // Disable server-side caching for real-time data
    unstable_noStore()

    // Return fresh data without server-side caching
    return await _getEmployeeSalesDataInternal(userId, year, month)
  } catch (error) {
    console.error("Error fetching employee sales data:", error)
    throw error
  }
}

// Internal function - not cached, used by cached version
async function _getEmployeeComplaintsInternal(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })

  if (!user) {
    return []
  }

  // Get current year complaints
  const currentYear = new Date().getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)

  const complaints = await prisma.complaint.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
    select: {
      date: true,
      customer: true,
      reason: true,
    },
    orderBy: {
      date: "desc",
    },
  })

  return complaints.map((complaint) => ({
    date: formatLocalDate(new Date(complaint.date)),
    customer: complaint.customer,
    reason: complaint.reason,
  }))
}

// Get complaints data from database
export async function getEmployeeComplaints(userId: string) {
  try {
    // Disable server-side caching for real-time data
    unstable_noStore()

    // Return fresh data without server-side caching
    return await _getEmployeeComplaintsInternal(userId)
  } catch (error) {
    console.error("Error fetching complaints:", error)
    return []
  }
}

// Calculate stars after complaints deduction
export async function calculateFinalStars(userId: string): Promise<{ totalStars: number; starsAfterComplaints: number }> {
  const salesData = await getEmployeeSalesData(userId)
  const complaints = await getEmployeeComplaints(userId)
  
  const totalStars = salesData.monthlyData.reduce((sum, month) => sum + month.stars, 0)
  const starsAfterComplaints = totalStars - complaints.length

  return {
    totalStars,
    starsAfterComplaints,
  }
}

// ===== NEW TIER SELECTION SYSTEM =====

// Get user's tier selection for a specific year
export async function getUserTierSelection(
  userId: string, 
  year?: number
): Promise<{ tier: string | null; customTarget: number | null; needsSelection: boolean; selectedAt: Date | null }> {
  try {
    unstable_noStore()
    const currentYear = year || new Date().getFullYear()
    
    const selection = await prisma.tierSelection.findUnique({
      where: {
        userId_year: {
          userId,
          year: currentYear,
        },
      },
    })

    return {
      tier: selection?.tier || null,
      customTarget: selection?.customTarget || null,
      needsSelection: !selection,
      selectedAt: selection?.selectedAt || null,
    }
  } catch (error) {
    console.error('Error getting user tier selection:', error)
    return {
      tier: null,
      customTarget: null,
      needsSelection: true,
      selectedAt: null,
    }
  }
}

// User: Select tier for the year (can only be done once unless admin overrides)
export async function selectUserTier(
  userId: string, 
  tier: string, 
  customTarget?: number,
  year?: number
): Promise<{ success: boolean; message: string }> {
  try {
    const currentYear = year || new Date().getFullYear()
    
    // Check if selection already exists
    const existing = await prisma.tierSelection.findUnique({
      where: {
        userId_year: {
          userId,
          year: currentYear,
        },
      },
    })

    if (existing) {
      return {
        success: false,
        message: 'Tier selection already exists for this year. Contact admin to change.',
      }
    }

    // Validate tier
    if (!['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'].includes(tier)) {
      return {
        success: false,
        message: 'Invalid tier selected',
      }
    }

    // Validate custom target for Tier 1
    if (tier === 'TIER_1') {
      if (!customTarget || customTarget < 50000 || customTarget > 70000) {
        return {
          success: false,
          message: 'Tier 1 requires a custom target between RM50,000 and RM70,000',
        }
      }
    }

    // Create selection
    await prisma.tierSelection.create({
      data: {
        userId,
        year: currentYear,
        tier: tier as any,
        customTarget: tier === 'TIER_1' ? customTarget : null,
        adminOverride: false,
      },
    })

    revalidateTag(`tier-selection-${userId}`, 'max')
    revalidateTag(`tier-selection-${userId}-${currentYear}`, 'max')
    revalidateTag('benefits', 'max')

    return {
      success: true,
      message: `Tier ${tier.replace('TIER_', '')} selected successfully for ${currentYear}`,
    }
  } catch (error) {
    console.error('Error selecting user tier:', error)
    return {
      success: false,
      message: 'Failed to select tier',
    }
  }
}

// Admin: Change user's tier selection
export async function adminChangeTierSelection(
  userId: string, 
  tier: string, 
  adminNote: string, 
  customTarget?: number,
  year?: number
): Promise<{ success: boolean; message: string }> {
  try {
    const currentYear = year || new Date().getFullYear()
    
    // Validate tier
    if (!['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'].includes(tier)) {
      return {
        success: false,
        message: 'Invalid tier selected',
      }
    }

    // Validate custom target for Tier 1
    if (tier === 'TIER_1') {
      if (!customTarget || customTarget < 50000 || customTarget > 70000) {
        return {
          success: false,
          message: 'Tier 1 requires a custom target between RM50,000 and RM70,000',
        }
      }
    }

    // Upsert selection with admin override
    await prisma.tierSelection.upsert({
      where: {
        userId_year: {
          userId,
          year: currentYear,
        },
      },
      create: {
        userId,
        year: currentYear,
        tier: tier as any,
        customTarget: tier === 'TIER_1' ? customTarget : null,
        adminOverride: true,
        adminNote,
      },
      update: {
        tier: tier as any,
        customTarget: tier === 'TIER_1' ? customTarget : null,
        adminOverride: true,
        adminNote,
      },
    })

    revalidateTag(`tier-selection-${userId}`, 'max')
    revalidateTag(`tier-selection-${userId}-${currentYear}`, 'max')
    revalidateTag('benefits', 'max')

    return {
      success: true,
      message: `Tier changed to ${tier.replace('TIER_', '')} for ${currentYear}`,
    }
  } catch (error) {
    console.error('Error changing tier selection:', error)
    return {
      success: false,
      message: 'Failed to change tier',
    }
  }
}

// Check if user is admin
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const userWithRoles = await prisma.user.findUnique({
      where: { supabase_id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!userWithRoles) {
      return false
    }

    return userWithRoles.userRoles.some((userRole) => userRole.role.slug === 'admin')
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Admin: Get all users' sales data and tier selection status
export interface UserBenefitsSummary {
  userId: string
  userName: string
  email: string
  profilePicture: string | null
  currentYearlySales: number
  currentLevel: number
  commissionRate: string
  totalStars: number
  complaintsCount: number
  starsAfterComplaints: number
  selectedTier: string | null
  customTarget: number | null
  tierMonthlyTarget: number
  needsTierSelection: boolean
}

// Internal function - batched queries to avoid N+1
async function _getAllUsersBenefitsInternal(year: number = new Date().getFullYear()): Promise<UserBenefitsSummary[]> {
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31, 23, 59, 59)

  const users = await prisma.user.findMany({
    where: {
      userRoles: {
        some: { role: { slug: 'brand-advisor' } },
      },
    },
    select: {
      id: true,
      supabase_id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePicture: true,
    },
    orderBy: { firstName: 'asc' },
  })

  if (users.length === 0) return []

  const userIds = users.map((u) => u.id)

  const [invoices, complaints, tierSelections] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        status: 'active',
        invoiceDate: { gte: startOfYear, lte: endOfYear },
        quotation: { advisedById: { in: userIds } },
      },
      select: {
        amount: true,
        invoiceDate: true,
        quotation: { select: { advisedById: true } },
      },
    }),
    prisma.complaint.findMany({
      where: {
        userId: { in: userIds },
        date: { gte: startOfYear, lte: endOfYear },
      },
      select: { userId: true },
    }),
    prisma.tierSelection.findMany({
      where: { userId: { in: userIds }, year },
    }),
  ])

  const salesByUserId = new Map<string, { yearly: number; byMonth: number[] }>()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  userIds.forEach((id) => {
    salesByUserId.set(id, { yearly: 0, byMonth: Array(12).fill(0) })
  })
  invoices.forEach((inv) => {
    const advisedById = inv.quotation?.advisedById
    if (!advisedById) return
    const entry = salesByUserId.get(advisedById)
    if (!entry) return
    const d = new Date(inv.invoiceDate)
    if (d.getFullYear() === year) {
      entry.byMonth[d.getMonth()] += inv.amount
      entry.yearly += inv.amount
    }
  })

  const complaintsByUserId = new Map<string, number>()
  userIds.forEach((id) => complaintsByUserId.set(id, 0))
  complaints.forEach((c) => {
    complaintsByUserId.set(c.userId, (complaintsByUserId.get(c.userId) ?? 0) + 1)
  })

  const tierByUserId = new Map<string, { tier: string | null; customTarget: number | null }>()
  tierSelections.forEach((t) => {
    tierByUserId.set(t.userId, { tier: t.tier, customTarget: t.customTarget })
  })

  return users.map((user) => {
    const sales = salesByUserId.get(user.id) ?? { yearly: 0, byMonth: Array(12).fill(0) }
    const complaintsCount = complaintsByUserId.get(user.id) ?? 0
    const tier = tierByUserId.get(user.id)
    const tierMonthlyTarget = getTierMonthlyTarget(tier?.tier ?? 'TIER_1', tier?.customTarget ?? undefined)
    const monthlyData = sales.byMonth.map((salesVal, i) => ({
      month: monthNames[i],
      sales: salesVal,
      level: calculateLevel(salesVal, true),
      stars: calculateStars(salesVal),
      year,
    }))
    const totalStars = monthlyData.reduce((sum, m) => sum + m.stars, 0)
    const starsAfterComplaints = Math.max(0, totalStars - complaintsCount)
    return {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      profilePicture: user.profilePicture,
      currentYearlySales: sales.yearly,
      currentLevel: calculateLevel(sales.yearly, false),
      commissionRate: '3%',
      totalStars,
      complaintsCount,
      starsAfterComplaints,
      selectedTier: tier?.tier ?? null,
      customTarget: tier?.customTarget ?? null,
      tierMonthlyTarget,
      needsTierSelection: !tier?.tier,
    }
  })
}

export async function getAllUsersBenefits(year: number = new Date().getFullYear()): Promise<UserBenefitsSummary[]> {
  try {
    await getCachedUser()
    return await unstable_cache(
      () => _getAllUsersBenefitsInternal(year),
      ['benefits', 'all-users', String(year)],
      { revalidate: 60, tags: ['benefits'] }
    )()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching all users benefits:', error)
    }
    return []
  }
}

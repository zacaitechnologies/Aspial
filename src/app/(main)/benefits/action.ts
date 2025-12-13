"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_noStore, revalidateTag } from "next/cache"

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

// Get commission rate based on level
function getCommissionRate(level: number): string {
  if (level >= 4) return "12%"
  if (level >= 3) return "10%"
  if (level >= 2) return "8%"
  if (level >= 1) return "5%"
  return "0%"
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

    // Fetch quotations for the selected period
    const quotations = await prisma.quotation.findMany({
      where: {
        createdById: user.supabase_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        workflowStatus: {
          in: ["final", "accepted"],
        },
        paymentStatus: {
          in: ["partially_paid", "deposit_paid", "fully_paid"],
        },
      },
      select: {
        id: true,
        totalPrice: true,
        created_at: true,
        workflowStatus: true,
      },
      orderBy: {
        created_at: "asc",
      },
    })

    // Group quotations by month
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

    // Aggregate sales by month
    quotations.forEach((quotation) => {
      const date = new Date(quotation.created_at)
      const monthIndex = date.getMonth()
      const year = date.getFullYear()
      const key = `${year}-${monthIndex}`

      if (monthlyDataMap.has(key)) {
        const monthData = monthlyDataMap.get(key)!
        monthData.sales += quotation.totalPrice
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

    // Calculate total yearly sales
    const currentYearlySales = quotations.reduce((sum, q) => sum + q.totalPrice, 0)

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
    date: complaint.date.toISOString().split("T")[0],
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

// Internal function - not cached, used by cached version
async function _getAllUsersBenefitsInternal(year: number = new Date().getFullYear()): Promise<UserBenefitsSummary[]> {
  // Get all non-admin users
  const users = await prisma.user.findMany({
    where: {
      userRoles: {
        none: {
          role: {
            slug: 'admin',
          },
        },
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
    orderBy: {
      firstName: 'asc',
    },
  })

  // Fetch data for each user in parallel (all three calls per user are parallelized)
  const usersBenefitsPromises = users.map(async (user) => {
    try {
      // Execute all three calls in parallel for each user
      const [salesData, complaints, tierSelection] = await Promise.all([
        getEmployeeSalesData(user.id, year),
        getEmployeeComplaints(user.id),
        getUserTierSelection(user.id, year),
      ])

      const totalStars = salesData.monthlyData.reduce((sum, month) => sum + month.stars, 0)
      const starsAfterComplaints = totalStars - complaints.length
      
      // Calculate tier monthly target
      const tierMonthlyTarget = getTierMonthlyTarget(tierSelection.tier || 'TIER_1', tierSelection.customTarget || undefined)

      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        profilePicture: user.profilePicture,
        currentYearlySales: salesData.currentYearlySales,
        currentLevel: salesData.currentLevel,
        commissionRate: salesData.commissionRate,
        totalStars,
        complaintsCount: complaints.length,
        starsAfterComplaints,
        selectedTier: tierSelection.tier,
        customTarget: tierSelection.customTarget,
        tierMonthlyTarget,
        needsTierSelection: tierSelection.needsSelection,
      }
    } catch (error) {
      console.error(`Error fetching benefits for user ${user.id}:`, error)
      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        profilePicture: user.profilePicture,
        currentYearlySales: 0,
        currentLevel: 0,
        commissionRate: '0%',
        totalStars: 0,
        complaintsCount: 0,
        starsAfterComplaints: 0,
        selectedTier: null,
        customTarget: null,
        tierMonthlyTarget: 60000,
        needsTierSelection: true,
      }
    }
  })

  return await Promise.all(usersBenefitsPromises)
}

export async function getAllUsersBenefits(year: number = new Date().getFullYear()): Promise<UserBenefitsSummary[]> {
  try {
    // Disable server-side caching for real-time data
    unstable_noStore()

    // Use cached auth - deduplicates within same request
    await getCachedUser()

    // Return fresh data without server-side caching
    return await _getAllUsersBenefitsInternal(year)
  } catch (error) {
    console.error('Error fetching all users benefits:', error)
    return []
  }
}

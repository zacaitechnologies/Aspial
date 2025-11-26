"use server"

import { prisma } from "@/lib/prisma"
import { getCachedUser } from "@/lib/auth-cache"
import { unstable_cache } from "next/cache"

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

// Sales targets based on company policy
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

// Calculate stars: 1 star if monthly sales >= 100K
function calculateStars(monthlySales: number): number {
  return monthlySales >= 100000 ? 1 : 0
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
    const cacheKey = `employee-sales-${userId}-${year}${month !== undefined ? `-${month}` : ''}`
    
    // Cache for 60 seconds
    return await unstable_cache(
      async () => _getEmployeeSalesDataInternal(userId, year, month),
      [cacheKey],
      {
        revalidate: 60,
        tags: ['employee-sales', `employee-sales-${userId}`],
      }
    )()
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
    const cacheKey = `employee-complaints-${userId}`
    
    // Cache for 60 seconds
    return await unstable_cache(
      async () => _getEmployeeComplaintsInternal(userId),
      [cacheKey],
      {
        revalidate: 60,
        tags: ['employee-complaints', `employee-complaints-${userId}`],
      }
    )()
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

// Internal function - not cached, used by cached version
async function _checkSuperPerformanceAwardInternal(userId: string): Promise<{ hasSuperPerformanceAward: boolean; previousYearStars: number; manualOverride: boolean }> {
  // Check for manual override first
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      superPerformanceAwardActive: true,
    },
  })

  // If there's a manual override (admin activated/deactivated), use that
  if (user && user.superPerformanceAwardActive !== null) {
    const previousYear = new Date().getFullYear() - 1
    // Execute both calls in parallel
    const [previousYearSalesData, previousYearComplaints] = await Promise.all([
      getEmployeeSalesData(userId, previousYear),
      getEmployeeComplaints(userId),
    ])
    
    const totalStars = previousYearSalesData.monthlyData.reduce((sum, month) => sum + month.stars, 0)
    
    const previousYearStart = new Date(previousYear, 0, 1)
    const previousYearEnd = new Date(previousYear, 11, 31, 23, 59, 59)
    
    const previousYearComplaintsCount = previousYearComplaints.filter(complaint => {
      const complaintDate = new Date(complaint.date)
      return complaintDate >= previousYearStart && complaintDate <= previousYearEnd
    }).length
    
    const previousYearStars = totalStars - previousYearComplaintsCount

    return {
      hasSuperPerformanceAward: user.superPerformanceAwardActive,
      previousYearStars,
      manualOverride: true,
    }
  }

  const previousYear = new Date().getFullYear() - 1
  
  // Execute both calls in parallel
  const [previousYearSalesData, previousYearComplaints] = await Promise.all([
    getEmployeeSalesData(userId, previousYear),
    getEmployeeComplaints(userId),
  ])
  
  // Calculate total stars from previous year
  const totalStars = previousYearSalesData.monthlyData.reduce((sum, month) => sum + month.stars, 0)
  
  // Filter complaints for previous year only
  const currentYear = new Date().getFullYear()
  const previousYearStart = new Date(previousYear, 0, 1)
  const previousYearEnd = new Date(previousYear, 11, 31, 23, 59, 59)
  
  const previousYearComplaintsCount = previousYearComplaints.filter(complaint => {
    const complaintDate = new Date(complaint.date)
    return complaintDate >= previousYearStart && complaintDate <= previousYearEnd
  }).length
  
  const previousYearStars = totalStars - previousYearComplaintsCount
  
  // Super performance award requires 12 or more stars
  const hasSuperPerformanceAward = previousYearStars >= 12

  return {
    hasSuperPerformanceAward,
    previousYearStars,
    manualOverride: false,
  }
}

// Check if user has super performance award (based on previous year)
export async function checkSuperPerformanceAward(userId: string): Promise<{ hasSuperPerformanceAward: boolean; previousYearStars: number; manualOverride: boolean }> {
  try {
    const cacheKey = `super-performance-award-${userId}`
    
    // Cache for 60 seconds
    return await unstable_cache(
      async () => _checkSuperPerformanceAwardInternal(userId),
      [cacheKey],
      {
        revalidate: 60,
        tags: ['super-performance-award', `super-performance-award-${userId}`],
      }
    )()
  } catch (error) {
    console.error("Error checking super performance award:", error)
    return {
      hasSuperPerformanceAward: false,
      previousYearStars: 0,
      manualOverride: false,
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

// Admin: Get all users' sales data and award status
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
  hasSuperPerformanceAward: boolean
  previousYearStars: number
  manualOverride: boolean
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
      const [salesData, complaints, awardStatus] = await Promise.all([
        getEmployeeSalesData(user.id, year),
        getEmployeeComplaints(user.id),
        checkSuperPerformanceAward(user.id),
      ])

      const totalStars = salesData.monthlyData.reduce((sum, month) => sum + month.stars, 0)
      const starsAfterComplaints = totalStars - complaints.length

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
        hasSuperPerformanceAward: awardStatus.hasSuperPerformanceAward,
        previousYearStars: awardStatus.previousYearStars,
        manualOverride: awardStatus.manualOverride,
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
        hasSuperPerformanceAward: false,
        previousYearStars: 0,
        manualOverride: false,
      }
    }
  })

  return await Promise.all(usersBenefitsPromises)
}

export async function getAllUsersBenefits(year: number = new Date().getFullYear()): Promise<UserBenefitsSummary[]> {
  try {
    // Use cached auth - deduplicates within same request
    await getCachedUser()

    // Cache key based on year
    const cacheKey = `all-users-benefits-${year}`
    
    // Cache for 60 seconds - benefits data changes less frequently
    return await unstable_cache(
      async () => _getAllUsersBenefitsInternal(year),
      [cacheKey],
      {
        revalidate: 60, // 60 seconds
        tags: ['benefits', `benefits-${year}`],
      }
    )()
  } catch (error) {
    console.error('Error fetching all users benefits:', error)
    return []
  }
}

// Admin: Manually activate super performance award
export async function activateSuperPerformanceAward(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        superPerformanceAwardActive: true,
      },
    })

    return {
      success: true,
      message: 'Super Performance Award activated successfully',
    }
  } catch (error) {
    console.error('Error activating super performance award:', error)
    return {
      success: false,
      message: 'Failed to activate Super Performance Award',
    }
  }
}

// Admin: Manually terminate super performance award
export async function terminateSuperPerformanceAward(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        superPerformanceAwardActive: false,
      },
    })

    return {
      success: true,
      message: 'Super Performance Award terminated successfully',
    }
  }  catch (error) {
    console.error('Error terminating super performance award:', error)
    return {
      success: false,
      message: 'Failed to terminate Super Performance Award',
    }
  }
}

// Admin: Reset super performance award to auto (based on performance)
export async function resetSuperPerformanceAward(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        superPerformanceAwardActive: null,
      },
    })

    return {
      success: true,
      message: 'Super Performance Award reset to automatic',
    }
  } catch (error) {
    console.error('Error resetting super performance award:', error)
    return {
      success: false,
      message: 'Failed to reset Super Performance Award',
    }
  }
}

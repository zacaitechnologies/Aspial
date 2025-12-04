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

// Internal function - not cached, used by cached version
// year parameter: the year to check the award for (award is based on previous year's performance)
async function _checkSuperPerformanceAwardInternal(userId: string, year?: number): Promise<{ hasSuperPerformanceAward: boolean; previousYearStars: number; manualOverride: boolean }> {
  const currentYear = year || new Date().getFullYear()
  const previousYear = currentYear - 1
  
  // Check if there's a record in the new table for this year
  const awardRecord = await prisma.superPerformanceAward.findUnique({
    where: {
      userId_year: {
        userId,
        year: currentYear,
      },
    },
  })

  // Calculate previous year stars for display (needed regardless of whether record exists)
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

  // If there's a record (manual override or previously set), use that
  if (awardRecord) {
    return {
      hasSuperPerformanceAward: awardRecord.hasAward,
      previousYearStars,
      manualOverride: awardRecord.manualOverride,
    }
  }

  // No record exists - show as having no award
  return {
    hasSuperPerformanceAward: false,
    previousYearStars,
    manualOverride: false,
  }
}

// Check if user has super performance award (based on previous year)
// year parameter: the year to check the award for (defaults to current year)
export async function checkSuperPerformanceAward(userId: string, year?: number): Promise<{ hasSuperPerformanceAward: boolean; previousYearStars: number; manualOverride: boolean }> {
  try {
    // Disable server-side caching for real-time data
    unstable_noStore()

    const currentYear = year || new Date().getFullYear()
    
    // Return fresh data without server-side caching
    return await _checkSuperPerformanceAwardInternal(userId, currentYear)
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
      // Note: Award for a year is based on previous year's performance
      const [salesData, complaints, awardStatus] = await Promise.all([
        getEmployeeSalesData(user.id, year),
        getEmployeeComplaints(user.id),
        checkSuperPerformanceAward(user.id, year),
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

// Admin: Manually activate super performance award for a specific year
export async function activateSuperPerformanceAward(userId: string, year?: number): Promise<{ success: boolean; message: string }> {
  try {
    const currentYear = year || new Date().getFullYear()
    
    // Upsert the award record for this year
    await prisma.superPerformanceAward.upsert({
      where: {
        userId_year: {
          userId,
          year: currentYear,
        },
      },
      create: {
        userId,
        year: currentYear,
        hasAward: true,
        manualOverride: true,
      },
      update: {
        hasAward: true,
        manualOverride: true,
      },
    })

    // Invalidate all relevant caches
    revalidateTag(`super-performance-award-${userId}`, 'max')
    revalidateTag(`super-performance-award-${userId}-${currentYear}`, 'max')
    revalidateTag('super-performance-award', 'max')
    revalidateTag('benefits', 'max')
    revalidateTag(`benefits-${currentYear}`, 'max')
    // Also invalidate previous year in case viewing that
    revalidateTag(`benefits-${currentYear - 1}`, 'max')

    return {
      success: true,
      message: `Super Performance Award activated successfully for ${currentYear}`,
    }
  } catch (error) {
    console.error('Error activating super performance award:', error)
    return {
      success: false,
      message: 'Failed to activate Super Performance Award',
    }
  }
}

// Admin: Manually terminate super performance award for a specific year
export async function terminateSuperPerformanceAward(userId: string, year?: number): Promise<{ success: boolean; message: string }> {
  try {
    const currentYear = year || new Date().getFullYear()
    
    // Upsert the award record for this year
    await prisma.superPerformanceAward.upsert({
      where: {
        userId_year: {
          userId,
          year: currentYear,
        },
      },
      create: {
        userId,
        year: currentYear,
        hasAward: false,
        manualOverride: true,
      },
      update: {
        hasAward: false,
        manualOverride: true,
      },
    })

    // Invalidate all relevant caches
    revalidateTag(`super-performance-award-${userId}`, 'max')
    revalidateTag(`super-performance-award-${userId}-${currentYear}`, 'max')
    revalidateTag('super-performance-award', 'max')
    revalidateTag('benefits', 'max')
    revalidateTag(`benefits-${currentYear}`, 'max')
    // Also invalidate previous year in case viewing that
    revalidateTag(`benefits-${currentYear - 1}`, 'max')

    return {
      success: true,
      message: `Super Performance Award terminated successfully for ${currentYear}`,
    }
  }  catch (error) {
    console.error('Error terminating super performance award:', error)
    return {
      success: false,
      message: 'Failed to terminate Super Performance Award',
    }
  }
}

// Admin: Reset super performance award to auto (based on performance) for a specific year
export async function resetSuperPerformanceAward(userId: string, year?: number): Promise<{ success: boolean; message: string }> {
  try {
    const currentYear = year || new Date().getFullYear()
    
    // Delete the record to remove manual override - user will show as having no award
    await prisma.superPerformanceAward.delete({
      where: {
        userId_year: {
          userId,
          year: currentYear,
        },
      },
    }).catch(() => {
      // If record doesn't exist, that's fine - user already shows as having no award
    })

    // Invalidate all relevant caches
    revalidateTag(`super-performance-award-${userId}`, 'max')
    revalidateTag(`super-performance-award-${userId}-${currentYear}`, 'max')
    revalidateTag('super-performance-award', 'max')
    revalidateTag('benefits', 'max')
    revalidateTag(`benefits-${currentYear}`, 'max')
    // Also invalidate previous year in case viewing that
    revalidateTag(`benefits-${currentYear - 1}`, 'max')

    return {
      success: true,
      message: `Super Performance Award reset to automatic for ${currentYear}`,
    }
  } catch (error) {
    console.error('Error resetting super performance award:', error)
    return {
      success: false,
      message: 'Failed to reset Super Performance Award',
    }
  }
}

// Auto-calculate and create super performance awards for all users based on previous year's performance
// This should be called on January 1st of each year
export async function calculateAndCreateSuperPerformanceAwards(year?: number): Promise<{ success: boolean; message: string; awardsCreated: number; awardsActivated: number }> {
  try {
    const currentYear = year || new Date().getFullYear()
    const previousYear = currentYear - 1
    
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
      },
    })

    let awardsCreated = 0
    let awardsActivated = 0

    // Process each user
    for (const user of users) {
      try {
        // Check if award record already exists for this year
        const existingAward = await prisma.superPerformanceAward.findUnique({
          where: {
            userId_year: {
              userId: user.id,
              year: currentYear,
            },
          },
        })

        // Skip if record exists (to preserve manual overrides)
        if (existingAward) {
          continue
        }

        // Calculate previous year's performance
        const [previousYearSalesData, previousYearComplaints] = await Promise.all([
          getEmployeeSalesData(user.id, previousYear),
          getEmployeeComplaints(user.id),
        ])

        const totalStars = previousYearSalesData.monthlyData.reduce((sum, month) => sum + month.stars, 0)

        const previousYearStart = new Date(previousYear, 0, 1)
        const previousYearEnd = new Date(previousYear, 11, 31, 23, 59, 59)

        const previousYearComplaintsCount = previousYearComplaints.filter(complaint => {
          const complaintDate = new Date(complaint.date)
          return complaintDate >= previousYearStart && complaintDate <= previousYearEnd
        }).length

        const previousYearStars = totalStars - previousYearComplaintsCount

        // Create award record - hasAward is true if 12+ stars, false otherwise
        const hasAward = previousYearStars >= 12

        await prisma.superPerformanceAward.create({
          data: {
            userId: user.id,
            year: currentYear,
            hasAward,
            manualOverride: false, // Auto-calculated, not manual
          },
        })

        awardsCreated++
        if (hasAward) {
          awardsActivated++
        }
      } catch (error) {
        console.error(`Error processing award for user ${user.id}:`, error)
        // Continue with next user
      }
    }

    // Invalidate all benefits caches
    revalidateTag('super-performance-award', 'max')
    revalidateTag('benefits', 'max')
    revalidateTag(`benefits-${currentYear}`, 'max')
    revalidateTag(`benefits-${previousYear}`, 'max')

    return {
      success: true,
      message: `Super Performance Awards calculated for ${currentYear}. Created ${awardsCreated} records, ${awardsActivated} awards activated.`,
      awardsCreated,
      awardsActivated,
    }
  } catch (error) {
    console.error('Error calculating super performance awards:', error)
    return {
      success: false,
      message: 'Failed to calculate Super Performance Awards',
      awardsCreated: 0,
      awardsActivated: 0,
    }
  }
}

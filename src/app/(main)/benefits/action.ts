"use server"

import { prisma } from "@/lib/prisma"

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

export async function getEmployeeSalesData(
  userId: string,
  year: number = new Date().getFullYear(),
  month?: number
): Promise<EmployeeSalesData> {
  try {
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
  } catch (error) {
    console.error("Error fetching employee sales data:", error)
    throw error
  }
}

// Get complaints data from database
export async function getEmployeeComplaints(userId: string) {
  try {
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

// Check if user has super performance award (based on previous year)
export async function checkSuperPerformanceAward(userId: string): Promise<{ hasSuperPerformanceAward: boolean; previousYearStars: number }> {
  try {
    const previousYear = new Date().getFullYear() - 1
    
    // Get previous year sales data
    const previousYearSalesData = await getEmployeeSalesData(userId, previousYear)
    const previousYearComplaints = await getEmployeeComplaints(userId)
    
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
    
    // Super performance award requires 3 or more stars
    const hasSuperPerformanceAward = previousYearStars >= 3

    return {
      hasSuperPerformanceAward,
      previousYearStars,
    }
  } catch (error) {
    console.error("Error checking super performance award:", error)
    return {
      hasSuperPerformanceAward: false,
      previousYearStars: 0,
    }
  }
}


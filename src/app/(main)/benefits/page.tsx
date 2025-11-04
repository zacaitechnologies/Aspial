"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { MarioProgressBar } from "./components/mario-progress-bar"
import { RewardCard } from "./components/reward-card"
import { MonthlyPerformance } from "./components/monthly-performance"
import { ComplaintsTracker } from "./components/complaints-tracker"
import { SuperPerformanceBenefits } from "./components/super-performance-benefits"
import { Plane, Award, Trophy, Car, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getEmployeeSalesData, getEmployeeComplaints, checkSuperPerformanceAward, type EmployeeSalesData } from "./action"
import { useSession } from "../contexts/SessionProvider"

export default function EmployeeBenefitsPage() {
  const { enhancedUser } = useSession()
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("yearly")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString())
  const [salesData, setSalesData] = useState<EmployeeSalesData | null>(null)
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasSuperPerformanceAward, setHasSuperPerformanceAward] = useState(false)
  const [previousYearStars, setPreviousYearStars] = useState(0)

  useEffect(() => {
    async function fetchData() {
      if (!enhancedUser?.profile?.id) {
        console.error("User not authenticated")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const year = parseInt(selectedYear)
        const month = viewMode === "monthly" ? parseInt(selectedMonth) : undefined

        const [salesResult, complaintsResult, awardResult] = await Promise.all([
          getEmployeeSalesData(enhancedUser.profile.id, year, month),
          getEmployeeComplaints(enhancedUser.profile.id),
          checkSuperPerformanceAward(enhancedUser.profile.id),
        ])
        setSalesData(salesResult)
        setComplaints(complaintsResult)
        setHasSuperPerformanceAward(awardResult.hasSuperPerformanceAward)
        setPreviousYearStars(awardResult.previousYearStars)
      } catch (error) {
        console.error("Error fetching benefits data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [enhancedUser?.profile?.id, selectedYear, selectedMonth, viewMode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-2xl font-bold text-white">Loading your benefits...</p>
        </div>
      </div>
    )
  }

  if (!salesData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200 flex items-center justify-center">
        <Card className="p-8 bg-white/95 border-4 border-foreground/20 shadow-2xl">
          <p className="text-2xl font-bold text-center">Unable to load benefits data</p>
        </Card>
      </div>
    )
  }

  const currentYearlySales = salesData.currentYearlySales
  const currentMonthlySales = salesData.currentMonthlySales
  const monthlyData = salesData.monthlyData

  const totalStars = monthlyData.reduce((sum, month) => sum + month.stars, 0)
  const starsAfterComplaints = totalStars - complaints.length

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

  const calculateProgress = () => {
    const sales = viewMode === "yearly" ? currentYearlySales : currentMonthlySales
    const targets = viewMode === "yearly" ? salesTargets : monthlySalesTargets

    if (sales >= targets.level4) return 100
    if (sales >= targets.level3) {
      const range = targets.level4 - targets.level3
      const progress = sales - targets.level3
      return 75 + (progress / range) * 25
    }
    if (sales >= targets.level2) {
      const range = targets.level3 - targets.level2
      const progress = sales - targets.level2
      return 50 + (progress / range) * 25
    }
    if (sales >= targets.level1) {
      const range = targets.level2 - targets.level1
      const progress = sales - targets.level1
      return 25 + (progress / range) * 25
    }
    return (sales / targets.level1) * 25
  }

  const currentProgress = calculateProgress()

  // Determine current level
  const getCurrentLevel = () => {
    const sales = viewMode === "yearly" ? currentYearlySales : currentMonthlySales
    const targets = viewMode === "yearly" ? salesTargets : monthlySalesTargets

    if (sales >= targets.level4) return 4
    if (sales >= targets.level3) return 3
    if (sales >= targets.level2) return 2
    if (sales >= targets.level1) return 1
    return 0
  }

  const currentLevel = getCurrentLevel()

  // Get commission rate based on level
  const getCommissionRate = () => {
    if (currentLevel >= 4) return "12%"
    if (currentLevel >= 3) return "10%"
    if (currentLevel >= 2) return "8%"
    if (currentLevel >= 1) return "5%"
    return "0%"
  }

  // Employee data from database
  const employeeData = {
    name: salesData.userName,
    currentSales: viewMode === "yearly" ? currentYearlySales : currentMonthlySales,
    monthlySales: currentYearlySales / 12,
    level: salesData.currentLevel,
    commissionRate: salesData.commissionRate,
  }

  const rewards = [
    {
      level: 1,
      title: "Bronze Level",
      target: salesTargets.level1,
      monthlySales: 60000,
      commissionRate: "5%",
      prizes: ["🧧 RED PACKET", "Badge Award", "Year-End Banquet Award"],
      icon: Award,
      color: "from-amber-600 to-amber-800",
      unlocked: currentProgress >= 25,
    },
    {
      level: 2,
      title: "Silver Level",
      target: salesTargets.level2,
      monthlySales: 100000,
      commissionRate: "8%",
      prizes: [
        "🧧 1 MONTH CNY BONUS",
        "RM 2,000 Travel Allowance",
        "RM 2,000 Course Allowance",
        "Badge Award",
        "Year-End Banquet Award",
        "RM 5,000 Watch/Car Downpayment*",
        "RM 4,000 Cash Bonus*",
        "RM 1,000 Parents Bonus*",
      ],
      icon: Plane,
      color: "from-gray-400 to-gray-600",
      unlocked: currentProgress >= 50,
    },
    {
      level: 3,
      title: "Gold Level",
      target: salesTargets.level3,
      monthlySales: 175000,
      commissionRate: "10%",
      prizes: [
        "🧧 2 MONTHS CNY BONUS",
        "RM 4,000 Travel Allowance",
        "RM 4,000 Course Allowance",
        "Badge Award",
        "Year-End Banquet Award",
        "RM 15,000 Watch/Car Downpayment*",
        "RM 6,000 Cash Bonus*",
        "Apex Away Ticket*",
        "RM 2,000 Parents Bonus*",
      ],
      icon: Trophy,
      color: "from-yellow-400 to-yellow-600",
      unlocked: currentProgress >= 75,
    },
    {
      level: 4,
      title: "Platinum Level",
      target: salesTargets.level4,
      monthlySales: 280000,
      commissionRate: "12%",
      prizes: [
        "🧧 3 MONTHS CNY BONUS",
        "RM 6,000 Travel Allowance",
        "RM 6,000 Course Allowance",
        "Badge Award",
        "Year-End Banquet Award",
        "RM 20,000 Watch/Car Downpayment*",
        "RM 10,000 Cash Bonus*",
        "Apex Away Ticket*",
        "RM 3,000 Parents Bonus*",
      ],
      icon: Car,
      color: "from-purple-500 to-pink-500",
      unlocked: currentProgress >= 100,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200 relative overflow-hidden">
      {/* Floating clouds */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-20 left-[10%] w-32 h-16 bg-white/80 rounded-full animate-float"
          style={{ animationDelay: "0s", animationDuration: "4s" }}
        />
        <div
          className="absolute top-40 right-[15%] w-40 h-20 bg-white/80 rounded-full animate-float"
          style={{ animationDelay: "1s", animationDuration: "5s" }}
        />
        <div
          className="absolute top-32 left-[60%] w-28 h-14 bg-white/80 rounded-full animate-float"
          style={{ animationDelay: "2s", animationDuration: "4.5s" }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-6xl font-black text-white mb-2 drop-shadow-[0_4px_0_rgba(0,0,0,0.3)] tracking-tight"
            style={{ textShadow: "4px 4px 0 rgba(0,0,0,0.2)" }}
          >
            POWER UP YOUR REWARDS!
          </h1>
          <p className="text-2xl font-bold text-foreground/90">
            Welcome back, <span className="text-primary">{employeeData.name}</span>!
          </p>
        </div>

        {/* Super Performance Award Status */}
        <Card className={`mb-8 p-6 border-4 shadow-xl text-center ${
          hasSuperPerformanceAward
            ? "bg-yellow-50 border-yellow-500"
            : "bg-gray-50 border-gray-300"
        }`}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="text-5xl">
              {hasSuperPerformanceAward ? "🏆" : "⭐"}
            </div>
            <div>
              <h3 className="text-2xl font-black text-foreground mb-1">
                {hasSuperPerformanceAward ? "SUPER PERFORMANCE AWARD ACTIVE" : "No Super Performance Award"}
              </h3>
              <p className={`text-sm font-bold ${
                hasSuperPerformanceAward
                  ? "text-yellow-800"
                  : "text-gray-600"
              }`}>
                {hasSuperPerformanceAward 
                  ? `You earned ${previousYearStars} ⭐ last year! Your award is active this year!`
                  : "Earn 12 ⭐ next year to unlock the Super Performance Award!"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="mb-8 p-4 bg-white/95 border-4 border-foreground/20 shadow-xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Label htmlFor="view-mode" className="font-bold text-sm whitespace-nowrap">
                Yearly
              </Label>
              <Switch
                id="view-mode"
                checked={viewMode === "monthly"}
                onCheckedChange={(checked) => setViewMode(checked ? "monthly" : "yearly")}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="view-mode" className="font-bold text-sm whitespace-nowrap">
                Monthly
              </Label>
            </div>

            {viewMode === "yearly" && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}

            {viewMode === "monthly" && (
              <div className="flex gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - i
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Stats Card */}
        <Card className="mb-8 p-6 bg-white/95 border-4 border-foreground/20 shadow-2xl">
          <div className="flex flex-wrap gap-6 justify-around items-center">
            <div className="text-center">
              <div className="text-5xl font-black text-primary mb-2">RM {(currentYearlySales / 1000).toFixed(0)}K</div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Yearly Sales</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-accent mb-2">
                RM {(employeeData.monthlySales / 1000).toFixed(0)}K
              </div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Monthly Average</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-secondary mb-2">Level {employeeData.level}</div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Current Level</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-green-600 mb-2">{employeeData.commissionRate}</div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Commission Rate</div>
            </div>
          </div>
        </Card>

        {/* Mario Progress Bar */}
        <div className="mb-12">
          <MarioProgressBar
            progress={currentProgress}
            targets={viewMode === "yearly" ? salesTargets : monthlySalesTargets}
            viewMode={viewMode}
          />
        </div>

        <div className="mb-12">
          <MonthlyPerformance
            monthlyData={monthlyData}
            totalStars={totalStars}
            starsAfterComplaints={starsAfterComplaints}
            hasSuperPerformanceAward={hasSuperPerformanceAward}
            previousYearStars={previousYearStars}
          />
        </div>

        <div className="mb-12">
          <ComplaintsTracker complaints={complaints} starsDeducted={complaints.length} />
        </div>

        {/* Super Performance Award Benefits */}
        <div className="mb-8">
          <SuperPerformanceBenefits />
        </div>

        {/* Rewards Grid */}
        <div className="mb-8">
          <h2 className="text-4xl font-black text-center mb-4 text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.3)]">
            UNLOCK AMAZING PRIZES!
          </h2>
          <p className="text-center text-lg font-bold text-foreground/80 mb-8">
            * Super Performance Awards based on 12 months achievements
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rewards.map((reward) => (
              <RewardCard key={reward.level} {...reward} />
            ))}
          </div>
        </div>

        {/* Motivational Message */}
        <Card className="p-8 bg-gradient-to-r from-primary to-destructive text-white border-4 border-foreground/30 shadow-2xl">
          <div className="text-center">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-3xl font-black mb-3 drop-shadow-md">KEEP GOING!</h3>
            {currentLevel < 4 ? (
              <>
                <p className="text-xl font-bold mb-2">
                  You're only RM{" "}
                  {(
                    (Object.values(viewMode === "yearly" ? salesTargets : monthlySalesTargets)[currentLevel] -
                      employeeData.currentSales) /
                    1000
                  ).toFixed(0)}
                  K away from Level {currentLevel + 1}!
                </p>
                <p className="text-lg opacity-90">Every sale brings you closer to amazing rewards!</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold mb-2">You've reached the PLATINUM level!</p>
                <p className="text-lg opacity-90">Keep up the excellent work to maintain your status!</p>
              </>
            )}
          </div>
        </Card>

        {/* Policy Notes */}
        <Card className="mt-8 p-6 bg-white/95 border-4 border-foreground/20 shadow-xl">
          <h3 className="text-2xl font-black mb-4 text-foreground">Important Notes</h3>
          <ul className="space-y-2 text-sm font-bold text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Team progresses from L1 to L4 based on annual sales performance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Failure to maintain performance results in a level downgrade</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Higher levels receive higher commission rates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Level Up Benefits presented at year-end banquet</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Super Performance Awards require 12 stars (RM 100K/month = 1 star)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive">•</span>
              <span>Penalty: 1 star deducted per complaint; 3+ complaints cancels the award</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Grass at bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-green-600 to-green-800 border-t-4 border-green-900 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-30">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 w-2 bg-green-700"
              style={{
                left: `${i * 5}%`,
                height: `${Math.random() * 30 + 20}px`,
                transform: `rotate(${Math.random() * 20 - 10}deg)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

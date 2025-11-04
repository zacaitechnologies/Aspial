"use client"

import { Card } from "@/components/ui/card"

interface MonthlyData {
  month: string
  sales: number
  level: number
  stars: number
}

interface MonthlyPerformanceProps {
  monthlyData: MonthlyData[]
  totalStars: number
  starsAfterComplaints: number
  hasSuperPerformanceAward?: boolean
  previousYearStars?: number
}

export function MonthlyPerformance({ monthlyData, totalStars, starsAfterComplaints, hasSuperPerformanceAward = false, previousYearStars = 0 }: MonthlyPerformanceProps) {
  const getLevelColor = (level: number) => {
    switch (level) {
      case 4:
        return "bg-gradient-to-br from-purple-500 to-pink-500"
      case 3:
        return "bg-gradient-to-br from-yellow-400 to-yellow-600"
      case 2:
        return "bg-gradient-to-br from-gray-400 to-gray-600"
      case 1:
        return "bg-gradient-to-br from-amber-600 to-amber-800"
      default:
        return "bg-gray-300"
    }
  }

  const getLevelName = (level: number) => {
    switch (level) {
      case 4:
        return "Platinum"
      case 3:
        return "Gold"
      case 2:
        return "Silver"
      case 1:
        return "Bronze"
      default:
        return "None"
    }
  }

  return (
    <Card className="p-6 bg-white/95 border-4 border-foreground/20 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-foreground">Monthly Performance Tracker</h2>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-black text-yellow-500">{totalStars} ⭐</div>
            <div className="text-xs font-bold text-muted-foreground">Total Stars</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-green-600">{starsAfterComplaints} ⭐</div>
            <div className="text-xs font-bold text-muted-foreground">After Penalties</div>
          </div>
        </div>
      </div>

      {/* Super Performance Award Status Banner */}
      <div className={`mb-4 p-4 rounded-lg border-2 ${
        hasSuperPerformanceAward
          ? "bg-yellow-50 border-yellow-400"
          : "bg-gray-50 border-gray-300"
      }`}>
        <div className="flex items-center gap-3">
          <div className="text-3xl">
            {hasSuperPerformanceAward ? "🏆" : "⭐"}
          </div>
          <div>
            <p className={`text-sm font-bold ${
              hasSuperPerformanceAward
                ? "text-yellow-900"
                : "text-gray-700"
            }`}>
              {hasSuperPerformanceAward 
                ? `✅ SUPER PERFORMANCE AWARD ACTIVE - You earned ${previousYearStars} ⭐ last year!`
                : "📊 Work towards earning 12⭐ to unlock the Super Performance Award next year"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {monthlyData.map((month, index) => (
          <div key={index} className="relative group">
            <div
              className={`${getLevelColor(month.level)} p-4 rounded-lg border-4 border-foreground/20 shadow-lg transition-transform hover:scale-105 hover:shadow-xl`}
            >
              <div className="text-center">
                <div className="text-lg font-black text-white mb-2">{month.month}</div>
                <div className="text-sm font-bold text-white/90 mb-2">RM {(month.sales / 1000).toFixed(0)}K</div>
                <div className="inline-block bg-white/90 px-2 py-1 rounded text-xs font-black text-foreground mb-2">
                  L{month.level}
                </div>
                <div className="text-2xl">{month.stars > 0 ? "⭐" : "—"}</div>
              </div>
            </div>

            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-foreground text-background px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap shadow-xl">
                <div>{getLevelName(month.level)} Level</div>
                <div>RM {month.sales.toLocaleString()}</div>
                <div>{month.stars > 0 ? "⭐ Star Earned" : "No Star"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-400 rounded-lg">
        <h3 className="text-lg font-black text-blue-900 mb-2">How to Earn Stars</h3>
        <ul className="space-y-1 text-sm font-bold text-blue-800">
          <li>• Monthly sales of RM 100K = 1 ⭐</li>
          <li>• Accumulate 12 stars in 12 months for Super Performance Award</li>
          <li>• Stars are calculated based on monthly achievements</li>
        </ul>
      </div>
    </Card>
  )
}

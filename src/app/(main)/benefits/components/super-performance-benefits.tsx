"use client"

import { Card } from "@/components/ui/card"
import { Watch, Zap, Plane, Gift } from "lucide-react"

interface Benefit {
  name: string
  icon: React.ReactNode
  level1: string
  level2: string
  level3: string
  level4: string
}

export function SuperPerformanceBenefits() {
  const benefits: Benefit[] = [
    {
      name: "Watch or Car Downpayment",
      icon: <Watch className="w-5 h-5" />,
      level1: "-",
      level2: "RM 5,000",
      level3: "RM 15,000",
      level4: "RM 20,000",
    },
    {
      name: "Cash Bonus",
      icon: <Zap className="w-5 h-5" />,
      level1: "RM 1,500",
      level2: "RM 4,000",
      level3: "RM 6,000",
      level4: "RM 10,000",
    },
    {
      name: "Apex Away Ticket",
      icon: <Plane className="w-5 h-5" />,
      level1: "-",
      level2: "-",
      level3: "✓",
      level4: "✓",
    },
    {
      name: "Parents Bonus",
      icon: <Gift className="w-5 h-5" />,
      level1: "RM 500",
      level2: "RM 1,000",
      level3: "RM 2,000",
      level4: "RM 3,000",
    },
  ]

  const levels = [
    { name: "Level 1", color: "bg-yellow-300" },
    { name: "Level 2", color: "bg-green-300" },
    { name: "Level 3", color: "bg-green-600" },
    { name: "Level 4", color: "bg-green-800" },
  ]

  return (
    <Card className="p-6 bg-white/95 border-4 border-foreground/20 shadow-2xl">
      <h2 className="text-3xl font-black text-foreground mb-2">
        🏆 Super Performance Award Benefits
      </h2>
      <p className="text-sm font-bold text-muted-foreground mb-6">
        Award Ceremony based on sales in the 12 months before the ceremony
      </p>

      {/* Benefits Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 font-black text-foreground border-b-2 border-foreground/20">
                Benefit
              </th>
              {levels.map((level) => (
                <th
                  key={level.name}
                  className={`text-center p-3 font-black text-white ${level.color}`}
                >
                  {level.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {benefits.map((benefit, index) => (
              <tr key={index} className="hover:bg-muted/50 transition-colors">
                <td className="p-3 font-bold text-foreground flex items-center gap-2 border-b border-foreground/10">
                  <span className="text-lg">{benefit.icon}</span>
                  {benefit.name}
                </td>
                <td className="text-center p-3 font-bold text-white bg-yellow-300 border-b border-foreground/10">
                  {benefit.level1}
                </td>
                <td className="text-center p-3 font-bold text-white bg-green-300 border-b border-foreground/10">
                  {benefit.level2}
                </td>
                <td className="text-center p-3 font-bold text-white bg-green-600 border-b border-foreground/10">
                  {benefit.level3}
                </td>
                <td className="text-center p-3 font-bold text-white bg-green-800 border-b border-foreground/10">
                  {benefit.level4}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Requirements Section */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 border-2 border-blue-400 rounded-lg">
          <h3 className="font-black text-blue-900 mb-2">How to Qualify</h3>
          <ul className="space-y-1 text-sm font-bold text-blue-800">
            <li>• Need 12 ⭐ in 12 months</li>
            <li>• L2: RM 100k/month = 1⭐</li>
            <li>• Based on monthly sales performance</li>
          </ul>
        </div>

        <div className="p-4 bg-red-50 border-2 border-red-400 rounded-lg">
          <h3 className="font-black text-red-900 mb-2">Penalties</h3>
          <ul className="space-y-1 text-sm font-bold text-red-800">
            <li>• 1⭐ deducted per complaint</li>
            <li>• 3+ complaints cancels award</li>
            <li>• Subject to management review</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}

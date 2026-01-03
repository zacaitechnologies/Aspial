"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { LucideIcon } from "lucide-react"

interface RewardCardProps {
  level: number
  title: string
  target: number
  monthlySales: number
  commissionRate: string
  prizes: string[]
  icon: LucideIcon
  color: string
  unlocked: boolean
}

export function RewardCard({
  level,
  title,
  target,
  monthlySales,
  commissionRate,
  prizes,
  icon: Icon,
  color,
  unlocked,
}: RewardCardProps) {
  return (
    <Card
      className={`relative overflow-hidden border-4 min-h-96 flex flex-col ${
        unlocked
          ? "border-green-500 shadow-2xl"
          : "border-foreground/20 shadow-lg"
      }`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-linear-to-br ${color} opacity-${unlocked ? "20" : "10"}`} />

      {/* Selected badge */}
      {unlocked && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-green-600 text-white font-black text-xs px-3 py-1 shadow-lg">
            ✓ SELECTED
          </Badge>
        </div>
      )}

      <div className="relative p-6 flex flex-col flex-1">
        {/* Level badge */}
        <div className="flex items-center justify-between mb-4">
          <Badge className={`text-lg font-black px-4 py-2 ${unlocked ? "bg-green-600" : "bg-muted"} text-white`}>
            Level {level}
          </Badge>
          <div
            className={`p-3 rounded-full bg-linear-to-br ${color}`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black mb-3 text-foreground">{title}</h3>

        {/* Target */}
        <div className="mb-4 p-3 bg-white/50 rounded-lg">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Yearly Target</div>
          <div className="text-2xl font-black text-primary">RM {(target / 1000).toFixed(0)}K</div>
          <div className="text-xs font-bold text-muted-foreground mt-1">
            RM {(monthlySales / 1000).toFixed(0)}K / month
          </div>
          <div className="text-xs font-bold text-green-600 mt-1">{commissionRate} Commission</div>
        </div>

        {/* Prizes */}
        <div className="flex-1 flex flex-col">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">Benefits</div>
          <ul className="space-y-1.5 flex-1 overflow-y-auto">
            {prizes.map((prize, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-accent text-sm mt-0.5 shrink-0">🎁</span>
                <span
                  className={`text-xs font-bold leading-tight ${unlocked ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {prize}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Lock overlay for locked rewards */}
        {!unlocked && (
          <div className="absolute inset-0 bg-foreground/5 flex items-center justify-center rounded-lg">
            <div className="text-7xl opacity-30">🔒</div>
          </div>
        )}
      </div>
    </Card>
  )
}

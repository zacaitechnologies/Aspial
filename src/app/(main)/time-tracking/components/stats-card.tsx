"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  icon: LucideIcon
  color: "blue" | "green" | "amber" | "purple"
  isActive?: boolean
}

const colorClasses = {
  blue: "text-blue-600 bg-blue-50",
  green: "text-green-600 bg-green-50",
  amber: "text-amber-600 bg-amber-50",
  purple: "text-purple-600 bg-purple-50",
}

export function StatsCard({ title, value, icon: Icon, color, isActive }: StatsCardProps) {
  return (
    <Card
      className={`card ${
        isActive ? "ring-2 ring-purple-500 shadow-lg" : ""
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold transition-all duration-300 ${isActive ? "animate-pulse" : ""}`}>
              {value}
            </p>
          </div>
          <div
            className={`p-3 rounded-full ${colorClasses[color]} transition-all duration-300 ${
              isActive ? "animate-bounce" : ""
            }`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

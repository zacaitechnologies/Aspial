"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  icon: LucideIcon
  color: "primary" | "accent" | "secondary" | "muted"
  isActive?: boolean
}

const colorClasses = {
  primary: "text-primary bg-primary/10",
  accent: "text-accent bg-accent/10",
  secondary: "text-secondary-foreground bg-secondary",
  muted: "text-muted-foreground bg-muted",
}

export function StatsCard({ title, value, icon: Icon, color, isActive }: StatsCardProps) {
  return (
    <Card
      className={`card ${
        isActive ? "ring-2 ring-primary shadow-lg" : ""
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

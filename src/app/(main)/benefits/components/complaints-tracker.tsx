"use client"

import { Card } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface Complaint {
  date: string
  customer: string
  reason: string
}

interface ComplaintsTrackerProps {
  complaints: Complaint[]
}

export function ComplaintsTracker({ complaints }: ComplaintsTrackerProps) {
  // Only show if there are complaints
  if (complaints.length === 0) {
    return null
  }

  return (
    <Card className="p-6 border-4 border-red-500 bg-red-50 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          Customer Complaints
        </h2>
        <div className="text-center">
          <div className="text-5xl font-black text-red-600">{complaints.length}</div>
          <div className="text-xs font-bold text-muted-foreground">Total Complaints</div>
        </div>
      </div>

      {/* Complaints List */}
      <div className="space-y-3">
        <h3 className="text-xl font-black text-foreground mb-3">Complaint Details</h3>
        {complaints.map((complaint, index) => (
          <div key={index} className="p-4 bg-white/90 rounded-lg border-2 border-foreground/20 shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-black text-foreground">{complaint.customer}</span>
                </div>
                <p className="text-sm font-bold text-muted-foreground mb-1">{complaint.reason}</p>
                <p className="text-xs font-bold text-muted-foreground">Date: {complaint.date}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

"use client"

import { Card } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react"

interface Complaint {
  date: string
  customer: string
  reason: string
  status: "pending" | "resolved"
}

interface ComplaintsTrackerProps {
  complaints: Complaint[]
  starsDeducted: number
}

export function ComplaintsTracker({ complaints, starsDeducted }: ComplaintsTrackerProps) {
  const warningLevel = complaints.length >= 3 ? "critical" : complaints.length >= 1 ? "warning" : "safe"

  return (
    <Card
      className={`p-6 border-4 shadow-2xl ${
        warningLevel === "critical"
          ? "bg-red-50 border-red-500"
          : warningLevel === "warning"
            ? "bg-yellow-50 border-yellow-500"
            : "bg-green-50 border-green-500"
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
          <AlertTriangle
            className={`w-8 h-8 ${
              warningLevel === "critical"
                ? "text-red-600"
                : warningLevel === "warning"
                  ? "text-yellow-600"
                  : "text-green-600"
            }`}
          />
          Customer Complaints Tracker
        </h2>
        <div className="text-center">
          <div
            className={`text-5xl font-black ${
              warningLevel === "critical"
                ? "text-red-600"
                : warningLevel === "warning"
                  ? "text-yellow-600"
                  : "text-green-600"
            }`}
          >
            {complaints.length}
          </div>
          <div className="text-xs font-bold text-muted-foreground">Total Complaints</div>
        </div>
      </div>

      {/* Warning Banner */}
      <div
        className={`mb-6 p-4 rounded-lg border-2 ${
          warningLevel === "critical"
            ? "bg-red-100 border-red-600"
            : warningLevel === "warning"
              ? "bg-yellow-100 border-yellow-600"
              : "bg-green-100 border-green-600"
        }`}
      >
        <div className="flex items-start gap-3">
          {warningLevel === "critical" ? (
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          ) : warningLevel === "warning" ? (
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          )}
          <div>
            <p
              className={`font-black text-lg ${
                warningLevel === "critical"
                  ? "text-red-900"
                  : warningLevel === "warning"
                    ? "text-yellow-900"
                    : "text-green-900"
              }`}
            >
              {warningLevel === "critical"
                ? "⚠️ CRITICAL: Super Performance Award CANCELLED!"
                : warningLevel === "warning"
                  ? "⚠️ WARNING: Complaints detected!"
                  : "✅ Great job! No complaints this year!"}
            </p>
            <p
              className={`text-sm font-bold mt-1 ${
                warningLevel === "critical"
                  ? "text-red-800"
                  : warningLevel === "warning"
                    ? "text-yellow-800"
                    : "text-green-800"
              }`}
            >
              {warningLevel === "critical"
                ? "3 or more complaints cancel the Super Performance Award (with management review)"
                : warningLevel === "warning"
                  ? `${starsDeducted} star(s) deducted. ${3 - complaints.length} more complaint(s) will cancel your award!`
                  : "Keep up the excellent customer service!"}
            </p>
          </div>
        </div>
      </div>

      {/* Star Penalty Display */}
      <div className="mb-6 p-4 bg-white/90 rounded-lg border-2 border-foreground/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-foreground mb-1">Star Penalty</h3>
            <p className="text-sm font-bold text-muted-foreground">1 complaint = 1 star deducted</p>
          </div>
          <div className="text-5xl font-black text-red-600">-{starsDeducted} ⭐</div>
        </div>
      </div>

      {/* Complaints List */}
      {complaints.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-xl font-black text-foreground mb-3">Complaint Details</h3>
          {complaints.map((complaint, index) => (
            <div key={index} className="p-4 bg-white/90 rounded-lg border-2 border-foreground/20 shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-black text-foreground">{complaint.customer}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-black ${
                        complaint.status === "resolved"
                          ? "bg-green-200 text-green-800"
                          : "bg-orange-200 text-orange-800"
                      }`}
                    >
                      {complaint.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-muted-foreground mb-1">{complaint.reason}</p>
                  <p className="text-xs font-bold text-muted-foreground">Date: {complaint.date}</p>
                </div>
                <div className="text-3xl">{complaint.status === "resolved" ? "✅" : "⏳"}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-xl font-black text-green-600">Perfect Record!</p>
          <p className="text-sm font-bold text-muted-foreground mt-2">
            No customer complaints this year. Keep up the excellent work!
          </p>
        </div>
      )}

      {/* Policy Reminder */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
        <h3 className="text-lg font-black text-foreground mb-2">Complaint Policy</h3>
        <ul className="space-y-1 text-sm font-bold text-muted-foreground">
          <li>• Each customer complaint deducts 1 star from your total</li>
          <li>• 3 or more complaints cancel the Super Performance Award</li>
          <li>• Management review required for award cancellation</li>
          <li>• Resolved complaints still count toward the penalty</li>
        </ul>
      </div>
    </Card>
  )
}

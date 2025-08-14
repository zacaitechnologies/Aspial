"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { History, Clock, Calendar, Filter } from "lucide-react"
import { formatTime, formatDate } from "../utils"
import { TimeEntry, Project } from "@prisma/client"

interface TimeEntryWithProject extends TimeEntry {
  project: Project
}

interface TimeEntriesProps {
  entries: TimeEntryWithProject[]
  projects: Project[]
}

export function TimeEntries({ entries, projects }: TimeEntriesProps) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Filter entries based on date range
  const filteredEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.startTime)
    
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // Include the entire end date
      return entryDate >= start && entryDate <= end
    } else if (startDate) {
      const start = new Date(startDate)
      return entryDate >= start
    } else if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // Include the entire end date
      return entryDate <= end
    }
    
    // If no filters, show today's entries
    return entryDate.toDateString() === new Date().toDateString()
  })

  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
  }

  const hasFilters = startDate || endDate

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-brand" />
          {hasFilters ? "Filtered Entries" : "Today's Entries"}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Date Range Filters */}
      {showFilters && (
        <div className="space-y-4 p-4 bg-white/40 rounded-lg border border-white/20 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-sm font-medium">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/60"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Scrollable Entries List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>
                {hasFilters 
                  ? "No time entries found for the selected date range" 
                  : "No time entries for today"
                }
              </p>
              <p className="text-sm">
                {hasFilters 
                  ? "Try adjusting your date range" 
                  : "Start tracking to see your entries here"
                }
              </p>
            </div>
          ) : (
            filteredEntries.map((entry: TimeEntryWithProject) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-white/20 hover:bg-white/80"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 bg-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{entry.project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(entry.startTime)} - {entry.endTime ? formatDate(entry.endTime) : "Running"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {formatTime(entry.duration)}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

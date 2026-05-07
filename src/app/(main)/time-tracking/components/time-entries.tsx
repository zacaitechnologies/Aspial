"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { History, Clock, Calendar, Filter, ChevronDown, CheckSquare, FileText } from "lucide-react"
import { formatTime, formatDate } from "../utils"
import { Project } from "@prisma/client"
import type { TimeEntryDTO } from "../action"

interface TimeEntriesProps {
  entries: TimeEntryDTO[]
  projects: Project[]
}

export function TimeEntries({ entries, projects }: TimeEntriesProps) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [expandedEntryIds, setExpandedEntryIds] = useState<number[]>([])

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

  const toggleEntryDetails = (entryId: number) => {
    setExpandedEntryIds((prev) =>
      prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId],
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" />
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
        <div className="space-y-4 p-4 bg-card/40 rounded-lg border border-border mb-6">
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
                className="bg-background/60"
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
                className="bg-background/60"
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
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 bg-card/60 rounded-xl border border-border hover:bg-card/80 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 bg-primary" />
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleEntryDetails(entry.id)}
                      className="h-8 px-2 text-xs"
                    >
                      Details
                      <ChevronDown
                        className={`h-3.5 w-3.5 ml-1 transition-transform ${
                          expandedEntryIds.includes(entry.id) ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </div>
                </div>
                {expandedEntryIds.includes(entry.id) && (
                  <div className="space-y-3 border-t border-border pt-3">
                    <div className="flex items-start gap-2 text-sm">
                      <CheckSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Selected Task</p>
                        <p className="font-medium break-words">
                          {entry.task?.title ?? "No task selected"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Description</p>
                        <p className="font-medium whitespace-pre-wrap break-words">
                          {entry.description?.trim() ? entry.description : "No description"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

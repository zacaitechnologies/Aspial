"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { History, Trash2, Clock } from "lucide-react"
import { formatTime, formatDate } from "../../time-tracking/utils"

interface TimeEntry {
  id: string
  projectId: string
  projectName: string
  startTime: Date
  endTime?: Date
  duration: number
}

interface Project {
  id: string
  name: string
  color: string
  client?: string
}

interface TimeEntriesProps {
  entries: TimeEntry[]
  projects: Project[]
  onDeleteEntry: (id: string) => void
}

export function TimeEntries({ entries, projects, onDeleteEntry }: TimeEntriesProps) {
  const getProjectColor = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.color || "#6B7280"
  }

  const todayEntries = entries.filter((entry) => entry.startTime.toDateString() === new Date().toDateString())

  return (
    <Card className="h-fit transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 border-0 bg-white/80 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
            <History className="h-5 w-5 text-white" />
          </div>
          Today&apos;s Entries
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {todayEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No time entries for today</p>
              <p className="text-sm">Start tracking to see your entries here</p>
            </div>
          ) : (
            todayEntries.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-200 hover:bg-white/80 hover:shadow-lg hover:scale-[1.02] animate-in slide-in-from-right-5"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getProjectColor(entry.projectId) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{entry.projectName}</div>
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
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteEntry(entry.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

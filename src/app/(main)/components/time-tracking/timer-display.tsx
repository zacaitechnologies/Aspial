"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Timer, Play, Pause, Square } from "lucide-react"
import { formatTime } from "../../time-tracking/utils"
import { Button } from "@/components/ui/button"

interface Project {
  id: string
  name: string
  color: string
  client?: string
}

interface TimerDisplayProps {
  selectedProject: Project | null
  isTracking: boolean
  currentSession: number
  onStart: () => void
  onPause: () => void
  onStop: () => void
}

export function TimerDisplay({
  selectedProject,
  isTracking,
  currentSession,
  onStart,
  onPause,
  onStop,
}: TimerDisplayProps) {
  return (
          <div className="space-y-6">
        <div className="flex items-center gap-2 text-lg">
          <Timer className="h-5 w-5 text-brand" />
          Timer
        </div>
      
      {/* Current Project Display */}
      {selectedProject && (
        <div className="flex items-center gap-3 p-4 bg-white/60 rounded-lg">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedProject.color }} />
          <div>
            <div className="font-medium">{selectedProject.name}</div>
            {selectedProject.client && <div className="text-sm text-muted-foreground">{selectedProject.client}</div>}
          </div>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center space-y-6 py-8">
        <div className="relative">
          <div
            className={`text-7xl font-mono font-bold py-6 px-8 rounded-2xl ${
              isTracking
                ? "text-brand bg-white/60"
                : "text-slate-600 bg-white/60"
            }`}
          >
            {formatTime(currentSession)}
          </div>
        </div>
      </div>

      {/* Timer Control Buttons */}
      <div className="flex justify-center gap-4">
        {!isTracking ? (
          <Button
            onClick={onStart}
            disabled={!selectedProject}
            size="lg"
            className="bg-brand hover:bg-brand-dark"
          >
            <Play className="h-5 w-5 mr-2" />
            Start Timer
          </Button>
        ) : (
          <>
            <Button
              onClick={onPause}
              size="lg"
              variant="outline"
              className="border-amber-300 text-amber-600 hover:bg-amber-50"
            >
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
            <Button
              onClick={onStop}
              size="lg"
              variant="destructive"
            >
              <Square className="h-5 w-5 mr-2" />
              Stop
            </Button>
          </>
        )}
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <div
          className={`w-2 h-2 rounded-full ${
            isTracking ? "bg-green-500" : "bg-slate-300"
          }`}
        />
        <span className="text-muted-foreground">{isTracking ? "Timer is running" : "Timer is stopped"}</span>
      </div>
    </div>
  )
}

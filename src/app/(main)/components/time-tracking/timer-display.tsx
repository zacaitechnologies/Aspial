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
    <Card className="transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 border-0 bg-white/80 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-blue-50/50" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg">
            <Timer className="h-5 w-5 text-white" />
          </div>
          Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        {/* Current Project Display */}
        {selectedProject && (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg animate-in fade-in-0 duration-300">
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
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-2xl blur-xl" />
            <div
              className={`text-7xl font-mono font-bold transition-all duration-500 relative z-10 py-6 px-8 rounded-2xl ${
                isTracking
                  ? "text-green-600 animate-pulse bg-gradient-to-r from-green-50 to-blue-50"
                  : "text-slate-600 bg-slate-50/50"
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
              className="transition-all duration-200 hover:scale-105 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
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
                className="transition-all duration-200 hover:scale-105 border-amber-300 text-amber-600 hover:bg-amber-50 bg-transparent"
              >
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </Button>
              <Button
                onClick={onStop}
                size="lg"
                variant="destructive"
                className="transition-all duration-200 hover:scale-105 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg"
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
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isTracking ? "bg-green-500 animate-pulse" : "bg-slate-300"
            }`}
          />
          <span className="text-muted-foreground">{isTracking ? "Timer is running" : "Timer is stopped"}</span>
        </div>
      </CardContent>
    </Card>
  )
}

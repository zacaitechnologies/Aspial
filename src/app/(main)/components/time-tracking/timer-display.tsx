"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Timer, Play, Pause, Square } from "lucide-react"
import { formatTime } from "../../time-tracking/utils"
import { Button } from "@/components/ui/button"
import { Project } from "@prisma/client"

interface TimerDisplayProps {
  selectedProject: Project | null
  isTracking: boolean
  isPaused: boolean
  currentSession: number
  onStart: () => void
  onPause: () => void
  onStop: () => void
}

export function TimerDisplay({
  selectedProject,
  isTracking,
  isPaused,
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
            {!isPaused ? (
              <Button
                onClick={onPause}
                size="lg"
                variant="outline"
                className="border-amber-300 text-amber-600 hover:bg-amber-50"
              >
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </Button>
            ) : (
              <Button
                onClick={onStart}
                size="lg"
                variant="outline"
                className="border-green-300 text-green-600 hover:bg-green-50"
              >
                <Play className="h-5 w-5 mr-2" />
                Resume
              </Button>
            )}
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
            isTracking && !isPaused
              ? "bg-green-500"
              : isPaused
                ? "bg-amber-500"
                : "bg-slate-300"
          }`}
        />
        <span className="text-muted-foreground">
          {isTracking && !isPaused ? "Timer is running" : isPaused ? "Timer is paused" : "Timer is stopped"}
        </span>
      </div>

    </div>
  )
}

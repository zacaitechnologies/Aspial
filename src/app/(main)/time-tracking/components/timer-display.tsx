"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Timer, Play, Pause, Square } from "lucide-react"
import { formatTime } from "../utils"
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
  isStarting?: boolean
  isPausing?: boolean
  isResuming?: boolean
  isStopping?: boolean
}

export function TimerDisplay({
  selectedProject,
  isTracking,
  isPaused,
  currentSession,
  onStart,
  onPause,
  onStop,
  isStarting = false,
  isPausing = false,
  isResuming = false,
  isStopping = false,
}: TimerDisplayProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 text-lg mb-6">
        <Timer className="h-5 w-5 text-[var(--color-primary)]" />
        Timer
      </div>

      {/* Timer Display - Takes up most of the space */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center space-y-8">
          <div className="relative">
            <div
              className={`text-8xl font-mono font-bold py-8 px-12 rounded-3xl ${
                isTracking
                  ? "text-[var(--color-primary)] bg-white/60"
                  : "text-[var(--color-muted-foreground)] bg-white/60"
              }`}
            >
              {formatTime(currentSession)}
            </div>
          </div>

          {/* Timer Control Buttons */}
          <div className="flex justify-center gap-4">
            {!isTracking ? (
              <Button
                onClick={onStart}
                disabled={!selectedProject || isStarting}
                size="lg"
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-lg px-8 py-3"
              >
                {isStarting ? (
                  <>
                    <div className="h-6 w-6 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-6 w-6 mr-2" />
                    Start Timer
                  </>
                )}
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button
                    onClick={onPause}
                    disabled={isPausing}
                    size="lg"
                    variant="outline"
                    className="border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 text-lg px-8 py-3"
                  >
                    {isPausing ? (
                      <>
                        <div className="h-6 w-6 mr-2 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                        Pausing...
                      </>
                    ) : (
                      <>
                        <Pause className="h-6 w-6 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={onStart}
                    disabled={isResuming}
                    size="lg"
                    variant="outline"
                    className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 text-lg px-8 py-3"
                  >
                    {isResuming ? (
                      <>
                        <div className="h-6 w-6 mr-2 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                        Resuming...
                      </>
                    ) : (
                      <>
                        <Play className="h-6 w-6 mr-2" />
                        Resume
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={onStop}
                  disabled={isStopping}
                  size="lg"
                  variant="destructive"
                  className="text-lg px-8 py-3"
                >
                  {isStopping ? (
                    <>
                      <div className="h-6 w-6 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <Square className="h-6 w-6 mr-2" />
                      Stop
                    </>
                  )}
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
            <span className="text-[var(--color-muted-foreground)]">
              {isTracking && !isPaused ? "Timer is running" : isPaused ? "Timer is paused" : "Timer is stopped"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

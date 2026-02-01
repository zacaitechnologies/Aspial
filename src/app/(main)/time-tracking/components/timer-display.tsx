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
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 text-base sm:text-lg mb-4 sm:mb-6 font-semibold text-foreground">
        <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
        Timer
      </div>

      {/* Timer Display - Responsive size for mobile to desktop */}
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <div className="text-center space-y-4 sm:space-y-6 md:space-y-8">
          <div className="relative w-full min-w-0">
            <div
              className={`font-mono font-bold rounded-2xl sm:rounded-3xl
                text-4xl py-4 px-4
                sm:text-5xl sm:py-5 sm:px-6
                md:text-6xl md:py-6 md:px-8
                lg:text-7xl lg:py-7 lg:px-10
                xl:text-8xl xl:py-8 xl:px-12
                ${isTracking
                  ? "text-primary bg-card/60"
                  : "text-muted-foreground bg-card/60"
                }`}
            >
              {formatTime(currentSession)}
            </div>
          </div>

          {/* Timer Control Buttons */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            {!isTracking ? (
              <Button
                onClick={onStart}
                disabled={!selectedProject || isStarting}
                size="lg"
                className="bg-primary hover:bg-primary/80 text-primary-foreground text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3"
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
                    className="border-primary text-primary hover:bg-primary/10 text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 [&_svg]:shrink-0"
                  >
                    {isPausing ? (
                      <>
                        <div className="h-6 w-6 mr-2 shrink-0 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Pausing...
                      </>
                    ) : (
                      <>
                        <Pause className="h-6 w-6 mr-2 shrink-0" />
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
                    className="border-primary text-primary hover:bg-primary/10 text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 [&_svg]:shrink-0"
                  >
                    {isResuming ? (
                      <>
                        <div className="h-6 w-6 mr-2 shrink-0 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Resuming...
                      </>
                    ) : (
                      <>
                        <Play className="h-6 w-6 mr-2 shrink-0" />
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
                  className="text-destructive-foreground text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 [&_svg]:shrink-0"
                >
                  {isStopping ? (
                    <>
                      <div className="h-6 w-6 mr-2 shrink-0 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <Square className="h-6 w-6 mr-2 shrink-0" />
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
                  ? "bg-primary"
                  : isPaused
                    ? "bg-accent"
                    : "bg-muted"
              }`}
            />
            <span className="text-muted-foreground">
              {isTracking && !isPaused ? "Timer is running" : isPaused ? "Timer is paused" : "Timer is stopped"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

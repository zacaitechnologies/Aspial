"use client"
import { Timer, Play, Pause, Square, Save, Loader2 } from "lucide-react"
import { formatTime } from "../utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Project, TaskStatus } from "@prisma/client"
import type { ProjectTaskOption } from "../action"

interface TimerDisplayProps {
  selectedProject: Project | null
  selectedTask: ProjectTaskOption | null
  isTracking: boolean
  isPaused: boolean
  currentSession: number
  description: string
  onDescriptionChange: (value: string) => void
  onSaveDescription: () => void
  isDescriptionDirty: boolean
  isSavingDescription: boolean
  onStart: () => void
  onPause: () => void
  onStop: () => void
  isStarting?: boolean
  isPausing?: boolean
  isResuming?: boolean
  isStopping?: boolean
  mustHaveDescription?: boolean
  descriptionInvalid?: boolean
}

const taskStatusLabel: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
}

const taskStatusVariant: Record<TaskStatus, "default" | "secondary" | "outline"> = {
  todo: "outline",
  in_progress: "default",
  done: "secondary",
}

export function TimerDisplay({
  selectedProject,
  selectedTask,
  isTracking,
  isPaused,
  currentSession,
  description,
  onDescriptionChange,
  onSaveDescription,
  isDescriptionDirty,
  isSavingDescription,
  onStart,
  onPause,
  onStop,
  isStarting = false,
  isPausing = false,
  isResuming = false,
  isStopping = false,
  mustHaveDescription = false,
  descriptionInvalid = false,
}: TimerDisplayProps) {
  const trimmedDescription = description.trim()
  const cannotStart = !selectedProject && trimmedDescription === ""
  const pauseStopBlocked = descriptionInvalid
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 flex-wrap">
        <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-foreground">
          <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
          Timer
        </div>
        {selectedTask && (
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Badge variant={taskStatusVariant[selectedTask.status]}>
              {taskStatusLabel[selectedTask.status]}
            </Badge>
            <span className="text-muted-foreground truncate" title={selectedTask.title}>
              {selectedTask.title}
            </span>
          </div>
        )}
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
                disabled={cannotStart || isStarting}
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
                    disabled={isPausing || pauseStopBlocked}
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
                  disabled={isStopping || pauseStopBlocked}
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

          {!isTracking && cannotStart && (
            <p className="text-xs text-destructive">
              <span aria-hidden="true">*</span> Select a project or fill in a description to start the timer.
            </p>
          )}
          {isTracking && pauseStopBlocked && (
            <p className="text-xs text-destructive">
              <span aria-hidden="true">*</span> Add a description before you pause or stop — this entry isn't tied to a project.
            </p>
          )}

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

          {/* Description input — editable both before starting and during tracking */}
          <div className="text-left space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <span>
                Description
                {mustHaveDescription && (
                  <span className="ml-1 text-destructive" aria-label="required">*</span>
                )}
              </span>
              {mustHaveDescription && (
                <span className="text-xs text-destructive font-normal">
                  (required — no project selected)
                </span>
              )}
            </label>
            <Textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="What are you working on?"
              rows={3}
              maxLength={1000}
              className={`resize-none bg-background/60 ${
                descriptionInvalid ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            {isTracking && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onSaveDescription}
                  disabled={!isDescriptionDirty || isSavingDescription}
                >
                  {isSavingDescription ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

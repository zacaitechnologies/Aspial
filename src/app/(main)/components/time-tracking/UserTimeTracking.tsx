"use client"

import { useState, useEffect } from "react"
import { ProjectSelector } from "./project-selector"
import { TimerDisplay } from "./timer-display"
import { TimeEntries } from "./time-entries"
import { FloatingElements } from "./floating-elements"
import { TimeEntry, Project } from "@prisma/client"

interface UserTimeTrackingProps {
  initialTimeEntries: (TimeEntry & {
    project: Project
  })[]
  initialProjects: Project[]
  userId: string
}

export default function UserTimeTracking({ 
  initialTimeEntries, 
  initialProjects, 
  userId 
}: UserTimeTrackingProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSession, setCurrentSession] = useState(0)
  const [timeEntries, setTimeEntries] = useState(initialTimeEntries)
  const [projects, setProjects] = useState(initialProjects)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [pausedTime, setPausedTime] = useState(0)

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTracking && !isPaused && startTime) {
      interval = setInterval(() => {
        setCurrentSession(Math.floor((Date.now() - startTime.getTime()) / 1000) + pausedTime)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTracking, isPaused, startTime, pausedTime])

  const pauseTimer = () => {
    if (!isTracking || !startTime) return

    setIsPaused(true)
    const currentElapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
    setPausedTime(pausedTime + currentElapsed)
  }

  const resumeTimer = () => {
    if (!isPaused) return

    setIsPaused(false)
    setStartTime(new Date())
  }

  const startTimer = () => {
    if (!selectedProject) return

    if (isPaused) {
      // Resume from pause
      resumeTimer()
    } else {
      // Start fresh
      const now = new Date()
      setStartTime(now)
      setIsTracking(true)
      setIsPaused(false)
      setCurrentSession(0)
      setPausedTime(0)
    }
  }

  const stopTimer = async () => {
    if (!selectedProject || !startTime) return

    const endTime = new Date()
    let totalDuration = currentSession

    if (!isPaused) {
      totalDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000) + pausedTime
    }

    try {
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          startTime: new Date(Date.now() - totalDuration * 1000).toISOString(),
          endTime: endTime.toISOString(),
          duration: totalDuration,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save time entry")
      }

      const newEntry = await response.json()
      setTimeEntries((prev) => [newEntry, ...prev])
    } catch (err) {
      console.error("Failed to save time entry:", err)
    }

    setIsTracking(false)
    setIsPaused(false)
    setCurrentSession(0)
    setStartTime(null)
    setPausedTime(0)
  }

  const handleDeleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete time entry")
      }

      setTimeEntries((prev) => prev.filter((entry) => entry.id !== parseInt(id)))
    } catch (err) {
      console.error("Failed to delete time entry:", err)
    }
  }

  return (
    <div className="min-h-screen bg-[#BDC4A5] p-4 relative">
      <FloatingElements />
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Main Content */}
        <div className="relative">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 relative">
            {/* Left Column - Timer Section */}
            <div className="xl:col-span-3 space-y-8">
              <div className="relative">
                <div className="relative z-10 bg-card-background rounded-lg p-6">
                  <ProjectSelector
                    projects={projects}
                    selectedProject={selectedProject}
                    onProjectSelect={setSelectedProject}
                    disabled={isTracking}
                  />
                </div>
              </div>

              <div className="relative">
                <div className="relative z-10 bg-card-background rounded-lg p-6">
                  <TimerDisplay
                    selectedProject={selectedProject}
                    isTracking={isTracking}
                    currentSession={currentSession}
                    onStart={startTimer}
                    onPause={pauseTimer}
                    onStop={stopTimer}
                  />
                </div>
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

            {/* Right Column - Time Entries */}
            <div className="xl:col-span-2 relative">
              <div className="relative z-10 bg-card-background rounded-lg p-6 h-full">
                <TimeEntries
                  entries={timeEntries}
                  projects={projects}
                  onDeleteEntry={handleDeleteEntry}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

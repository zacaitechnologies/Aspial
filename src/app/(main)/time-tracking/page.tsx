"use client"

import { useState, useEffect } from "react"
import { ProjectSelector } from "../components/time-tracking/project-selector"
import { TimerDisplay } from "../components/time-tracking/timer-display"
import { TimeEntries } from "../components/time-tracking/time-entries"
import { Clock } from "lucide-react"
import { FloatingElements } from "../components/time-tracking/floating-elements"
import { 
  fetchProjects, 
  fetchTimeEntries, 
  createTimeEntry, 
  deleteTimeEntry,
  type Project,
  type TimeEntry 
} from "./utils"

export default function TimeTrackingPage() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSession, setCurrentSession] = useState(0)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [pausedTime, setPausedTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load projects and time entries on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [projectsData, timeEntriesData] = await Promise.all([
          fetchProjects(),
          fetchTimeEntries(),
        ])
        setProjects(projectsData)
        setTimeEntries(timeEntriesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

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
      const newEntry = await createTimeEntry({
        projectId: selectedProject.id,
        startTime: new Date(Date.now() - totalDuration * 1000),
        endTime,
        duration: totalDuration,
      })

      setTimeEntries((prev) => [newEntry, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save time entry")
    }

    setIsTracking(false)
    setIsPaused(false)
    setCurrentSession(0)
    setStartTime(null)
    setPausedTime(0)
  }

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteTimeEntry(id)
      setTimeEntries((prev) => prev.filter((entry) => entry.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete time entry")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 p-4 relative">
        <FloatingElements />
        <div className="mx-auto max-w-7xl flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading time tracking data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 p-4 relative">
        <FloatingElements />
        <div className="mx-auto max-w-7xl flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 p-4 relative">
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

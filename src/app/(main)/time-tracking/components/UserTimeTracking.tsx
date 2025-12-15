"use client"

import { useState, useEffect } from "react"
import { ProjectSelector } from "./project-selector"
import { TimerDisplay } from "./timer-display"
import { TimeEntries } from "./time-entries"
import { FloatingElements } from "./floating-elements"
import { TimeEntry, Project } from "@prisma/client"
import { createTimeEntry, getActiveTimeEntry, pauseTimeEntry, resumeTimeEntry, stopTimeEntry } from "../action"

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
  const [activeEntryId, setActiveEntryId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load active time entry on mount
  useEffect(() => {
    const loadActiveEntry = async () => {
      try {
        const activeEntry = await getActiveTimeEntry()
        if (activeEntry) {
          setActiveEntryId(activeEntry.id)
          setSelectedProject(activeEntry.project)
          setIsTracking(true)
          const isPausedValue = (activeEntry as any).isPause ?? false
          setIsPaused(isPausedValue)
          
          const start = new Date(activeEntry.startTime)
          setStartTime(start)
          
          // If paused, use the stored duration
          if (isPausedValue) {
            setCurrentSession(activeEntry.duration)
            setPausedTime(activeEntry.duration)
          } else {
            // If not paused, calculate elapsed time since last resume + stored duration
            const now = new Date()
            const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000)
            setCurrentSession(activeEntry.duration + elapsed)
            setPausedTime(activeEntry.duration)
          }
        }
      } catch (err) {
        console.error("Failed to load active entry:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadActiveEntry()
  }, [])

  // Timer logic - updates every second when tracking and not paused
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTracking && !isPaused && startTime && activeEntryId) {
      interval = setInterval(() => {
        const start = new Date(startTime)
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000)
        // Total session time = accumulated paused time + elapsed time since last resume
        setCurrentSession(pausedTime + elapsed)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTracking, isPaused, startTime, pausedTime, activeEntryId])

  const pauseTimer = async () => {
    if (!isTracking || !startTime || !activeEntryId) return

    const now = new Date()
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    const totalDuration = elapsed + pausedTime

    try {
      await pauseTimeEntry(activeEntryId, totalDuration)
      setIsPaused(true)
      setPausedTime(totalDuration)
      setCurrentSession(totalDuration)
    } catch (err) {
      console.error("Failed to pause time entry:", err)
    }
  }

  const resumeTimer = async () => {
    if (!isPaused || !activeEntryId) return

    try {
      const updatedEntry = await resumeTimeEntry(activeEntryId)
      setIsPaused(false)
      // Update startTime to the new resume time from database
      setStartTime(new Date(updatedEntry.startTime))
      // Keep pausedTime as the accumulated duration before this resume
      setPausedTime(updatedEntry.duration)
    } catch (err) {
      console.error("Failed to resume time entry:", err)
    }
  }

  const startTimer = async () => {
    if (!selectedProject) return

    // Check if there's already an active entry
    if (activeEntryId) {
      if (isPaused) {
        // Resume from pause
        await resumeTimer()
      }
      return
    }

    // Start fresh timer
    const now = new Date()
    try {
      const newEntry = await createTimeEntry({
        projectId: selectedProject.id,
        startTime: now,
        duration: 0,
      })
      
      setActiveEntryId(newEntry.id)
      setStartTime(now)
      setIsTracking(true)
      setIsPaused(false)
      setCurrentSession(0)
      setPausedTime(0)
    } catch (err: any) {
      console.error("Failed to start time entry:", err)
      if (err.message === "User already has an active time entry") {
        // Reload active entry
        try {
          const activeEntry = await getActiveTimeEntry()
          if (activeEntry) {
            setActiveEntryId(activeEntry.id)
            setSelectedProject(activeEntry.project)
            setIsTracking(true)
            const isPausedValue = (activeEntry as any).isPause ?? false
            setIsPaused(isPausedValue)
            const start = new Date(activeEntry.startTime)
            const elapsed = Math.floor((Date.now() - start.getTime()) / 1000)
            if (isPausedValue) {
              setCurrentSession(activeEntry.duration)
              setPausedTime(activeEntry.duration)
            } else {
              setCurrentSession(elapsed + activeEntry.duration)
              setPausedTime(activeEntry.duration)
            }
            setStartTime(start)
          }
        } catch (loadErr) {
          console.error("Failed to reload active entry:", loadErr)
        }
      }
    }
  }

  const stopTimer = async () => {
    if (!selectedProject || !startTime || !activeEntryId) return

    const endTime = new Date()
    let totalDuration = currentSession

    // If not paused, calculate final duration
    if (!isPaused) {
      const elapsed = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
      totalDuration = pausedTime + elapsed
    }

    try {
      const updatedEntry = await stopTimeEntry(activeEntryId, totalDuration)
      // Update the entry in the list instead of adding a duplicate
      setTimeEntries((prev) => 
        prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
      )
      
      setIsTracking(false)
      setIsPaused(false)
      setCurrentSession(0)
      setStartTime(null)
      setPausedTime(0)
      setActiveEntryId(null)
      setSelectedProject(null)
    } catch (err) {
      console.error("Failed to stop time entry:", err)
    }
  }



  if (isLoading) {
    return (
      <div className="h-[calc(100vh-80px)] p-4 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-80px)] p-4 relative overflow-hidden">
      <FloatingElements />
      <div className="mx-auto max-w-7xl h-full">
        {/* Main Content */}
        <div className="h-full grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left Column - Timer Section */}
          <div className="xl:col-span-3 flex flex-col space-y-6">
            <div className="relative">
              <div className="relative z-10 bg-card-background rounded-lg p-6 border-card-border border-1">
                <ProjectSelector
                  projects={projects}
                  selectedProject={selectedProject}
                  onProjectSelect={setSelectedProject}
                  disabled={isTracking}
                />
              </div>
            </div>

            <div className="relative flex-1">
              <div className="relative z-10 bg-card-background rounded-lg p-6 h-full border-card-border border-1">
                <TimerDisplay
                  selectedProject={selectedProject}
                  isTracking={isTracking}
                  isPaused={isPaused}
                  currentSession={currentSession}
                  onStart={startTimer}
                  onPause={pauseTimer}
                  onStop={stopTimer}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Time Entries */}
          <div className="xl:col-span-2 relative">
            <div className="relative z-10 bg-card-background rounded-lg p-6 h-full flex flex-col border-card-border border-1">
              <TimeEntries
                entries={timeEntries}
                projects={projects}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

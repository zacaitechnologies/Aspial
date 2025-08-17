"use client"

import { useState, useEffect } from "react"
import { ProjectSelector } from "./project-selector"
import { TimerDisplay } from "./timer-display"
import { TimeEntries } from "./time-entries"
import { FloatingElements } from "./floating-elements"
import { TimeEntry, Project } from "@prisma/client"
import { createTimeEntry } from "../action"

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
      const newEntry = await createTimeEntry({
        projectId: selectedProject.id,
        startTime: new Date(Date.now() - totalDuration * 1000),
        endTime: endTime,
        duration: totalDuration,
      })
      
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

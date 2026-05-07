"use client"

import { useState, useEffect } from "react"
import { ProjectSelector } from "./project-selector"
import { TaskSelector } from "./task-selector"
import { TimerDisplay } from "./timer-display"
import { TimeEntries } from "./time-entries"
import { FloatingElements } from "./floating-elements"
import { Project } from "@prisma/client"
import {
  createTimeEntry,
  getActiveTimeEntry,
  pauseTimeEntry,
  resumeTimeEntry,
  stopTimeEntry,
  getAllUserTimeEntries,
  fetchProjectTasks,
  updateTimeEntryDescription,
  type TimeEntryDTO,
  type ProjectTaskOption,
} from "../action"

interface UserTimeTrackingProps {
  initialTimeEntries: TimeEntryDTO[]
  initialProjects: Project[]
  userId: string
}

export default function UserTimeTracking({
  initialTimeEntries,
  initialProjects,
  userId
}: UserTimeTrackingProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedTask, setSelectedTask] = useState<ProjectTaskOption | null>(null)
  const [tasks, setTasks] = useState<ProjectTaskOption[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [description, setDescription] = useState("")
  const [savedDescription, setSavedDescription] = useState("")
  const [isSavingDescription, setIsSavingDescription] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSession, setCurrentSession] = useState(0)
  const [timeEntries, setTimeEntries] = useState(initialTimeEntries)
  const [projects, setProjects] = useState(initialProjects)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [pausedTime, setPausedTime] = useState(0)
  const [activeEntryId, setActiveEntryId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const [isResuming, setIsResuming] = useState(false)
  const [isStopping, setIsStopping] = useState(false)

  // Load active time entry on mount
  useEffect(() => {
    const loadActiveEntry = async () => {
      try {
        const activeEntry = await getActiveTimeEntry()
        if (activeEntry) {
          setActiveEntryId(activeEntry.id)
          // Find the full project from initialProjects
          const fullProject = initialProjects.find(p => p.id === activeEntry.project.id)
          if (fullProject) {
            setSelectedProject(fullProject)
          }
          // Hydrate task + description from server
          setSelectedTask(activeEntry.task ?? null)
          setDescription(activeEntry.description ?? "")
          setSavedDescription(activeEntry.description ?? "")
          setIsTracking(true)
          const isPausedValue = activeEntry.isPause ?? false
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
        // Silently handle load error
      } finally {
        setIsLoading(false)
      }
    }

    loadActiveEntry()
  }, [])

  // Fetch tasks whenever the user picks a different project (and the timer
  // isn't already running — once tracking starts the project + task are
  // locked in)
  useEffect(() => {
    if (isTracking) return
    if (!selectedProject) {
      setTasks([])
      setSelectedTask(null)
      return
    }
    let cancelled = false
    const projectId = selectedProject.id
    setTasksLoading(true)
    setSelectedTask(null)
    fetchProjectTasks(projectId)
      .then((result) => {
        if (cancelled) return
        setTasks(result)
      })
      .catch(() => {
        if (cancelled) return
        setTasks([])
      })
      .finally(() => {
        if (cancelled) return
        setTasksLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedProject, isTracking])

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

    setIsPausing(true)
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    const totalDuration = elapsed + pausedTime

    try {
      await pauseTimeEntry(activeEntryId, totalDuration)
      setIsPaused(true)
      setPausedTime(totalDuration)
      setCurrentSession(totalDuration)
    } catch (err) {
      // Silently handle pause error
    } finally {
      setIsPausing(false)
    }
  }

  const resumeTimer = async () => {
    if (!isPaused || !activeEntryId) return

    setIsResuming(true)
    try {
      const updatedEntry = await resumeTimeEntry(activeEntryId)
      setIsPaused(false)
      // Update startTime to the new resume time from database
      setStartTime(new Date(updatedEntry.startTime))
      // Keep pausedTime as the accumulated duration before this resume
      setPausedTime(updatedEntry.duration)
    } catch (err) {
      // Silently handle resume error
    } finally {
      setIsResuming(false)
    }
  }

  const startTimer = async () => {
    if (!selectedProject) return

    // Check if there's already an active entry
    if (activeEntryId) {
      if (isPaused) {
        // Resume from pause - this will handle its own loading state
        await resumeTimer()
      }
      return
    }

    setIsStarting(true)
    // Start fresh timer
    const now = new Date()
    const trimmedDescription = description.trim()
    try {
      const newEntry = await createTimeEntry({
        projectId: selectedProject.id,
        taskId: selectedTask?.id,
        startTime: now,
        duration: 0,
        description: trimmedDescription || undefined,
      })

      setActiveEntryId(newEntry.id)
      setStartTime(now)
      setIsTracking(true)
      setIsPaused(false)
      setCurrentSession(0)
      setPausedTime(0)
      setSavedDescription(newEntry.description ?? "")
      setDescription(newEntry.description ?? "")
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message === "User already has an active time entry") {
        // Reload active entry
        try {
          const activeEntry = await getActiveTimeEntry()
          if (activeEntry) {
            setActiveEntryId(activeEntry.id)
            // Find the full project from initialProjects
            const fullProject = initialProjects.find(p => p.id === activeEntry.project.id)
            if (fullProject) {
              setSelectedProject(fullProject)
            }
            setSelectedTask(activeEntry.task ?? null)
            setDescription(activeEntry.description ?? "")
            setSavedDescription(activeEntry.description ?? "")
            setIsTracking(true)
            const isPausedValue = activeEntry.isPause ?? false
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
          // Silently handle reload error
        }
      }
    } finally {
      setIsStarting(false)
    }
  }

  const saveDescription = async () => {
    if (!activeEntryId) return
    setIsSavingDescription(true)
    try {
      const updated = await updateTimeEntryDescription(activeEntryId, description)
      setSavedDescription(updated.description ?? "")
      setDescription(updated.description ?? "")
    } catch (err) {
      // Silently handle save error
    } finally {
      setIsSavingDescription(false)
    }
  }

  const stopTimer = async () => {
    if (!selectedProject || !startTime || !activeEntryId) return

    setIsStopping(true)
    const endTime = new Date()
    let totalDuration = currentSession

    // If not paused, calculate final duration
    if (!isPaused) {
      const elapsed = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
      totalDuration = pausedTime + elapsed
    }

    try {
      await stopTimeEntry(activeEntryId, totalDuration)
      
      // Refetch all time entries to get the updated list with the newly stopped entry
      const refreshedEntries = await getAllUserTimeEntries()
      setTimeEntries(refreshedEntries)
      
      setIsTracking(false)
      setIsPaused(false)
      setCurrentSession(0)
      setStartTime(null)
      setPausedTime(0)
      setActiveEntryId(null)
      setSelectedProject(null)
      setSelectedTask(null)
      setTasks([])
      setDescription("")
      setSavedDescription("")
    } catch (err) {
      // Silently handle stop error
    } finally {
      setIsStopping(false)
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
    <div className="min-h-[calc(100vh-80px)] p-4 relative overflow-y-auto">
      <FloatingElements />
      <div className="mx-auto max-w-7xl xl:h-full min-h-0">
        {/* Main Content */}
        <div className="xl:h-full min-h-0 grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left Column - Timer Section */}
          <div className="xl:col-span-3 flex flex-col space-y-6">
            <div className="relative">
              <div className="relative z-10 bg-card rounded-lg p-6 border border-border space-y-6">
                <ProjectSelector
                  projects={projects}
                  selectedProject={selectedProject}
                  onProjectSelect={setSelectedProject}
                  disabled={isTracking}
                />
                <TaskSelector
                  tasks={tasks}
                  selectedTask={selectedTask}
                  onTaskSelect={setSelectedTask}
                  disabled={isTracking}
                  isLoading={tasksLoading}
                  hasProject={!!selectedProject}
                />
              </div>
            </div>

            <div className="relative flex-1">
              <div className="relative z-10 bg-card-background rounded-lg p-6 h-full border-card-border border-1">
                <TimerDisplay
                  selectedProject={selectedProject}
                  selectedTask={selectedTask}
                  isTracking={isTracking}
                  isPaused={isPaused}
                  currentSession={currentSession}
                  description={description}
                  onDescriptionChange={setDescription}
                  onSaveDescription={saveDescription}
                  isDescriptionDirty={description !== savedDescription}
                  isSavingDescription={isSavingDescription}
                  onStart={startTimer}
                  onPause={pauseTimer}
                  onStop={stopTimer}
                  isStarting={isStarting}
                  isPausing={isPausing}
                  isResuming={isResuming}
                  isStopping={isStopping}
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

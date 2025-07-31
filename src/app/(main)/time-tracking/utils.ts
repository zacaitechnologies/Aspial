export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
  
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  
  export function formatDate(date: Date): string {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }
  
  export interface TimeEntry {
    id: string
    projectId: string
    projectName: string
    startTime: Date
    endTime?: Date
    duration: number
    description?: string
  }

  export interface Project {
    id: string
    name: string
    color: string
    client?: string
    description?: string
    status?: string
  }

  export const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  export const formatDurationShort = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // API functions
  export const fetchProjects = async (): Promise<Project[]> => {
    const response = await fetch("/api/projects")
    if (!response.ok) {
      throw new Error("Failed to fetch projects")
    }
    return response.json()
  }

  export const fetchTimeEntries = async (): Promise<TimeEntry[]> => {
    const response = await fetch("/api/time-entries")
    if (!response.ok) {
      throw new Error("Failed to fetch time entries")
    }
    const data = await response.json()
    
    // Transform the data to match our interface
    return data.map((entry: any) => ({
      id: entry.id.toString(),
      projectId: entry.projectId.toString(),
      projectName: entry.project.name,
      startTime: new Date(entry.startTime),
      endTime: entry.endTime ? new Date(entry.endTime) : undefined,
      duration: entry.duration,
      description: entry.description,
    }))
  }

  export const createTimeEntry = async (timeEntry: {
    projectId: string
    startTime: Date
    endTime?: Date
    duration: number
    description?: string
  }): Promise<TimeEntry> => {
    const response = await fetch("/api/time-entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...timeEntry,
        projectId: parseInt(timeEntry.projectId),
        startTime: timeEntry.startTime.toISOString(),
        endTime: timeEntry.endTime?.toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to create time entry")
    }

    const data = await response.json()
    return {
      id: data.id.toString(),
      projectId: data.projectId.toString(),
      projectName: data.project.name,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      duration: data.duration,
      description: data.description,
    }
  }

  export const deleteTimeEntry = async (id: string): Promise<void> => {
    const response = await fetch(`/api/time-entries/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete time entry")
    }
  }
  
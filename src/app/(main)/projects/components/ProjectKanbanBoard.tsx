"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, User } from "lucide-react"
import { TaskWithAssignee } from "../types"
import { getProjectTasks, getProjectCollaborators } from "../task-actions"
import { TaskForm } from "./TaskForm"
import { TaskCard } from "./TaskCard"



type User = {
  id: string
  firstName: string
  lastName: string
  email: string
  supabase_id: string
}

interface KanbanBoardProps {
  projectId: string
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectTasks, collaborators] = await Promise.all([
          getProjectTasks(parseInt(projectId)),
          getProjectCollaborators(parseInt(projectId))
        ])
        setTasks(projectTasks)
        setUsers(collaborators)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [projectId])

  const getTasksForColumn = (columnId: string) => {
    return tasks.filter((task) => task.status === columnId)
  }

  const handleTaskCreated = (newTask: TaskWithAssignee) => {
    setTasks(prev => [...prev, newTask])
  }

  const handleTaskUpdated = (updatedTask: TaskWithAssignee) => {
    setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task))
  }

  const handleTaskDeleted = (taskId: number) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    )
  }

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("text/plain", taskId.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const taskId = parseInt(e.dataTransfer.getData("text/plain"))

    try {
      const { updateTaskStatus } = await import("../task-actions")
      await updateTaskStatus(taskId, newStatus as any)
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus as any } : task
      ))
    } catch (error) {
      console.error("Error updating task status:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tasks Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Tasks</h2>
          <p className="text-muted-foreground">Manage and track all tasks for this project</p>
        </div>
        <TaskForm
          projectId={parseInt(projectId)}
          availableUsers={users}
          onTaskCreated={handleTaskCreated}
          trigger={
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Create New Task
            </Button>
          }
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do Column */}
        <div className="space-y-4" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "todo")}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              To Do
              <Badge variant="secondary" className="bg-blue-100 text-blue-600 border-blue-200">
                {getTasksForColumn("todo").length}
              </Badge>
            </h3>
          </div>

          {getTasksForColumn("todo").length > 0 ? (
            getTasksForColumn("todo").map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                availableUsers={users}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
                onDragStart={(e) => handleDragStart(e, task.id)}
              />
            ))
          ) : (
            <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Drop tasks here</p>
            </div>
          )}
        </div>

        {/* In Progress Column */}
        <div className="space-y-4" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "in_progress")}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              In Progress
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-600 border-yellow-200">
                {getTasksForColumn("in_progress").length}
              </Badge>
            </h3>
          </div>

          {getTasksForColumn("in_progress").length > 0 ? (
            getTasksForColumn("in_progress").map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                availableUsers={users}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
                onDragStart={(e) => handleDragStart(e, task.id)}
              />
            ))
          ) : (
            <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Drop tasks here</p>
            </div>
          )}
        </div>

        {/* Done Column */}
        <div className="space-y-4" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "done")}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Done
              <Badge variant="secondary" className="bg-green-100 text-green-600 border-green-200">
                {getTasksForColumn("done").length}
              </Badge>
            </h3>
          </div>

          {getTasksForColumn("done").length > 0 ? (
            getTasksForColumn("done").map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                availableUsers={users}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
                onDragStart={(e) => handleDragStart(e, task.id)}
              />
            ))
          ) : (
            <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Drop tasks here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar, Clock, Flag, MoreHorizontal, Plus, Target, User } from "lucide-react"
import { TaskWithAssignee, taskStatusOptions, taskPriorityOptions } from "../types"
import { getProjectTasks, updateTaskStatus, reorderTasks, getProjectCollaborators } from "../task-actions"
import { TaskForm } from "./TaskForm"
import { TaskCard } from "./TaskCard"

const columns = [
  { id: "todo", title: "To Do", color: "bg-blue-100" },
  { id: "in_progress", title: "In Progress", color: "bg-yellow-100" },
  { id: "done", title: "Done", color: "bg-green-100" },
]

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Create Task Button at the top */}
      <div className="mb-6 flex justify-center">
        <TaskForm
          projectId={parseInt(projectId)}
          availableUsers={users}
          onTaskCreated={handleTaskCreated}
          trigger={
            <Button className="flex items-center gap-2 bg-[var(--lightGreen)] hover:bg-[var(--mediumGreen)] text-white">
              <Plus className="h-4 w-4" />
              Create New Task
            </Button>
          }
        />
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6">
        {columns.map((column) => {
          const columnTasks = getTasksForColumn(column.id)
          return (
            <div key={column.id} className="flex-shrink-0 w-80">
              <div className={`rounded-lg ${column.color} p-4 mb-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">{column.title}</h3>
                  <Badge variant="secondary" className="bg-white/50 text-black">
                    {columnTasks.length}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 min-h-[600px]">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    availableUsers={users}
                    onTaskUpdated={handleTaskUpdated}
                    onTaskDeleted={handleTaskDeleted}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
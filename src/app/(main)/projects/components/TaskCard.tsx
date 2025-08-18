"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar, Clock, Flag, MoreHorizontal, Target, User, Edit, Trash2 } from "lucide-react"
import { TaskWithAssignee, taskPriorityOptions } from "../types"
import { TaskForm } from "./TaskForm"
import { deleteTask } from "../task-actions"

interface TaskCardProps {
  task: TaskWithAssignee
  availableUsers: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    supabase_id: string
  }>
  onTaskUpdated?: (task: TaskWithAssignee) => void
  onTaskDeleted?: (taskId: number) => void
}

export function TaskCard({ task, availableUsers, onTaskUpdated, onTaskDeleted }: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const getPriorityColor = (priority: string) => {
    const option = taskPriorityOptions.find(opt => opt.value === priority)
    return option?.color || "text-gray-600 bg-gray-50 border-gray-200"
  }

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return
    
    setIsDeleting(true)
    try {
      await deleteTask(task.id)
      onTaskDeleted?.(task.id)
    } catch (error) {
      console.error("Error deleting task:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card
      className={`hover:shadow-md transition-shadow cursor-pointer ${
        task.type === "milestone" ? "border-l-4 border-l-yellow-400 bg-yellow-50/30" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              {task.type === "milestone" && <Target className="h-4 w-4 text-yellow-600" />}
              <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
            </div>
            {task.description && (
              <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Task
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                  </DialogHeader>
                  <TaskForm
                    projectId={task.projectId}
                    task={task}
                    availableUsers={availableUsers}
                    onTaskUpdated={onTaskUpdated}
                  />
                </DialogContent>
              </Dialog>
              <DropdownMenuItem 
                onSelect={handleDelete}
                disabled={isDeleting}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Flag className="h-3 w-3" />
            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Badge>
          </div>
          {task.dueDate && (
            <div
              className={`flex items-center gap-1 ${isOverdue(task.dueDate) ? "text-red-600" : "text-gray-600"}`}
            >
              <Calendar className="h-3 w-3" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-gray-400" />
            {task.assignee ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarImage src="/placeholder.svg" alt={task.assignee.firstName} />
                  <AvatarFallback className="text-xs">
                    {task.assignee.firstName[0]}{task.assignee.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-600">
                  {task.assignee.firstName} {task.assignee.lastName}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-500">Unassigned</span>
            )}
          </div>
          {task.dueDate && isOverdue(task.dueDate) && task.status !== "done" && (
            <Badge variant="destructive" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Overdue
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ListChecks, ChevronDown, Loader2 } from "lucide-react"
import type { TaskStatus } from "@prisma/client"
import type { ProjectTaskOption } from "../action"

interface TaskSelectorProps {
  tasks: ProjectTaskOption[]
  selectedTask: ProjectTaskOption | null
  onTaskSelect: (task: ProjectTaskOption | null) => void
  disabled?: boolean
  isLoading?: boolean
  hasProject: boolean
}

const statusLabel: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
}

const statusVariant: Record<TaskStatus, "default" | "secondary" | "destructive" | "outline"> = {
  todo: "outline",
  in_progress: "default",
  done: "secondary",
}

export function TaskSelector({
  tasks,
  selectedTask,
  onTaskSelect,
  disabled,
  isLoading,
  hasProject,
}: TaskSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const triggerLabel = !hasProject
    ? "Select a project first"
    : selectedTask
    ? selectedTask.title
    : "No task (optional)"

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-lg">
        <ListChecks className="h-5 w-5 text-primary" />
        Select Task <span className="text-xs text-muted-foreground font-normal">(optional)</span>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-12 bg-background/60"
            disabled={disabled || !hasProject}
          >
            <div className="flex items-center gap-3 min-w-0">
              {selectedTask ? (
                <>
                  <Badge variant={statusVariant[selectedTask.status]}>
                    {statusLabel[selectedTask.status]}
                  </Badge>
                  <span className="font-medium truncate">{selectedTask.title}</span>
                </>
              ) : (
                <span className="text-muted-foreground">{triggerLabel}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-4"
              onClick={() => {
                onTaskSelect(null)
                setIsOpen(false)
              }}
            >
              <div className="flex items-center gap-3 w-full text-left">
                <div className="font-medium">No task</div>
                <span className="text-xs text-muted-foreground">Track time without a task</span>
                {selectedTask === null && (
                  <Badge variant="secondary" className="ml-auto">
                    Selected
                  </Badge>
                )}
              </div>
            </Button>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No tasks in this project yet.
              </div>
            ) : (
              tasks.map((task) => (
                <Button
                  key={task.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => {
                    onTaskSelect(task)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Badge variant={statusVariant[task.status]} className="shrink-0">
                      {statusLabel[task.status]}
                    </Badge>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-medium truncate">{task.title}</div>
                    </div>
                    {selectedTask?.id === task.id && (
                      <Badge variant="secondary">Selected</Badge>
                    )}
                  </div>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

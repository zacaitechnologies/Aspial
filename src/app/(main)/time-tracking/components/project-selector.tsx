"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FolderOpen, ChevronDown } from "lucide-react"
import { Project } from "@prisma/client"

interface ProjectSelectorProps {
  projects: Project[]
  selectedProject: Project | null
  onProjectSelect: (project: Project) => void
  disabled?: boolean
  required?: boolean
}

export function ProjectSelector({ projects, selectedProject, onProjectSelect, disabled, required }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
          <div className="space-y-3">
        <div className="flex items-center gap-2 text-lg">
          <FolderOpen className="h-5 w-5 text-primary" />
          <span>
            Select Project
            {required && <span className="ml-1 text-destructive" aria-label="required">*</span>}
          </span>
        </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-12 bg-background/60"
            disabled={disabled}
          >
            {selectedProject ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-primary" />
                <div className="text-left">
                  <div className="font-medium">{selectedProject.name}</div>
                  {selectedProject.clientName && (
                    <div className="text-xs text-muted-foreground">{selectedProject.clientName}</div>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Choose a project to track time</span>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {projects.map((project) => (
              <Button
                key={project.id}
                variant="ghost"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  onProjectSelect(project)
                  setIsOpen(false)
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-4 h-4 rounded-full shrink-0 bg-blue-500" />
                  <div className="text-left flex-1">
                    <div className="font-medium">{project.name}</div>
                    {project.clientName && (
                      <div className="text-xs text-muted-foreground">
                        {project.clientName}
                      </div>
                    )}
                  </div>
                  {selectedProject?.id === project.id && (
                    <Badge variant="secondary">
                      Selected
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {required && (
        <p className="text-xs text-muted-foreground">
          <span className="text-destructive">*</span> Select a project{" "}
          <span className="font-semibold">OR</span> fill in the description below to start the timer.
        </p>
      )}
    </div>
  )
}

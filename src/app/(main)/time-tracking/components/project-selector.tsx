"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FolderOpen, Building2, ChevronDown } from "lucide-react"
import { Project } from "@prisma/client"

interface ProjectSelectorProps {
  projects: Project[]
  selectedProject: Project | null
  onProjectSelect: (project: Project) => void
  disabled?: boolean
}

export function ProjectSelector({ projects, selectedProject, onProjectSelect, disabled }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
          <div className="space-y-6">
        <div className="flex items-center gap-2 text-lg">
          <FolderOpen className="h-5 w-5 text-brand" />
          Select Project
        </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-12 bg-white/60"
            disabled={disabled}
          >
            {selectedProject ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
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
                    {project.description && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {project.description}
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
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FolderOpen, Building2, ChevronDown } from "lucide-react"

interface Project {
  id: string
  name: string
  color: string
  client?: string
}

interface ProjectSelectorProps {
  projects: Project[]
  selectedProject: Project | null
  onProjectSelect: (project: Project) => void
  disabled?: boolean
}

export function ProjectSelector({ projects, selectedProject, onProjectSelect, disabled }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 border-0 bg-white/80 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <FolderOpen className="h-5 w-5 text-white" />
          </div>
          Select Project
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-12 transition-all duration-200 hover:scale-[1.02] bg-transparent"
              disabled={disabled}
            >
              {selectedProject ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedProject.color }} />
                  <div className="text-left">
                    <div className="font-medium">{selectedProject.name}</div>
                    {selectedProject.client && (
                      <div className="text-xs text-muted-foreground">{selectedProject.client}</div>
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
              {projects.map((project, index) => (
                <Button
                  key={project.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-4 transition-all duration-200 hover:scale-[1.02] animate-in slide-in-from-left-5"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => {
                    onProjectSelect(project)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                    <div className="text-left flex-1">
                      <div className="font-medium">{project.name}</div>
                      {project.client && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {project.client}
                        </div>
                      )}
                    </div>
                    {selectedProject?.id === project.id && (
                      <Badge variant="secondary" className="animate-in zoom-in-50">
                        Selected
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

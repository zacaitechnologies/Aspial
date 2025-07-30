"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Briefcase, Calendar, DollarSign } from "lucide-react"
import { useState, useEffect } from "react"
import { getAllProjects, updateProjectStatus } from "./action"

type ProjectWithQuotation = {
  id: number
  name: string
  description: string | null
  status: string
  startDate: Date | null
  endDate: Date | null
  created_at: Date
  updated_at: Date
  quotation: {
    id: number
    name: string
    description: string
    totalPrice: number
    status: string
    services: {
      id: number
      service: {
        id: number
        name: string
        description: string
        basePrice: number
      }
    }[]
  }
}

const projectStatusOptions = [
  { value: "planning", label: "Planning", color: "secondary" as const },
  { value: "in_progress", label: "In Progress", color: "default" as const },
  { value: "completed", label: "Completed", color: "default" as const },
  { value: "cancelled", label: "Cancelled", color: "destructive" as const },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithQuotation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const data = await getAllProjects()
      setProjects(data as ProjectWithQuotation[])
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (projectId: string, newStatus: string) => {
    try {
      await updateProjectStatus(projectId, newStatus)
      await fetchProjects()
    } catch (error) {
      console.error("Error updating project status:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = projectStatusOptions.find((opt) => opt.value === status)
    return <Badge variant={statusConfig?.color || "secondary"}>{statusConfig?.label || status}</Badge>
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading projects...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <p className="text-muted-foreground">Track and manage your active projects</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">{getStatusBadge(project.status)}</div>
                </div>
                <Select
                  value={project.status}
                  onValueChange={(value) => handleStatusUpdate(project.id.toString(), value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && <CardDescription>{project.description}</CardDescription>}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">${project.quotation.totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Based on quotation:</p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm">{project.quotation.name}</p>
                  <p className="text-xs text-muted-foreground">{project.quotation.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Services included:</p>
                <div className="flex flex-wrap gap-1">
                  {project.quotation.services.map((qs) => (
                    <Badge key={qs.id} variant="outline" className="text-xs">
                      {qs.service.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No projects available.</p>
          <p className="text-sm text-muted-foreground mt-2">Create projects from accepted or paid quotations.</p>
        </div>
      )}
    </div>
  )
}

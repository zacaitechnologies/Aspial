"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { projectStatusFilterOptions } from "../types";
import { useState, useEffect } from "react";

interface ProjectSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export default function ProjectSearchBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: ProjectSearchBarProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce search input (350ms for snappy but not excessive fetches)
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [localSearchQuery, onSearchChange]);

  // Sync with external changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 py-4 w-min-300">
      <div className="flex-1 min-w-0">
        <Label htmlFor="project-search" className="sr-only">
          Search projects
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="project-search"
            placeholder="Search projects..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="pl-10 bg-background border-2 border-border"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <Select
          value={statusFilter}
          onValueChange={onStatusFilterChange}
        >
          <SelectTrigger className="w-48 bg-background border-2 border-border">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {projectStatusFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
} 
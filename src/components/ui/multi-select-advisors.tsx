"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AdvisorOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface MultiSelectAdvisorsProps {
  users: AdvisorOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  currentUserId?: string
  isAdmin: boolean
  disabled?: boolean
  placeholder?: string
}

export function MultiSelectAdvisors({
  users,
  selectedIds,
  onChange,
  currentUserId,
  isAdmin,
  disabled = false,
  placeholder = "Select advisors",
}: MultiSelectAdvisorsProps) {
  const [open, setOpen] = React.useState(false)

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id))

  const handleToggle = (userId: string) => {
    // Non-admin cannot remove themselves
    if (!isAdmin && userId === currentUserId) return

    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId))
    } else {
      onChange([...selectedIds, userId])
    }
  }

  const handleRemove = (userId: string) => {
    // Non-admin cannot remove themselves
    if (!isAdmin && userId === currentUserId) return
    onChange(selectedIds.filter((id) => id !== userId))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal min-h-[2.5rem] h-auto",
            !selectedIds.length && "text-muted-foreground"
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedUsers.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              selectedUsers.map((user) => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="text-xs"
                >
                  {user.firstName} {user.lastName}
                  {(isAdmin || user.id !== currentUserId) && (
                    <button
                      type="button"
                      className="ml-1 rounded-full outline-none hover:bg-muted-foreground/20"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(user.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <div className="max-h-60 overflow-y-auto space-y-1">
          {users.map((user) => {
            const isSelected = selectedIds.includes(user.id)
            const isCurrentUser = user.id === currentUserId
            const isLocked = !isAdmin && isCurrentUser

            return (
              <label
                key={user.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
                  isLocked && "opacity-70 cursor-not-allowed"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(user.id)}
                  disabled={isLocked}
                />
                <span className="flex-1 truncate">
                  {user.firstName} {user.lastName}
                  {isCurrentUser && " (You)"}
                </span>
              </label>
            )
          })}
          {users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No users found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

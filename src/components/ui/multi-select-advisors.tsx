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
  /**
   * Advisor IDs that must remain selected (cannot be removed by this user).
   * Adding new advisors is still allowed. Typical use: existing advisors on a
   * client when the current user is neither the creator nor an admin.
   */
  lockedIds?: readonly string[]
  disabled?: boolean
  placeholder?: string
}

export function MultiSelectAdvisors({
  users,
  selectedIds,
  onChange,
  currentUserId,
  isAdmin,
  lockedIds,
  disabled = false,
  placeholder = "Select advisors",
}: MultiSelectAdvisorsProps) {
  const [open, setOpen] = React.useState(false)

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id))
  const lockedSet = React.useMemo(() => new Set(lockedIds ?? []), [lockedIds])

  const isRemovalBlocked = (userId: string) => {
    if (!isAdmin && userId === currentUserId) return true
    return lockedSet.has(userId)
  }

  const handleToggle = (userId: string) => {
    const isSelected = selectedIds.includes(userId)
    if (isSelected && isRemovalBlocked(userId)) return

    if (isSelected) {
      onChange(selectedIds.filter((id) => id !== userId))
    } else {
      onChange([...selectedIds, userId])
    }
  }

  const handleRemove = (userId: string) => {
    if (isRemovalBlocked(userId)) return
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
                  {!isRemovalBlocked(user.id) && (
                    <span
                      className="ml-1 inline-flex rounded-full hover:bg-muted-foreground/20"
                      onMouseDown={(e) => {
                        // Prevent trigger button focus/open toggle side effects.
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(user.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
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
            // The checkbox is only locked when the user is selected AND cannot be removed.
            // Unselected users can always be added, even if they would be "locked" once selected.
            const isLocked = isSelected && isRemovalBlocked(user.id)

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

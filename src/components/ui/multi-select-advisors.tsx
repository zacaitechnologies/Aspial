"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Search, X } from "lucide-react"
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
  searchPlaceholder?: string
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
  searchPlaceholder = "Search by name or email",
}: MultiSelectAdvisorsProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id))
  const lockedSet = React.useMemo(() => new Set(lockedIds ?? []), [lockedIds])

  const filteredUsers = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter((user) =>
      `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(query)
    )
  }, [search, users])

  React.useEffect(() => {
    if (!open) {
      setSearch("")
      return
    }
    const id = requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

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
            "w-full justify-between font-normal shadow-xs transition-colors",
            selectedIds.length === 0
              ? "h-9 text-muted-foreground"
              : "min-h-9 h-auto py-2 text-foreground"
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
      {/*
       * Render WITHOUT Portal so the content stays inside the Dialog's DOM tree.
       * react-remove-scroll (used by Radix Dialog) intercepts wheel events in capture phase
       * and calls preventDefault() on anything outside the dialog's "shard" DOM node.
       * By skipping the Portal the content is inside the shard, and mouse-wheel scrolling works.
       */}
      <PopoverPrimitive.Content
        className="z-[60] flex w-[var(--radix-popover-trigger-width)] max-h-[min(20rem,calc(100vh-8rem))] flex-col overflow-hidden rounded-md border border-border bg-card p-0 text-card-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        align="start"
        sideOffset={4}
        avoidCollisions
        collisionPadding={8}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-border bg-card p-2">
          <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-border bg-background pl-8 text-sm text-foreground"
            aria-label={searchPlaceholder}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-0.5 bg-card p-1"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {filteredUsers.map((user) => {
            const isSelected = selectedIds.includes(user.id)
            const isCurrentUser = user.id === currentUserId
            // The checkbox is only locked when the user is selected AND cannot be removed.
            // Unselected users can always be added, even if they would be "locked" once selected.
            const isLocked = isSelected && isRemovalBlocked(user.id)

            return (
              <label
                key={user.id}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent text-accent-foreground",
                  isLocked && "cursor-not-allowed opacity-70"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(user.id)}
                  disabled={isLocked}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium leading-snug">
                    {user.firstName} {user.lastName}
                    {isCurrentUser && " (You)"}
                  </span>
                  <span className="block truncate text-xs text-foreground/75">{user.email}</span>
                </span>
              </label>
            )
          })}
          {filteredUsers.length === 0 && (
            <p className="py-2 text-center text-sm text-foreground/70">
              {users.length === 0 ? "No users found" : "No matching users"}
            </p>
          )}
        </div>
      </PopoverPrimitive.Content>
    </Popover>
  )
}

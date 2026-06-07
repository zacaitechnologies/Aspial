"use client"

import { useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

/**
 * Returns a drag-end handler that reorders `items` using `getId` to resolve
 * each item's DnD id (must match the `id` passed to `SortableServiceItem`).
 */
export function useSortableList<T>(
  items: T[],
  setItems: (next: T[]) => void,
  getId: (item: T) => string,
) {
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = items.findIndex((i) => getId(i) === active.id)
      const newIndex = items.findIndex((i) => getId(i) === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      setItems(arrayMove(items, oldIndex, newIndex))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, setItems],
  )
  return handleDragEnd
}

interface SortableServiceListProps {
  /** Stable string IDs for each row — must match what SortableServiceItem receives as `id`. */
  ids: string[]
  onDragEnd: (event: DragEndEvent) => void
  children: React.ReactNode
}

/**
 * Wraps a list of service rows in the DnD context. Each direct child should be
 * a `SortableServiceItem`.
 */
export function SortableServiceList({ ids, onDragEnd, children }: SortableServiceListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

interface SortableServiceItemProps {
  id: string
  children: (dragHandleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode
}

/**
 * Wraps a single service row. Provides the drag transform + a render-prop
 * for injecting the drag handle's listeners into whatever element you want.
 */
export function SortableServiceItem({ id, children }: SortableServiceItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  )
}

/**
 * The drag handle button — place this inside the service row to let users grab
 * and drag the item. Pass the `dragHandleProps` from `SortableServiceItem`'s
 * render-prop into this component.
 */
export function DragHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="cursor-grab active:cursor-grabbing h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors touch-none"
      {...props}
    >
      <GripVertical className="w-4 h-4" />
    </button>
  )
}

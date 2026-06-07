"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FormattedDescription } from "@/components/FormattedDescription"
import { formatNumber } from "@/lib/format-number"
import { toast } from "@/components/ui/use-toast"
import {
  SortableServiceList,
  SortableServiceItem,
  DragHandle,
  useSortableList,
} from "@/components/ui/sortable-service-list"

export type DocumentServiceListItem = {
  /** Stable string id for drag-and-drop (e.g. String(lineId)). */
  id: string
  /** Database line id sent to reorder APIs. */
  lineId: number
  name: string
  description: string
  price: number
  quantity: number
}

type DocumentServiceRowProps = {
  item: DocumentServiceListItem
  expanded: boolean
  onToggleExpanded: () => void
  priceDisplay: "line" | "unit"
  canDelete?: boolean
  onDelete?: () => void
  isDeleting?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  rowClassName?: string
}

export function DocumentServiceRow({
  item,
  expanded,
  onToggleExpanded,
  priceDisplay,
  canDelete,
  onDelete,
  isDeleting,
  dragHandleProps,
  rowClassName,
}: DocumentServiceRowProps) {
  const hasDescription = item.description.trim().length > 0

  return (
    <div className={`flex justify-between items-start p-3 border rounded-lg ${rowClassName ?? ""}`}>
      {dragHandleProps && (
        <div className="flex items-start pt-0.5 mr-1 shrink-0">
          <DragHandle {...dragHandleProps} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1">
          {hasDescription && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0 mt-0.5"
              aria-label={expanded ? "Hide description" : "Show description"}
              aria-expanded={expanded}
              onClick={onToggleExpanded}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          )}
          <p className="font-medium pt-1">{item.name}</p>
        </div>
        {hasDescription && expanded && (
          <FormattedDescription
            text={item.description}
            className="text-sm text-muted-foreground mt-2 pl-8"
          />
        )}
      </div>
      <div className="ml-4 text-right shrink-0">
        {priceDisplay === "line" ? (
          <>
            <div className="text-xs text-muted-foreground">
              RM{formatNumber(item.price)} × {item.quantity}
            </div>
            <Badge variant="outline" className="mt-1">
              RM{formatNumber(item.price * item.quantity)}
            </Badge>
          </>
        ) : (
          <Badge variant="outline">RM{formatNumber(item.price)}</Badge>
        )}
      </div>
      {canDelete && onDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-8 w-8 p-0 text-destructive shrink-0"
          aria-label="Remove service"
          disabled={isDeleting}
          onClick={onDelete}
        >
          ×
        </Button>
      )}
    </div>
  )
}

type DocumentServiceListProps = {
  items: DocumentServiceListItem[]
  /** When items change from the server (e.g. after refresh), reset local order. */
  itemsKey: string
  canReorder?: boolean
  onReorder?: (orderedLineIds: number[]) => Promise<void>
  canDelete?: boolean
  onDelete?: (lineId: number, name: string) => void
  isDeleting?: boolean
  priceDisplay?: "line" | "unit"
  rowClassName?: string
}

export function DocumentServiceList({
  items: serverItems,
  itemsKey,
  canReorder = false,
  onReorder,
  canDelete = false,
  onDelete,
  isDeleting = false,
  priceDisplay = "line",
  rowClassName,
}: DocumentServiceListProps) {
  const [items, setItems] = useState(serverItems)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [isReordering, setIsReordering] = useState(false)

  useEffect(() => {
    setItems(serverItems)
  }, [itemsKey, serverItems])

  const persistReorder = async (next: DocumentServiceListItem[]) => {
    if (!onReorder) return
    setIsReordering(true)
    try {
      await onReorder(next.map((i) => i.lineId))
      toast({ title: "Order updated", description: "Service order saved." })
    } catch (error: unknown) {
      setItems(serverItems)
      toast({
        variant: "destructive",
        title: "Could not save order",
        description: error instanceof Error ? error.message : "Failed to update service order.",
      })
    } finally {
      setIsReordering(false)
    }
  }

  const handleDragEnd = useSortableList(
    items,
    (next) => {
      setItems(next)
      void persistReorder(next)
    },
    (i) => i.id,
  )

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderRow = (
    item: DocumentServiceListItem,
    dragHandleProps?: React.HTMLAttributes<HTMLElement>,
  ) => (
    <DocumentServiceRow
      key={item.id}
      item={item}
      expanded={expandedIds.has(item.id)}
      onToggleExpanded={() => toggleExpanded(item.id)}
      priceDisplay={priceDisplay}
      canDelete={canDelete}
      onDelete={onDelete ? () => onDelete(item.lineId, item.name) : undefined}
      isDeleting={isDeleting || isReordering}
      dragHandleProps={dragHandleProps}
      rowClassName={rowClassName}
    />
  )

  if (!canReorder) {
    return (
      <div className="space-y-3">
        {items.map((item) => renderRow(item))}
      </div>
    )
  }

  return (
    <SortableServiceList ids={items.map((i) => i.id)} onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {items.map((item) => (
          <SortableServiceItem key={item.id} id={item.id}>
            {(dragHandleProps) => renderRow(item, dragHandleProps)}
          </SortableServiceItem>
        ))}
      </div>
    </SortableServiceList>
  )
}

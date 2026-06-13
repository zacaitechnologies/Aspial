"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  Flag,
  ListFilter,
  AlertCircle,
  Target,
  User,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMYTDateForDisplay } from "@/lib/date-utils";
import type { TaskWithAssignee } from "@/app/(main)/projects/types";
import { getDeadlineBadge, getDeadlineStatus } from "@/app/(main)/projects/deadline-utils";
import { getDashboardTasks } from "../actions";
import type {
  DashboardTaskAssigneeOption,
  SortField,
  SortOrder,
  TaskStatusOption,
} from "../types";
import { DEFAULT_DASHBOARD_TASK_STATUSES } from "../types";
import { DashboardTooltip, DashboardTooltipProvider } from "./dashboard-tooltip";

const STATUS_OPTIONS: { value: TaskStatusOption; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const STATUS_STYLES: Record<string, string> = {
  todo: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
  done: "bg-green-100 text-green-800 border-green-200",
};
const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};
const STATUS_STRIPE: Record<string, string> = {
  todo: "border-l-blue-500",
  in_progress: "border-l-amber-500",
  done: "border-l-green-500",
};
const STATUS_DOT: Record<string, string> = {
  todo: "bg-blue-500",
  in_progress: "bg-amber-500",
  done: "bg-green-500",
};
const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-accent text-accent-foreground border-border",
  low: "bg-muted text-muted-foreground border-border",
};

function formatPersonName(
  person?: { firstName: string; lastName: string } | null,
  fallback = "Unassigned"
) {
  if (!person) return fallback;
  const name = `${person.firstName} ${person.lastName}`.trim();
  return name || fallback;
}

function useTaskMeta(task: TaskWithAssignee, showAssignee?: boolean) {
  const deadlineStatus = getDeadlineStatus({
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    isCompleted: task.status === "done",
  });
  const deadlineBadge = getDeadlineBadge(deadlineStatus);
  const assigneeName = formatPersonName(task.assignee);
  const creatorName = formatPersonName(task.creator, "Unknown");

  return {
    deadlineStatus,
    deadlineBadge,
    isOverdue: deadlineStatus === "overdue",
    assigneeName,
    creatorName,
    dueDateLabel: formatMYTDateForDisplay(new Date(task.dueDate)),
    startDateLabel: formatMYTDateForDisplay(new Date(task.startDate)),
    completedDateLabel: task.completedAt
      ? formatMYTDateForDisplay(new Date(task.completedAt))
      : null,
    showAssignee: Boolean(showAssignee),
  };
}

function isTaskOverdue(task: TaskWithAssignee): boolean {
  return (
    getDeadlineStatus({
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      isCompleted: task.status === "done",
    }) === "overdue"
  );
}

function TaskTooltipContent({
  task,
  meta,
}: {
  task: TaskWithAssignee;
  meta: ReturnType<typeof useTaskMeta>;
}) {
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-2">
        {meta.isOverdue ? (
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
        ) : (
          <span
            className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/40",
              STATUS_DOT[task.status] ?? "bg-muted"
            )}
            aria-hidden
          />
        )}
        <p className={cn("font-semibold leading-snug", meta.isOverdue && "text-destructive")}>
          {task.title}
        </p>
      </div>
      {task.project?.name && (
        <p className="text-muted-foreground">{task.project.name}</p>
      )}
      {task.milestone?.title && (
        <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
          <Target className="h-3 w-3 shrink-0 opacity-70" />
          <span className="truncate">{task.milestone.title}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Flag className="h-3 w-3 shrink-0 opacity-70" />
        <span className="capitalize">{task.priority} priority</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3 w-3 shrink-0 opacity-70" />
        <span>Start {meta.startDateLabel}</span>
      </div>
      <div className={cn("flex items-center gap-1.5", meta.isOverdue && "font-semibold text-destructive")}>
        <Calendar className="h-3 w-3 shrink-0 opacity-70" />
        <span>Due {meta.dueDateLabel}</span>
      </div>
      {meta.completedDateLabel && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle className="h-3 w-3 shrink-0 opacity-70" />
          <span>Completed {meta.completedDateLabel}</span>
        </div>
      )}
      {meta.showAssignee && (
        <div className="flex items-start gap-1.5 text-muted-foreground min-w-0">
          <UserCircle className="h-3 w-3 shrink-0 opacity-70 mt-0.5" />
          <span className="min-w-0">Assignee: {meta.assigneeName}</span>
        </div>
      )}
      <div className="flex items-start gap-1.5 text-muted-foreground min-w-0">
        <User className="h-3 w-3 shrink-0 opacity-70 mt-0.5" />
        <span className="min-w-0">Created by: {meta.creatorName}</span>
      </div>
      {meta.isOverdue ? (
        <Badge variant="destructive" className="text-[10px]">
          Overdue
        </Badge>
      ) : (
        meta.deadlineBadge && (
          <Badge variant="outline" className={cn("text-[10px]", meta.deadlineBadge.className)}>
            {meta.deadlineBadge.label}
          </Badge>
        )
      )}
      {task.description && (
        <p className="text-muted-foreground line-clamp-3">{task.description}</p>
      )}
      <p className="text-[10px] text-muted-foreground">Click to view full details</p>
    </div>
  );
}

function TaskDetailRows({
  task,
  meta,
}: {
  task: TaskWithAssignee;
  meta: ReturnType<typeof useTaskMeta>;
}) {
  return (
    <dl className="space-y-2 text-xs">
      {task.project?.name && (
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground shrink-0">Project</dt>
          <dd className="text-right font-medium break-words">{task.project.name}</dd>
        </div>
      )}
      {task.milestone?.title && (
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground shrink-0">Milestone</dt>
          <dd className="text-right font-medium break-words">{task.milestone.title}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground shrink-0">Priority</dt>
        <dd className="capitalize font-medium">{task.priority}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground shrink-0">Start</dt>
        <dd className="font-medium">{meta.startDateLabel}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground shrink-0">Due</dt>
        <dd className="font-medium">{meta.dueDateLabel}</dd>
      </div>
      {meta.completedDateLabel && (
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground shrink-0">Completed</dt>
          <dd className="font-medium">{meta.completedDateLabel}</dd>
        </div>
      )}
      {meta.showAssignee && (
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground shrink-0">Assignee</dt>
          <dd className="text-right font-medium break-words">{meta.assigneeName}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground shrink-0">Created by</dt>
        <dd className="text-right font-medium break-words">{meta.creatorName}</dd>
      </div>
      {task.description && (
        <div className="space-y-1 pt-1 border-t border-border">
          <dt className="text-muted-foreground">Description</dt>
          <dd className="text-foreground leading-relaxed break-words">{task.description}</dd>
        </div>
      )}
    </dl>
  );
}

function TaskDetailsDialog({
  task,
  meta,
  open,
  onOpenChange,
}: {
  task: TaskWithAssignee;
  meta: ReturnType<typeof useTaskMeta>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs", STATUS_STYLES[task.status])}
            >
              {STATUS_LABELS[task.status] ?? task.status}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-xs capitalize", PRIORITY_STYLES[task.priority])}
            >
              {task.priority} priority
            </Badge>
            {meta.deadlineBadge && (
              <Badge variant="outline" className={cn("text-xs", meta.deadlineBadge.className)}>
                {meta.deadlineBadge.label}
              </Badge>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <TaskDetailRows task={task} meta={meta} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <Link href={`/projects/${task.projectId}?tab=tasks`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in project
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskRow({ task, showAssignee }: { task: TaskWithAssignee; showAssignee?: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const meta = useTaskMeta(task, showAssignee);

  return (
    <>
      <DashboardTooltip
        content={<TaskTooltipContent task={task} meta={meta} />}
        align="start"
      >
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="w-full text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`View details for ${task.title}`}
        >
          <Card
            className={cn(
              "gap-0 border-l-4 py-0",
              meta.isOverdue
                ? "border-l-destructive bg-destructive/5 ring-1 ring-destructive/25"
                : STATUS_STRIPE[task.status] ?? "border-l-border"
            )}
          >
            <CardContent className="space-y-3 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start gap-2 min-w-0">
                    {meta.isOverdue && (
                      <AlertCircle
                        className="h-5 w-5 shrink-0 text-destructive mt-0.5"
                        aria-hidden
                      />
                    )}
                    <p
                      className={cn(
                        "font-semibold leading-snug break-words min-w-0 flex-1",
                        meta.isOverdue && "text-destructive"
                      )}
                    >
                      {task.title}
                    </p>
                  </div>
                  {task.project?.name && (
                    <p className="text-xs font-medium text-muted-foreground break-words">
                      {task.project.name}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {meta.isOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      Overdue
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn("text-xs", STATUS_STYLES[task.status])}
                  >
                    {STATUS_LABELS[task.status] ?? task.status}
                  </Badge>
                </div>
              </div>

              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-[10px] capitalize", PRIORITY_STYLES[task.priority])}
                >
                  <Flag className="mr-1 h-3 w-3" />
                  {task.priority}
                </Badge>
                {task.milestone?.title && (
                  <Badge variant="secondary" className="text-[10px] max-w-full truncate">
                    <Target className="mr-1 h-3 w-3 shrink-0" />
                    {task.milestone.title}
                  </Badge>
                )}
                {meta.deadlineBadge && !meta.isOverdue && (
                  <Badge variant="outline" className={cn("text-[10px]", meta.deadlineBadge.className)}>
                    {meta.deadlineBadge.label}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    meta.isOverdue && "font-semibold text-destructive"
                  )}
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Due {meta.dueDateLabel}
                </span>
                {meta.showAssignee && (
                  <span className="inline-flex items-center gap-1">
                    <UserCircle className="h-3.5 w-3.5 shrink-0" />
                    {meta.assigneeName}
                  </span>
                )}
                {meta.completedDateLabel && (
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    Completed {meta.completedDateLabel}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </button>
      </DashboardTooltip>

      <TaskDetailsDialog
        task={task}
        meta={meta}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
}

function sortTasks(
  tasks: TaskWithAssignee[],
  sortField: SortField,
  sortOrder: SortOrder
): TaskWithAssignee[] {
  return [...tasks].sort((a, b) => {
    const aOverdue = isTaskOverdue(a);
    const bOverdue = isTaskOverdue(b);
    if (aOverdue !== bOverdue) {
      return aOverdue ? -1 : 1;
    }

    const aDate = sortField === "dueDate" ? a.dueDate : a.startDate;
    const bDate = sortField === "dueDate" ? b.dueDate : b.startDate;
    const diff = new Date(aDate).getTime() - new Date(bDate).getTime();
    return sortOrder === "asc" ? diff : -diff;
  });
}

function TaskStatusMultiSelect({
  selectedStatuses,
  onSelectedStatusesChange,
  disabled,
}: {
  selectedStatuses: TaskStatusOption[];
  onSelectedStatusesChange: (statuses: TaskStatusOption[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const toggleStatus = (status: TaskStatusOption) => {
    if (selectedStatuses.includes(status)) {
      if (selectedStatuses.length === 1) return;
      onSelectedStatusesChange(selectedStatuses.filter((s) => s !== status));
      return;
    }
    onSelectedStatusesChange([...selectedStatuses, status]);
  };

  const label = selectedStatuses
    .map((s) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s)
    .join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-8 min-w-[9.5rem] w-auto max-w-full text-xs bg-card border-2 border-accent font-normal shadow-xs"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <ListFilter className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-2">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`dashboard-status-${opt.value}`}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-accent/50"
            >
              <Checkbox
                id={`dashboard-status-${opt.value}`}
                checked={selectedStatuses.includes(opt.value)}
                onCheckedChange={() => toggleStatus(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TaskFilterBar({
  statusFilters,
  onStatusFiltersChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  showUserFilter,
  assigneeFilter,
  onAssigneeFilterChange,
  assigneeOptions,
  isLoading,
}: {
  statusFilters: TaskStatusOption[];
  onStatusFiltersChange: (value: TaskStatusOption[]) => void;
  sortField: SortField;
  onSortFieldChange: (value: SortField) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (value: SortOrder) => void;
  showUserFilter?: boolean;
  assigneeFilter?: string;
  onAssigneeFilterChange?: (value: string) => void;
  assigneeOptions?: DashboardTaskAssigneeOption[];
  isLoading?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TaskStatusMultiSelect
        selectedStatuses={statusFilters}
        onSelectedStatusesChange={onStatusFiltersChange}
        disabled={isLoading}
      />
      {showUserFilter && onAssigneeFilterChange && (
        <Select value={assigneeFilter} onValueChange={onAssigneeFilterChange} disabled={isLoading}>
          <SelectTrigger className="h-8 min-w-[10rem] w-auto max-w-full text-xs bg-card border-2 border-accent">
            <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <UserCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="All users" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {(assigneeOptions ?? []).map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SortField)} disabled={isLoading}>
        <SelectTrigger className="h-8 min-w-[8.5rem] w-auto max-w-full text-xs bg-card border-2 border-accent">
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <Calendar className="w-4 h-4 shrink-0 text-muted-foreground" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dueDate">Due date</SelectItem>
          <SelectItem value="startDate">Start date</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortOrder} onValueChange={(v) => onSortOrderChange(v as SortOrder)} disabled={isLoading}>
        <SelectTrigger className="h-8 min-w-[8rem] w-auto max-w-full text-xs bg-card border-2 border-accent">
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {sortOrder === "asc" ? (
              <ArrowUp className="w-4 h-4 shrink-0 text-muted-foreground" />
            ) : (
              <ArrowDown className="w-4 h-4 shrink-0 text-muted-foreground" />
            )}
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Earliest</SelectItem>
          <SelectItem value="desc">Latest</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function TaskList({
  tasks,
  showAssignee,
  emptyText,
  statusFilters,
  onStatusFiltersChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  showUserFilter,
  assigneeFilter,
  onAssigneeFilterChange,
  assigneeOptions,
  isLoading,
}: {
  tasks: TaskWithAssignee[];
  showAssignee?: boolean;
  emptyText: string;
  statusFilters: TaskStatusOption[];
  onStatusFiltersChange: (value: TaskStatusOption[]) => void;
  sortField: SortField;
  onSortFieldChange: (value: SortField) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (value: SortOrder) => void;
  showUserFilter?: boolean;
  assigneeFilter?: string;
  onAssigneeFilterChange?: (value: string) => void;
  assigneeOptions?: DashboardTaskAssigneeOption[];
  isLoading?: boolean;
}) {
  const sorted = useMemo(
    () => sortTasks(tasks, sortField, sortOrder),
    [tasks, sortField, sortOrder]
  );

  return (
    <div className="space-y-3">
      <TaskFilterBar
        statusFilters={statusFilters}
        onStatusFiltersChange={onStatusFiltersChange}
        sortField={sortField}
        onSortFieldChange={onSortFieldChange}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
        showUserFilter={showUserFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={onAssigneeFilterChange}
        assigneeOptions={assigneeOptions}
        isLoading={isLoading}
      />
      <div className="relative min-h-[120px]">
        {sorted.length === 0 && !isLoading ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            </CardContent>
          </Card>
        ) : (
          <DashboardTooltipProvider>
            <div
              className={cn(
                "space-y-3 transition-opacity duration-150",
                isLoading && "opacity-50 pointer-events-none"
              )}
            >
              {sorted.map((task) => (
                <TaskRow key={task.id} task={task} showAssignee={showAssignee} />
              ))}
            </div>
          </DashboardTooltipProvider>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardTasksSection({
  initialMyTasks,
  initialAllTasks,
  isAdmin,
  assigneeOptions,
}: {
  initialMyTasks: TaskWithAssignee[];
  initialAllTasks: TaskWithAssignee[];
  isAdmin: boolean;
  assigneeOptions: DashboardTaskAssigneeOption[];
}) {
  const [myTasks, setMyTasks] = useState(initialMyTasks);
  const [allTasks, setAllTasks] = useState(initialAllTasks);
  const [statusFilters, setStatusFilters] = useState<TaskStatusOption[]>([
    ...DEFAULT_DASHBOARD_TASK_STATUSES,
  ]);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [activeTab, setActiveTab] = useState("my");
  const [isPending, startTransition] = useTransition();

  const refetchTasks = useCallback(
    (statuses: TaskStatusOption[], nextAssigneeFilter: string) => {
      startTransition(async () => {
        const my = await getDashboardTasks({ scope: "my", statuses });
        setMyTasks(my);
        if (isAdmin) {
          const all = await getDashboardTasks({
            scope: "all",
            statuses,
            assigneeId: nextAssigneeFilter === "all" ? undefined : nextAssigneeFilter,
          });
          setAllTasks(all);
        }
      });
    },
    [isAdmin]
  );

  const handleStatusFiltersChange = (statuses: TaskStatusOption[]) => {
    setStatusFilters(statuses);
    refetchTasks(statuses, assigneeFilter);
  };

  const handleAssigneeFilterChange = (value: string) => {
    setAssigneeFilter(value);
    refetchTasks(statusFilters, value);
  };

  const sharedFilterProps = {
    statusFilters,
    onStatusFiltersChange: handleStatusFiltersChange,
    sortField,
    onSortFieldChange: setSortField,
    sortOrder,
    onSortOrderChange: setSortOrder,
    isLoading: isPending,
  };

  const myOverdueCount = useMemo(() => myTasks.filter(isTaskOverdue).length, [myTasks]);
  const allOverdueCount = useMemo(() => allTasks.filter(isTaskOverdue).length, [allTasks]);

  if (!isAdmin) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h2 className="text-lg font-semibold text-foreground">My To-Do List</h2>
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {myTasks.length}
          </span>
          {myOverdueCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {myOverdueCount} overdue
            </Badge>
          )}
        </div>
        <TaskList
          tasks={myTasks}
          emptyText="No to-do items match the current filters."
          {...sharedFilterProps}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">To-Do List</h2>
        {(activeTab === "all" ? allOverdueCount : myOverdueCount) > 0 && (
          <Badge variant="destructive" className="text-xs">
            {activeTab === "all" ? allOverdueCount : myOverdueCount} overdue
          </Badge>
        )}
      </div>
      <Tabs defaultValue="my" className="space-y-4" onValueChange={setActiveTab}>
        <div className="relative">
          <TabsList className="grid w-full grid-cols-2 bg-transparent border-primary border transition-all duration-300 ease-in-out">
            <TabsTrigger
              value="my"
              className="flex items-center gap-2 transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
            >
              <ClipboardList className="w-4 h-4" />
              My To-Do List ({myTasks.length})
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="flex items-center gap-2 transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
            >
              <ClipboardList className="w-4 h-4" />
              All To-Do List ({allTasks.length})
            </TabsTrigger>
          </TabsList>
          <div
            className={`absolute top-1 h-[calc(100%-8px)] bg-primary transition-all duration-300 ease-in-out rounded-md z-0 ${
              activeTab === "my" ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
            }`}
          />
        </div>
        <TabsContent value="my">
          <TaskList
            tasks={myTasks}
            emptyText="No to-do items match the current filters."
            {...sharedFilterProps}
          />
        </TabsContent>
        <TabsContent value="all">
          <TaskList
            tasks={allTasks}
            showAssignee
            showUserFilter
            assigneeFilter={assigneeFilter}
            onAssigneeFilterChange={handleAssigneeFilterChange}
            assigneeOptions={assigneeOptions}
            emptyText="No to-do items match the current filters."
            {...sharedFilterProps}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle, ClipboardList, Flag, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMYTDateForDisplay } from "@/lib/date-utils";
import type { TaskWithAssignee } from "@/app/(main)/projects/types";
import { getDeadlineBadge, getDeadlineStatus } from "@/app/(main)/projects/deadline-utils";

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

function TaskRow({ task, showAssignee }: { task: TaskWithAssignee; showAssignee?: boolean }) {
  const deadlineBadge = getDeadlineBadge(
    getDeadlineStatus({
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      isCompleted: task.status === "done",
    })
  );
  const assigneeName = task.assignee
    ? `${task.assignee.firstName} ${task.assignee.lastName}`.trim()
    : "Unassigned";

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/projects/${task.projectId}?tab=tasks`}
            className="font-medium text-foreground hover:underline break-words"
          >
            {task.title}
          </Link>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-xs", STATUS_STYLES[task.status])}
          >
            {STATUS_LABELS[task.status] ?? task.status}
          </Badge>
        </div>

        {task.project?.name && (
          <p className="text-xs text-muted-foreground">{task.project.name}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Flag className="h-3.5 w-3.5" />
            <span className="capitalize">{task.priority}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Due {formatMYTDateForDisplay(new Date(task.dueDate))}
          </span>
          {showAssignee && (
            <span className="inline-flex items-center gap-1">
              <UserCircle className="h-3.5 w-3.5" />
              {assigneeName}
            </span>
          )}
          {task.status === "done" && task.completedAt && (
            <span className="inline-flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              Completed {formatMYTDateForDisplay(new Date(task.completedAt))}
            </span>
          )}
        </div>

        {deadlineBadge && (
          <Badge variant="outline" className={cn("text-xs", deadlineBadge.className)}>
            {deadlineBadge.label}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

function TaskList({
  tasks,
  showAssignee,
  emptyText,
}: {
  tasks: TaskWithAssignee[];
  showAssignee?: boolean;
  emptyText: string;
}) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} showAssignee={showAssignee} />
      ))}
    </div>
  );
}

export function DashboardTasksSection({
  myTasks,
  allTasks,
  isAdmin,
}: {
  myTasks: TaskWithAssignee[];
  allTasks: TaskWithAssignee[];
  isAdmin: boolean;
}) {
  if (!isAdmin) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h2 className="text-lg font-semibold text-foreground">My Tasks</h2>
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {myTasks.length}
          </span>
        </div>
        <TaskList tasks={myTasks} emptyText="No tasks are assigned to you." />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
      </div>
      <Tabs defaultValue="my" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my">My Tasks ({myTasks.length})</TabsTrigger>
          <TabsTrigger value="all">All Tasks ({allTasks.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="my">
          <TaskList tasks={myTasks} emptyText="No tasks are assigned to you." />
        </TabsContent>
        <TabsContent value="all">
          <TaskList tasks={allTasks} showAssignee emptyText="No tasks found." />
        </TabsContent>
      </Tabs>
    </section>
  );
}

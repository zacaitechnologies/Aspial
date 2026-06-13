"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CreateTaskData,
  UpdateTaskData,
  TaskWithAssignee,
  taskStatusOptions,
  taskPriorityOptions,
  Milestone,
} from "../types";
import { createTask, updateTask } from "../task-actions";
import { useSession } from "../../contexts/SessionProvider";
import { addDays, formatDateForDisplay, formatLocalDate, parseLocalDateString } from "@/lib/date-utils";
import { getMilestoneColorOption } from "@/lib/milestone-colors";
import { cn } from "@/lib/utils";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Priority is required",
  }),
  milestoneId: z.string().optional(),
  assigneeId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  // Deadline = start date + cycle (14 or 28 days) on create.
  cycleDays: z.enum(["14", "28"]),
  // On edit, the deadline may only be extended by 14 or 28 days (0 = keep).
  extendDays: z.enum(["0", "14", "28"]),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  projectId: number;
  task?: TaskWithAssignee;
  availableUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    supabase_id: string;
  }>;
  availableMilestones?: Milestone[];
  onTaskCreated?: (task: TaskWithAssignee) => void;
  onTaskUpdated?: (task: TaskWithAssignee) => void;
  trigger?: React.ReactNode;
}

// Reusable form field components
const TitleField = ({ form }: { form: UseFormReturn<TaskFormData> }) => (
  <FormField
    control={form.control}
    name="title"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Title *</FormLabel>
        <FormControl>
          <Input placeholder="Enter task title" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

const MilestoneField = ({ form, availableMilestones }: { form: UseFormReturn<TaskFormData>; availableMilestones?: Milestone[] }) => (
  <FormField
    control={form.control}
    name="milestoneId"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Milestone</FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select milestone" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="none">No milestone</SelectItem>
            {availableMilestones?.map((milestone) => {
              const colorOption = getMilestoneColorOption(milestone.color);
              return (
                <SelectItem key={milestone.id} value={milestone.id.toString()}>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colorOption.dotClass)}
                      aria-hidden
                    />
                    {milestone.title}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

const DescriptionField = ({ form }: { form: UseFormReturn<TaskFormData> }) => (
  <FormField
    control={form.control}
    name="description"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Description</FormLabel>
        <FormControl>
          <Textarea
            placeholder="Enter task description"
            className="min-h-[100px]"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

const PriorityField = ({ form }: { form: UseFormReturn<TaskFormData> }) => (
  <FormField
    control={form.control}
    name="priority"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Priority *</FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {taskPriorityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

const AssigneeField = ({ form, availableUsers }: { form: UseFormReturn<TaskFormData>; availableUsers: Array<{ id: string; firstName: string; lastName: string; email: string; supabase_id: string }> }) => (
  <FormField
    control={form.control}
    name="assigneeId"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Assignee</FormLabel>
        <Select onValueChange={field.onChange} value={field.value || "unassigned"}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {availableUsers.map((user) => (
              <SelectItem key={user.supabase_id} value={user.supabase_id}>
                {user.firstName} {user.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

const DeadlineFields = ({
  form,
  isEdit = false,
  existingDueDate,
}: {
  form: UseFormReturn<TaskFormData>;
  isEdit?: boolean;
  existingDueDate?: Date;
}) => {
  const startDate = form.watch("startDate");
  const cycleDays = form.watch("cycleDays");
  const extendDays = form.watch("extendDays");

  if (isEdit) {
    const base = existingDueDate ? new Date(existingDueDate) : new Date();
    const newDue = addDays(base, parseInt(extendDays || "0", 10));
    return (
      <>
        <FormField
          control={form.control}
          name="extendDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Extend deadline</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Keep current" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">Keep current</SelectItem>
                  <SelectItem value="14">+14 days</SelectItem>
                  <SelectItem value="28">+28 days</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Deadline</FormLabel>
          <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{formatDateForDisplay(base)}</span>
            {extendDays !== "0" && (
              <span className="font-medium text-foreground"> → {formatDateForDisplay(newDue)}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Deadlines can only be extended, in 14- or 28-day steps.
          </p>
        </FormItem>
      </>
    );
  }

  const previewStart = startDate ? parseLocalDateString(startDate) : new Date();
  const due = addDays(previewStart, parseInt(cycleDays || "14", 10));
  return (
    <>
      <FormField
        control={form.control}
        name="startDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start Date *</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="cycleDays"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Deadline cycle *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="28">28 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Deadline: {formatDateForDisplay(due)}
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

// Main form content component
const TaskFormContent = ({ 
  form, 
  availableUsers,
  availableMilestones,
  isSubmitting,
  isEdit = false,
  existingDueDate,
  onCancel,
  onSubmit,
  error
}: {
  form: UseFormReturn<TaskFormData>;
  availableUsers: Array<{ id: string; firstName: string; lastName: string; email: string; supabase_id: string }>;
  availableMilestones?: Milestone[];
  isSubmitting: boolean;
  isEdit?: boolean;
  existingDueDate?: Date;
  onCancel?: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  error?: string | null;
}) => (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TitleField form={form} />
        <MilestoneField form={form} availableMilestones={availableMilestones} />
      </div>

      <DescriptionField form={form} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PriorityField form={form} />
        <AssigneeField form={form} availableUsers={availableUsers} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DeadlineFields form={form} isEdit={isEdit} existingDueDate={existingDueDate} />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : isEdit ? (
            "Update Task"
          ) : (
            "Create Task"
          )}
        </Button>
      </div>
    </form>
  </Form>
);

export function TaskForm({
  projectId,
  task,
  availableUsers,
  availableMilestones,
  onTaskCreated,
  onTaskUpdated,
  trigger,
}: TaskFormProps) {
  const { enhancedUser } = useSession();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      priority: task?.priority || "low",
      milestoneId: task?.milestoneId?.toString() || "none",
      assigneeId: task?.assigneeId ?? "unassigned",
      startDate: task?.startDate
        ? formatLocalDate(new Date(task.startDate))
        : formatLocalDate(new Date()),
      cycleDays: "14",
      extendDays: "0",
    },
  });

  const onSubmit = async (data: TaskFormData) => {
    if (!enhancedUser?.id) {
      setError("You must be logged in to create tasks");
      return;
    }

    if (isSubmitting) return; // Prevent double submission

    setError(null); // Clear any previous errors
    setIsSubmitting(true);
    
    try {
      const { cycleDays, extendDays, startDate: startDateStr, ...rest } = data;
      const startDateObj = startDateStr ? parseLocalDateString(startDateStr) : new Date();
      // Create: deadline = start + chosen cycle. Edit: extend existing due date only.
      const dueDate = task
        ? addDays(task.dueDate ? new Date(task.dueDate) : startDateObj, parseInt(extendDays || "0", 10))
        : addDays(startDateObj, parseInt(cycleDays || "14", 10));

      const taskData = {
        ...rest,
        projectId,
        status: "todo",
        startDate: startDateObj,
        dueDate,
        creatorId: enhancedUser.id,
        assigneeId: rest.assigneeId === "unassigned" ? null : rest.assigneeId,
        milestoneId: rest.milestoneId === "none" ? null : rest.milestoneId ? parseInt(rest.milestoneId) : null,
      };

      if (task) {
        const updatedTask = await updateTask(task.id, taskData as UpdateTaskData);
        onTaskUpdated?.(updatedTask);
        // Don't show alert - let the page refresh handle it
      } else {
        const newTask = await createTask(taskData as CreateTaskData);
        onTaskCreated?.(newTask);
        toast({
          title: "Success",
          description: "Task created successfully!",
        });
      }

      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error saving task:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save task. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit mode: render form only. The parent (e.g. task card dialog) provides the
  // dialog title to avoid a duplicate "Edit Task" heading.
  if (task) {
    return (
      <div className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <TaskFormContent
          form={form}
          availableUsers={availableUsers}
          availableMilestones={availableMilestones}
          isSubmitting={isSubmitting}
          isEdit={true}
          existingDueDate={task.dueDate ? new Date(task.dueDate) : undefined}
          onSubmit={onSubmit}
          error={error}
        />
      </div>
    );
  }

  // For creating new tasks, show the dialog with trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <TaskFormContent
          form={form}
          availableUsers={availableUsers}
          availableMilestones={availableMilestones}
          isSubmitting={isSubmitting}
          onCancel={() => setOpen(false)}
          onSubmit={onSubmit}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}

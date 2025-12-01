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
import { Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
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

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Priority is required",
  }),
  milestoneId: z.string().optional(),
  assigneeId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  dueDate: z.string().min(1, "Due date is required"),
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
const TitleField = ({ form }: { form: any }) => (
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

const MilestoneField = ({ form, availableMilestones }: { form: any; availableMilestones?: Milestone[] }) => (
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
            {availableMilestones?.map((milestone) => (
              <SelectItem key={milestone.id} value={milestone.id.toString()}>
                {milestone.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

const DescriptionField = ({ form }: { form: any }) => (
  <FormField
    control={form.control}
    name="description"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Description</FormLabel>
        <FormControl>
          <Textarea
            placeholder="Enter task description"
            className="min-h-[100px] text-black"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

const PriorityField = ({ form }: { form: any }) => (
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

const AssigneeField = ({ form, availableUsers }: { form: any; availableUsers: any[] }) => (
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

const DateFields = ({ form }: { form: any }) => (
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
      name="dueDate"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Due Date *</FormLabel>
          <FormControl>
            <Input type="date" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);

// Main form content component
const TaskFormContent = ({ 
  form, 
  availableUsers, 
  availableMilestones,
  isSubmitting,
  isEdit = false,
  onCancel,
  onSubmit,
  error
}: {
  form: any;
  availableUsers: any[];
  availableMilestones?: Milestone[];
  isSubmitting: boolean;
  isEdit?: boolean;
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
        <DateFields form={form} />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEdit ? "Update Task" : "Create Task"}
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
      assigneeId: task?.assigneeId || "unassigned",
      startDate: task?.startDate
        ? new Date(task.startDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      dueDate: task?.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split("T")[0], // Default to 7 days from now
    },
  } as any);

  const onSubmit = async (data: TaskFormData) => {
    if (!enhancedUser?.id) {
      setError("You must be logged in to create tasks");
      return;
    }

    setError(null); // Clear any previous errors
    setIsSubmitting(true);
    
    try {
      const taskData = {
        ...data,
        projectId,
        status: "todo",
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        creatorId: enhancedUser.id,
        assigneeId: data.assigneeId === "unassigned" ? undefined : data.assigneeId,
        milestoneId: data.milestoneId === "none" ? null : data.milestoneId ? parseInt(data.milestoneId) : null,
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

  // If editing a task, show the form directly without dialog
  if (task) {
    return (
      <div className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="pb-4">
          <h2 className="text-lg font-semibold">Edit Task</h2>
        </div>
        <TaskFormContent
          form={form}
          availableUsers={availableUsers}
          availableMilestones={availableMilestones}
          isSubmitting={isSubmitting}
          isEdit={true}
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

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CreateTaskData,
  UpdateTaskData,
  TaskWithAssignee,
  taskStatusOptions,
  taskPriorityOptions,
  taskTypeOptions,
} from "../types";
import { createTask, updateTask } from "../task-actions";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  type: z.enum(["task", "milestone"]),
  assigneeId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
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

const TypeField = ({ form }: { form: any }) => (
  <FormField
    control={form.control}
    name="type"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Type</FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {taskTypeOptions.map((option) => (
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
        <FormLabel>Priority</FormLabel>
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
          <FormLabel>Start Date</FormLabel>
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
          <FormLabel>Due Date</FormLabel>
          <FormControl>
            <Input type="date" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);

const TagsField = ({ form, newTag, setNewTag, addTag, removeTag, handleKeyPress }: {
  form: any;
  newTag: string;
  setNewTag: (value: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
}) => (
  <div className="space-y-2">
    <Label>Tags</Label>
    <div className="flex gap-2">
      <Input
        placeholder="Add a tag"
        value={newTag}
        onChange={(e) => setNewTag(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <Button type="button" variant="outline" onClick={addTag}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
    <div className="flex flex-wrap gap-2">
      {form.watch("tags").map((tag: string) => (
        <Badge
          key={tag}
          variant="secondary"
          className="flex items-center gap-1"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-1 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  </div>
);

// Main form content component
const TaskFormContent = ({ 
  form, 
  availableUsers, 
  newTag, 
  setNewTag, 
  addTag, 
  removeTag, 
  handleKeyPress,
  isSubmitting,
  isEdit = false,
  onCancel,
  onSubmit
}: {
  form: any;
  availableUsers: any[];
  newTag: string;
  setNewTag: (value: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
  onCancel?: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
}) => (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TitleField form={form} />
        <TypeField form={form} />
      </div>

      <DescriptionField form={form} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PriorityField form={form} />
        <AssigneeField form={form} availableUsers={availableUsers} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateFields form={form} />
      </div>

      <TagsField 
        form={form} 
        newTag={newTag} 
        setNewTag={setNewTag} 
        addTag={addTag} 
        removeTag={removeTag} 
        handleKeyPress={handleKeyPress} 
      />

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
  onTaskCreated,
  onTaskUpdated,
  trigger,
}: TaskFormProps) {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      priority: task?.priority || "low",
      type: task?.type || "task",
      assigneeId: task?.assigneeId || "unassigned",
      startDate: task?.startDate
        ? new Date(task.startDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      dueDate: task?.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      tags: task?.tags || [],
    },
  } as any);

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      const taskData = {
        ...data,
        projectId,
        status: "todo",
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        assigneeId:
          data.assigneeId === "unassigned" ? undefined : data.assigneeId,
      };

      if (task) {
        const updatedTask = await updateTask(task.id, taskData as UpdateTaskData);
        onTaskUpdated?.(updatedTask);
      } else {
        const newTask = await createTask(taskData as CreateTaskData);
        onTaskCreated?.(newTask);
      }

      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !form.getValues("tags").includes(newTag.trim())) {
      const currentTags = form.getValues("tags");
      form.setValue("tags", [...currentTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags");
    form.setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
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
          newTag={newTag}
          setNewTag={setNewTag}
          addTag={addTag}
          removeTag={removeTag}
          handleKeyPress={handleKeyPress}
          isSubmitting={isSubmitting}
          isEdit={true}
          onSubmit={onSubmit}
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
          newTag={newTag}
          setNewTag={setNewTag}
          addTag={addTag}
          removeTag={removeTag}
          handleKeyPress={handleKeyPress}
          isSubmitting={isSubmitting}
          onCancel={() => setOpen(false)}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
